<script lang="ts">
	import { untrack } from 'svelte';
	import { b2World, b2PolygonShape, b2EdgeShape, type XY } from '@box2d/core';
	import { b2ParticleSystemDef, b2ParticleGroupDef, b2ParticleFlag } from '@box2d/particles';
	import { phStops } from '$lib/palette';

	type Props = {
		// the beaker svg, viewBox 0 0 160 190, glass from (30, 40) down to y 182 and across to x 130
		beaker: SVGSVGElement | undefined;
		// how full, 1 = to the rim. going up pours that much more in from the top of the page
		fill: number;
		pH: number;
	};

	let { beaker, fill, pH }: Props = $props();

	const res = 0.5; // the water is drawn at half res, the browser smooths it back out
	const rim = 40; // beaker units
	const floor = 179.5; // inside of the bottom
	const reach = 0.3; // m around the mouse that gets dragged along
	const maxMove = 0.15; // m per step, bigger mouse jumps are ignored

	let canvas = $state<HTMLCanvasElement>();
	let size = $state({ w: 0, h: 0 });
	function resize() {
		size = { w: window.innerWidth, h: window.innerHeight };
	}
	$effect(resize);

	// fill and pH are read through these so changing them doesn't rebuild the world
	let pending = 0; // particles still to pour
	let perFill = 0; // particles for fill = 1
	let poured = 0;
	let liquid = [0, 0, 0];

	function rgb(name: string) {
		const hex = getComputedStyle(document.documentElement)
			.getPropertyValue(`--color-${name}`)
			.trim();
		return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
	}
	function indicator(p: number) {
		const i = Math.max(
			1,
			phStops.findIndex(([at]) => at >= p)
		);
		const [a, ca] = phStops[i - 1];
		const [b, cb] = phStops[i];
		const t = (p - a) / (b - a);
		const [x, y] = [rgb(ca), rgb(cb)];
		// 70% colour, 30% white like the old beaker fill
		return x.map((v, k) => (v + (y[k] - v) * t) * 0.7 + 255 * 0.3);
	}
	$effect(() => {
		liquid = indicator(pH);
	});

	$effect(() => {
		// read fill first so this reruns whenever it changes
		const target = Math.round(fill * perFill);
		if (!perFill) return;
		if (target > poured) {
			pending += target - poured;
			poured = target;
		}
	});

	$effect(() => {
		const { w, h } = size;
		if (!w || !beaker) return;
		const box = beaker.getBoundingClientRect();
		const scale = box.width / 160;
		// px per box2d meter + particle size go with the beaker so the water acts the same on any screen
		// (100 and 5px at the normal 256px wide beaker)
		const ppm = box.width / 2.56;
		const radius = 0.05 * ppm;
		// beaker units -> box2d meters
		const at = (x: number, y: number): XY => ({
			x: (box.left + x * scale) / ppm,
			y: (box.top + y * scale) / ppm
		});

		const world = b2World.Create({ x: 0, y: 10 });
		const ground = world.CreateBody();

		// page sides, open top so the spout can come in
		const W = w / ppm;
		const H = h / ppm;
		const side = (x: number) =>
			ground.CreateFixture({ shape: new b2EdgeShape().SetTwoSided({ x, y: -10 }, { x, y: H }) });
		side(0);
		side(W);

		// floor, with a gap in the middle where the drain is so water really falls through
		const floorBody = world.CreateBody();
		let gap = -1;
		function setGap(half: number) {
			if (Math.abs(half - gap) < 0.02) return;
			gap = half;
			for (let f = floorBody.GetFixtureList(); f; f = floorBody.GetFixtureList())
				floorBody.DestroyFixture(f);
			const mid = W / 2;
			const edge = (x1: number, x2: number) =>
				floorBody.CreateFixture({
					shape: new b2EdgeShape().SetTwoSided({ x: x1, y: H }, { x: x2, y: H })
				});
			edge(0, mid - half);
			edge(mid + half, W);
		}
		setGap(0);

		// thick boxes behind walls water can't clip through when zooming
		const wall = (x1: number, y1: number, x2: number, y2: number) => {
			const a = at(x1, y1);
			const b = at(x2, y2);
			const shape = new b2PolygonShape();
			shape.SetAsBox(
				Math.abs(b.x - a.x) / 2,
				Math.abs(b.y - a.y) / 2,
				{ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
				0
			);
			ground.CreateFixture({ shape });
		};
		wall(22.5, rim, 32.5, 190); // left
		wall(127.5, rim, 137.5, 190); // right
		wall(22.5, floor, 137.5, 190); // bottom

		const def = new b2ParticleSystemDef();
		def.radius = radius / ppm;
		def.pressureStrength = 0.2;
		def.dampingStrength = 0.5;
		def.viscousStrength = 0.15; // calms the surface but still lets it splash
		const water = world.CreateParticleSystem(def);
		const flags = b2ParticleFlag.b2_viscousParticle;

		// what's already in the beaker (spills don't come back after a resize)
		const start = untrack(() => Math.min(fill, 1));
		const shape = new b2PolygonShape();
		const top = floor - (floor - rim) * start;
		const a = at(33, top);
		const b = at(127, floor - 0.5);
		shape.SetAsBox((b.x - a.x) / 2, (b.y - a.y) / 2, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, 0);
		const group = new b2ParticleGroupDef();
		group.shape = shape;
		group.flags = flags;
		water.CreateParticleGroup(group);
		perFill = water.GetParticleCount() / start;
		poured = Math.round(start * perFill);
		pending = 0;

		// the mouse drags nearby water along with it. no solid ball, so nothing to teleport
		// or crawl back when the mouse leaves and returns
		let mouse: XY | null = null;
		let last: XY | null = null;
		const onMove = (e: PointerEvent) => (mouse = { x: e.clientX / ppm, y: e.clientY / ppm });
		window.addEventListener('pointermove', onMove);

		// spout: off the top of the page above the beaker
		const spoutX = (box.left + 80 * scale) / ppm;
		// one row of particles a frame, about a particle apart both ways. a little wobble and
		// jitter so it looks poured, but not so much they overlap (overlapping particles explode)
		const d = (2 * radius) / ppm;
		const speed = d * 60; // falls about one row per frame
		let width = 0;
		let t = 0;

		// drain: grows in the middle of the floor once water spills, pulls water in,
		// and the floor opens under it so it drops off the bottom of the page
		const drainX = W / 2;
		const drainY = H;
		const below = box.bottom / ppm; // anything lower than the beaker is spill
		let drain = 0; // 0 closed 1 open

		function step() {
			t += 1 / 60;
			if (pending > 0) {
				// big pour =  wide stream
				width ||= Math.min(6, Math.max(3, Math.ceil(pending / 150)));
				const row = Math.min(width, pending);
				const wobble = Math.sin(t * 6) * 0.4 * d;
				for (let j = 0; j < row; j++) {
					water.CreateParticle({
						flags,
						position: {
							x: spoutX + wobble + (j - (row - 1) / 2 + (Math.random() - 0.5) * 0.3) * d,
							y: -d
						},
						velocity: { x: (Math.random() - 0.5) * 0.15, y: speed * (0.95 + Math.random() * 0.1) }
					});
				}
				pending -= row;
			} else width = 0;

			const n = water.GetParticleCount();
			const pos = water.GetPositionBuffer();
			const vel = water.GetVelocityBuffer();
			let spill = 0;
			for (let i = 0; i < n; i++) if (pos[i].y > below) spill++;
			drain += ((spill > 0 ? 1 : 0) - drain) * 0.015;
			setGap(drain > 0.05 ? ((70 * drain) / ppm) * 0.75 : 0);
			if (drain > 0.05) {
				for (let i = 0; i < n; i++) {
					const p = pos[i];
					if (p.y < below) continue;
					// gone once it's off the page
					if (p.y > H + 0.5) {
						water.DestroyParticle(i);
						continue;
					}
					// make sure drain don't pull past floor
					if (p.y > drainY) continue;
					const dx = drainX - p.x;
					const dy = drainY - p.y;
					// scuffed gravity
					const dist = Math.hypot(dx, dy) || 0.01;
					const near = Math.max(0, 1 - dist / 2.5);
					vel[i].x += (Math.sign(dx) * 0.04 + (dx / dist) * 0.3 * near) * drain;
					vel[i].y += (dy / dist) * 0.3 * near * drain;
				}
			}

			if (mouse && last) {
				const mx = mouse.x - last.x;
				const my = mouse.y - last.y;
				if (Math.hypot(mx, my) < maxMove) {
					for (let i = 0; i < n; i++) {
						const falloff = 1 - Math.hypot(pos[i].x - mouse.x, pos[i].y - mouse.y) / reach;
						if (falloff <= 0) continue;
						vel[i].x += mx * 60 * 0.3 * falloff;
						vel[i].y += my * 60 * 0.3 * falloff;
					}
				}
			}
			last = mouse;
			world.Step(1 / 60, { velocityIterations: 6, positionIterations: 2, particleIterations: 3 });
		}

		// drawing: soft coloured dots at half res, then anything faint is cut and anything dense
		// goes solid, so the dots merge into one continuous body of water. the canvas is
		// stretched to full size by the browser, which smooths the edge
		canvas!.width = Math.ceil(w * res);
		canvas!.height = Math.ceil(h * res);
		const ctx = canvas!.getContext('2d', { willReadFrequently: true })!;

		const r = radius * 2.6 * res;
		function blob(c: number[]) {
			const b = document.createElement('canvas');
			b.width = b.height = Math.ceil(r * 2);
			const bctx = b.getContext('2d')!;
			const g = bctx.createRadialGradient(r, r, 0, r, r, r);
			g.addColorStop(0, `rgba(${c.join()},1)`);
			g.addColorStop(1, `rgba(${c.join()},0)`);
			bctx.fillStyle = g;
			bctx.fillRect(0, 0, b.width, b.height);
			return b;
		}
		let solution = blob(liquid);
		let solutionColor = liquid;

		// alpha in -> alpha out: between under 40% gone over ~60% solid
		const edge = new Uint8ClampedArray(256);
		for (let i = 0; i < 256; i++) edge[i] = ((i / 255 - 0.4) / 0.2) * 235;

		let raf = 0;
		let then = performance.now();
		let behind = 0;
		function frame(now: number) {
			behind = Math.min(behind + now - then, 100);
			then = now;
			for (; behind >= 1000 / 60; behind -= 1000 / 60) step();

			// recolour solution dots
			if (liquid !== solutionColor) {
				solution = blob(liquid);
				solutionColor = liquid;
			}

			const n = water.GetParticleCount();
			const pos = water.GetPositionBuffer();
			ctx.clearRect(0, 0, canvas!.width, canvas!.height);
			let x0 = Infinity;
			let y0 = Infinity;
			let x1 = -Infinity;
			let y1 = -Infinity;
			for (let i = 0; i < n; i++) {
				const x = pos[i].x * ppm;
				const y = pos[i].y * ppm;
				if (y < -2 * radius) continue;
				ctx.drawImage(solution, x * res - r, y * res - r);
				x0 = Math.min(x0, x * res - r);
				y0 = Math.min(y0, y * res - r);
				x1 = Math.max(x1, x * res + r);
				y1 = Math.max(y1, y * res + r);
			}

			// only touch pixels around the water
			if (x1 > x0) {
				const bx = Math.max(0, Math.floor(x0));
				const by = Math.max(0, Math.floor(y0));
				const bw = Math.min(canvas!.width, Math.ceil(x1)) - bx;
				const bh = Math.min(canvas!.height, Math.ceil(y1)) - by;
				const img = ctx.getImageData(bx, by, bw, bh);
				const a = img.data;
				for (let i = 3; i < a.length; i += 4) a[i] = edge[a[i]];
				ctx.putImageData(img, bx, by);
			}

			// hole goes behind water
			if (drain > 0.05) {
				ctx.globalCompositeOperation = 'destination-over';
				ctx.fillStyle = 'black';
				ctx.beginPath();
				ctx.ellipse(
					drainX * ppm * res,
					h * res - 2,
					70 * drain * res,
					9 * drain * res,
					0,
					0,
					Math.PI * 2
				);
				ctx.fill();
				ctx.globalCompositeOperation = 'source-over';
			}

			raf = requestAnimationFrame(frame);
		}
		raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', onMove);
		};
	});
</script>

<svelte:window onresize={resize} />

<!-- the entire page -->
<canvas bind:this={canvas} class="pointer-events-none fixed inset-0 h-full w-full"></canvas>
