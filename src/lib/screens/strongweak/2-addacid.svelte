<script lang="ts">
	import { onMount } from 'svelte';
	import Arrow from '$lib/components/Arrow.svelte';
	import WaterField from '$lib/components/WaterField.svelte';
	import { chem } from '$lib/chem';
	import { createDive, SEA } from '$lib/dive';

	const names = ['beaker', 'pure water', 'add HCl', 'rebalance'];
	// where each step sits, in screen heights scrolled. zoom is the first 1.4
	const rest = [0, 1.6, 3.7, 5.4];
	// where each caption sits, add hcl one is earlier so its up while the first H goes over
	const at = [0, 1.6, 3.5, 5.4];
	const ZOOM = 1.4;
	let dive: ReturnType<typeof createDive> | undefined;
	let scroller = $state<HTMLDivElement>();
	let water = $state<ReturnType<typeof WaterField>>();
	let p = $state(0); // screens scrolled, eased

	const stepAt = (p: number) => rest.findLastIndex((r, i) => i === 0 || p >= (r + rest[i - 1]) / 2);
	const step = $derived(stepAt(p));
	// keys go from where ur heading, not where p has eased to yet
	let target = 0;
	const go = (i: number) => {
		target = i;
		scroller.scrollTo({ top: rest[i] * H, behavior: 'smooth' });
	};

	let W = $state(0);
	let H = $state(0);

	const smooth = (v: number) => v * v * (3 - 2 * v);
	const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
	const span = (a: number, b: number) => clamp01((p - a) / (b - a));

	// beaker is 160 x 190 units, water surface at y 66, inside from x 30 to 130, bottom at 182
	const k = $derived((H * 0.42) / 190);
	const B = $derived({ x: W / 2, y: H * 0.55 + (66 - 110) * k });
	// zoom into the middle of the surface till the beaker walls are off screen
	const big = $derived((W * 2.5) / (100 * k));
	const e = $derived(smooth(clamp01(p / ZOOM)));
	const S = $derived(big ** e);
	const c = $derived({ x: B.x + (W / 2 - B.x) * e, y: B.y + (H * SEA - B.y) * e });
	// water + molecules stay inside the beaker till its gone
	const clip = $derived.by(() => {
		if (e >= 1) return 'none';
		// inside of the beaker in px, can go way off screen
		const a = c.x - 50 * k * S;
		const b = c.x + 50 * k * S;
		const y = c.y + 116 * k * S;
		const r = 12 * k * S;
		return `path('M${a} 0 V${y - r} Q${a} ${y} ${a + r} ${y} H${b - r} Q${b} ${y} ${b} ${y - r} V0 Z')`;
	});
	const level = $derived(c.y);

	// pH from how much hcl has actually given its H away. OH- only drops once water catches up
	let given = $state(0);
	const pH = $derived(-Math.log10(1e-7 + given * 1e-2));
	const pOH = $derived(7 + (7 - pH) * smooth(span(4.6, 5.4)));

	// caption i comes up out of the water, sits, then floats off the top
	const lift = (i: number) => (at[i] - p) * H * 0.25;
	const seen = (i: number) =>
		p < at[i] ? clamp01((0.85 - (at[i] - p)) / 0.3) : clamp01((0.7 - (p - at[i])) / 0.3);
	const captions: HTMLDivElement[] = [];

	let canvas = $state<HTMLCanvasElement>();
	const aim = { x: 0, y: 0 };
	const mouse = { x: 0, y: 0 };

	onMount(() => {
		let raf = 0;
		let alive = true;
		let then = performance.now();
		const was: number[] = [];
		function loop(now: number) {
			const dt = Math.min(0.05, (now - then) / 1000);
			then = now;
			const ease = 1 - Math.exp(-dt * 4);
			mouse.x += (aim.x - mouse.x) * ease;
			mouse.y += (aim.y - mouse.y) * ease;
			// eased scroll so it glides
			p += (scroller.scrollTop / H - p) * (1 - Math.exp(-dt * 8));
			given += (dive!.donated() - given) * (1 - Math.exp(-dt * 3));

			// text going through the surface drags it with it
			captions.forEach((el, i) => {
				const y = lift(i + 1);
				const dy = y - (was[i] ?? y);
				was[i] = y;
				if (!el || Math.abs(dy) < 0.1) return;
				for (const line of el.children) {
					const r = line.getBoundingClientRect();
					if (r.top >= level || r.bottom <= level) continue;
					// strongest when the middle of the line is at the surface
					const mid = Math.sin((Math.PI * (level - r.top)) / (r.bottom - r.top));
					water?.poke(r.left, r.right, Math.max(-4, Math.min(4, dy)) * 0.04 * mid * seen(i + 1));
				}
			});

			dive!.resize(W, H);
			// canvas is see-through here, so put the hcl back up quietly
			if (e < 0.3) dive!.reset();
			dive!.frame(dt, {
				mode: p < 2.1 ? 'pure' : p < 4.6 ? 'freeze' : 'acid',
				zoom: { x: c.x, y: level, z: S / big },
				mouse,
				depth: Math.max(0, p - ZOOM) * H,
				// first hcl falls, sits, gives its H over. then the rest
				fall: span(2.1, 2.75),
				hero: span(2.85, 3.65), // ends before the 3.7 stop so it always finishes
				acid: span(3.75, 4.5)
			});
			raf = requestAnimationFrame(loop);
		}
		// wait for the font or the atom letters draw in the wrong one
		document.fonts.ready.then(() => {
			if (!alive) return;
			dive = createDive(canvas);
			raf = requestAnimationFrame(loop);
		});
		return () => {
			alive = false;
			cancelAnimationFrame(raf);
		};
	});
</script>

<svelte:window
	bind:innerWidth={W}
	bind:innerHeight={H}
	onpointermove={(e) => {
		aim.x = e.clientX / W - 0.5;
		aim.y = e.clientY / H - 0.5;
	}}
	onwheel={(e) => {
		// scrolling over the nav/header/footer still moves the slide
		if (!scroller.contains(e.target as Node))
			scroller.scrollBy({ top: e.deltaY * (e.deltaMode ? 40 : 1) }); // firefox gives lines not px
	}}
	onkeydown={(e) => {
		const dir =
			{ ArrowDown: 1, PageDown: 1, ' ': e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1 }[e.key];
		if (!dir) return;
		e.preventDefault();
		if (Math.abs(rest[target] - p) > 0.6) target = step; // they scrolled since
		go(Math.max(0, Math.min(names.length - 1, target + dir)));
	}}
/>

<!-- captions go under the water so they look like they come up out of it -->
<div
	class="pointer-events-none fixed left-1/2 grid w-full max-w-4xl -translate-x-1/2 text-center text-black"
	style:bottom="{H - level + 50}px"
>
	{#each [1, 2, 3] as i (i)}
		<div
			bind:this={captions[i - 1]}
			class="col-start-1 row-start-1 flex flex-col items-center justify-end gap-2 text-2xl short:text-xl"
			style:opacity={seen(i) * (i === 1 ? clamp01((e - 0.8) / 0.2) : 1)}
			style:translate="0 {lift(i)}px"
		>
			{#if i === 1}
				<p class="text-4xl font-bold short:text-3xl">Water is always autoionising</p>
				<p>
					{@html chem('2H2O')}
					<Arrow reversible class="inline w-10 align-middle" />
					{@html chem('H3O+ + OH-')}
				</p>
			{:else if i === 2}
				<p class="text-4xl font-bold short:text-3xl">{@html chem('Every HCl gives a proton to water')}</p>
				<p>{@html chem('(because it\'s a strong acid)')}</p>
				<p>
					{@html chem('HCl + H2O')}
					<Arrow class="inline w-10 align-middle" />
					{@html chem('H3O+ + Cl-')}
				</p>
			{:else if i === 3}
				<p class="max-w-3xl text-3xl font-bold short:text-2xl">
					{@html chem(
						'Since [H3O+] increased, equilibrium shifts right to water to maintain K<sub>w</sub> = 10<sup>−14</sup>'
					)}
				</p>
				<p>
					{@html chem('H3O+ + OH-')}
					<Arrow class="inline w-10 align-middle" />
					{@html chem('2H2O')}
				</p>
			{/if}
		</div>
	{/each}
</div>

<div class="pointer-events-none fixed inset-0">
	<div class="absolute inset-0" style:clip-path={clip}>
		<!-- surface stays still till ur in, molecules show up on the way in -->
		<WaterField bind:this={water} {level} motion={smooth(span(1.05, 1.35))} />
		<canvas
			bind:this={canvas}
			class="absolute inset-0 h-full w-full"
			style:opacity={smooth(clamp01((e - 0.35) / 0.4))}
		></canvas>
	</div>
	<!-- beaker glass, flies off the sides as it zooms -->
	{#if e < 1}
		<svg class="absolute inset-0 h-full w-full" aria-hidden="true">
			<g transform="translate({c.x} {c.y}) scale({k * S}) translate(-80 -66)">
				<path
					d="M22 40 H30 V170 Q30 182 42 182 H118 Q130 182 130 170 V40 H138"
					fill="none"
					stroke="black"
					stroke-width={5 * k}
					vector-effect="non-scaling-stroke"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</g>
		</svg>
	{/if}
</div>

<!-- just something to scroll -->
<div bind:this={scroller} class="fixed inset-0 [scrollbar-width:none] overflow-y-auto">
	<div style:height="{(rest[rest.length - 1] + 1) * H}px"></div>
</div>

<p
	class="pointer-events-none fixed bottom-28 left-1/2 -translate-x-1/2 text-xl font-bold text-black"
	style:opacity={clamp01(1 - p * 4)}
>
	scroll ↓
</p>

<!-- pH + pOH -->
<div
	class="pointer-events-none fixed top-32 right-10 flex w-72 flex-col gap-4 text-xl text-black short:top-28 short:w-64 short:gap-3 short:text-lg"
	style:opacity={e}
>
	{#each [{ name: 'pH', v: pH, text: 'text-red', bar: 'bg-red', track: 'bg-red/15' }, { name: 'pOH', v: pOH, text: 'text-blue', bar: 'bg-blue', track: 'bg-blue/15' }] as row (row.name)}
		<div class="flex flex-col gap-1.5">
			<div class="flex items-baseline justify-between">
				<span class="font-bold {row.text}">{row.name}</span>
				<span class="tabular-nums">{row.v.toFixed(1)}</span>
			</div>
			<div class="h-3.5 rounded-full {row.track}">
				<div class="h-full rounded-full {row.bar}" style:width="{(row.v / 14) * 100}%"></div>
			</div>
		</div>
	{/each}
</div>

<!-- steps down the right side, click to jump -->
<nav class="fixed right-10 flex flex-col items-end gap-3" style:top="{H * SEA + 40}px">
	{#each names as name, i (name)}
		<button
			onclick={() => go(i)}
			class="flex items-center gap-3 text-lg transition-colors {i === step
				? 'font-bold text-black'
				: 'text-black/45 hover:text-black/70'}"
		>
			{name}
			<span
				class="h-1 rounded-full transition-all {i === step ? 'w-6 bg-black' : 'w-3 bg-black/30'}"
			></span>
		</button>
	{/each}
</nav>
