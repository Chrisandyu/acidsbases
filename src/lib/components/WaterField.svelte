<script lang="ts">
	import { untrack } from 'svelte';

	// fills its parent box. level = px from the top of that box where the water surface is
	// draw: optional, draws extra stuff (particles) into the water each frame. it's clipped to the water,
	// and surface(x) gives the surface's y at x so things can stay under it
	type Props = {
		level: number;
		draw?: (ctx: CanvasRenderingContext2D, surface: (x: number) => number) => void;
	};
	let { level, draw }: Props = $props();

	const gap = 8; // px between surface points
	const spread = 0.2; // how fast waves travel sideways (over 0.5 blows up)
	const spring = 0.003; // pulls surface to level
	const damping = 0.985; // how fast waves dir
	const reach = 70; // px around the mouse that it moves
	const maxMove = 20; // px per step the mouse can count for, so jumps and flicks stay small
	const maxHeight = 200; // px the surface can go above or below level

	let canvas = $state<HTMLCanvasElement>();
	let size = $state({ w: 0, h: 0 });

	// follow the parent box's size
	$effect(() => {
		const box = canvas.parentElement;
		const watch = new ResizeObserver(() => (size = { w: box.clientWidth, h: box.clientHeight }));
		watch.observe(box);
		return () => watch.disconnect();
	});

	// surface is a row of points, each with a height (+ = down) and a speed.
	// every point pulls on its neighbours so a poke spreads out as waves
	$effect(() => {
		const { w, h } = size;
		if (!w || !level) return;

		const count = Math.ceil(w / gap) + 1;
		const height = new Float32Array(count);
		const speed = new Float32Array(count);

		// null until the mouse first moves, so it dont jump in from nowhere on page load
		let mouse: { x: number; y: number } | null = null;
		let last: { x: number; y: number } | null = null;
		// mouse relative to this box, null when it's outside so other boxes' water doesn't move
		const onMove = (e: PointerEvent) => {
			const box = canvas.getBoundingClientRect();
			const x = e.clientX - box.left;
			const y = e.clientY - box.top;
			mouse = x >= 0 && x <= w && y <= h ? { x, y } : null;
		};
		const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));
		window.addEventListener('pointermove', onMove);

		function step() {
			// mouse in the water drags the surface with it
			// down up pushes sideways makes a wave
			if (mouse && last) {
				const dx = clamp(mouse.x - last.x, maxMove);
				const dy = clamp(mouse.y - last.y, maxMove);
				const centre = Math.round(mouse.x / gap);
				if (mouse.y > level + height[centre] - 20) {
					for (let i = 0; i < count; i++) {
						const off = i * gap - mouse.x;
						const falloff = Math.max(0, 1 - Math.abs(off) / reach);
						speed[i] += (dy * 0.05 - dx * 0.02 * Math.sign(off)) * falloff;
					}
				}
			}
			last = mouse;

			for (let i = 0; i < count; i++) {
				speed[i] = (speed[i] - spring * height[i]) * damping;
				height[i] = clamp(height[i] + speed[i], maxHeight);
			}
			// no clue wha this does
			for (let pass = 0; pass < 2; pass++) {
				for (let i = 0; i < count; i++) {
					const left = height[Math.max(0, i - 1)];
					const right = height[Math.min(count - 1, i + 1)];
					speed[i] += spread * (left + right - 2 * height[i]);
				}
			}
		}

		const dpr = window.devicePixelRatio;
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		const ctx = canvas.getContext('2d');
		ctx.scale(dpr, dpr);

		const edge = getComputedStyle(document.documentElement)
			.getPropertyValue('--color-sapphire')
			.trim();
		// hex + alpha, canvas can't always read color-mix
		const fill = ctx.createLinearGradient(0, level, 0, h);
		fill.addColorStop(0, `${edge}40`);
		fill.addColorStop(1, `${edge}73`);

		// physics runs at 60 fps
		let raf = 0;
		let then = performance.now();
		let behind = 0;
		function frame(now: number) {
			behind = Math.min(behind + now - then, 100);
			then = now;
			for (; behind >= 1000 / 60; behind -= 1000 / 60) step();

			// slow swell on top so it never looks frozen
			const t = now / 1000;
			const y = (i: number) =>
				level + height[i] + 3 * Math.sin(t * 0.9 + i * 0.08) + 2 * Math.sin(t * 1.4 - i * 0.05);

			ctx.clearRect(0, 0, w, h);
			ctx.beginPath();
			ctx.moveTo(0, y(0));
			for (let i = 1; i < count; i++) ctx.lineTo(i * gap, y(i));
			ctx.lineTo(w, h);
			ctx.lineTo(0, h);
			ctx.closePath();
			ctx.fillStyle = fill;
			ctx.fill();

			// extra stuff, only shows inside the water
			if (draw) {
				// surface y between two points
				const surface = (x: number) => {
					const i = Math.max(0, Math.min(count - 1.001, x / gap));
					const k = Math.floor(i);
					return y(k) + (y(k + 1) - y(k)) * (i - k);
				};
				ctx.save();
				ctx.clip();
				draw(ctx, surface);
				ctx.restore();
			}

			// the surface is the line between the top and the water
			ctx.beginPath();
			ctx.moveTo(0, y(0));
			for (let i = 1; i < count; i++) ctx.lineTo(i * gap, y(i));
			ctx.strokeStyle = edge;
			ctx.lineWidth = 4;
			ctx.lineJoin = 'round';
			ctx.stroke();

			raf = requestAnimationFrame(frame);
		}
		// draw straight away, resizing wipes the canvas and waiting a frame flashes it blank.
		// untrack or the effect starts watching whatever draw reads (the tweens) and restarts every tick
		untrack(() => frame(performance.now()));

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('pointermove', onMove);
		};
	});
</script>

<!-- fills the parent, which needs to be relative/absolute/fixed -->
<canvas bind:this={canvas} class="pointer-events-none absolute inset-0 h-full w-full"></canvas>
