<script lang="ts">
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import ArrowButton from '$lib/components/ArrowButton.svelte';
	import Fraction from '$lib/components/Fraction.svelte';
	import { chem } from '$lib/chem';

	// big Ka = strong -> log + -log graphs -> so low pKa = strong
	// each step gets added below the last one, so nothing above it moves and there's no blank space to scroll
	let step = $state(0);
	const last = 2;

	// next step + scroll it into view
	let root = $state<HTMLDivElement>();
	async function next() {
		step++;
		await tick();
		root
			.querySelector(`[data-step="${step}"]`)
			?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}

	// graph: x from 0 to 10, y from -1.2 to 1.2
	const W = 360;
	const H = 260;
	const pad = { l: 16, r: 30, t: 30, b: 16 }; // room top + right for the y + x labels
	const xs = (x: number) => pad.l + (x / 10) * (W - pad.l - pad.r);
	const ys = (y: number) => pad.t + ((1.2 - y) / 2.4) * (H - pad.t - pad.b);

	// sign 1 = log, -1 = -log. runs past the edges so it looks like it keeps going.
	// x grows by 3% a step, so it's smooth near 0 where log drops off fast
	function curve(sign: number) {
		const points = [];
		for (let x = 0.0005; x <= 12; x *= 1.03) points.push(`${xs(x)},${ys(sign * Math.log10(x))}`);
		return points.join(' ');
	}

	// one dot on the curve, follows the mouse when it's over the graph. gets cut off at the axes like the curve
	let x = $state(5);
	function follow(e: PointerEvent, svg: SVGSVGElement) {
		const box = svg.getBoundingClientRect();
		const px = ((e.clientX - box.left) / box.width) * W; // mouse in svg units
		x = Math.min(12, Math.max(0.0005, ((px - pad.l) / (W - pad.l - pad.r)) * 10));
	}
</script>

{#snippet graph(sign: number, color: string)}
	<svg
		viewBox="0 0 {W} {H}"
		class="w-full max-w-sm short:max-w-[17rem]"
		role="img"
		aria-label="graph"
		onpointermove={(e) => follow(e, e.currentTarget)}
	>
		<!-- axes, x axis at y = 0 -->
		<g stroke="black" stroke-width="2" stroke-linecap="round">
			<line x1={pad.l} y1={ys(0)} x2={W - pad.r} y2={ys(0)} />
			<line x1={pad.l} y1={pad.t} x2={pad.l} y2={H - pad.b} />
		</g>
		<!-- y above the axis, x to the right of it -->
		<g font-size="18" fill="black">
			<text x={pad.l} y={pad.t - 10} text-anchor="middle">y</text>
			<text x={W - pad.r + 10} y={ys(0) + 6}>x</text>
		</g>
		<!-- curve + dot get cut off where the axes end -->
		<clipPath id="axes{sign}">
			<rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={H - pad.t - pad.b} />
		</clipPath>
		<g clip-path="url(#axes{sign})">
			<polyline
				points={curve(sign)}
				fill="none"
				stroke={color}
				stroke-width="4"
				stroke-linecap="round"
			/>
			<circle cx={xs(x)} cy={ys(sign * Math.log10(x))} r="5" fill="black" />
		</g>
	</svg>
{/snippet}

<div bind:this={root} class="h-full w-full overflow-y-auto pt-4 pb-6">
	<div
		class="mx-auto flex max-w-6xl flex-col gap-10 text-2xl leading-relaxed text-black short:gap-6 short:text-xl"
	>
		<!-- big Ka = strong -->
		<section class="flex flex-col gap-5">
			<h2 class="text-3xl font-bold short:text-2xl">
				Bigger <span class="text-red">K<sub>a</sub></span> = stronger acid
			</h2>
			<p>
				{@html chem(
					'A stronger acid gives away more H+, so more products. More on the top = bigger K<sub>a</sub>.'
				)}
			</p>
			<div class="flex justify-center gap-24 text-center">
				<p class="text-3xl short:text-2xl">
					<b class="text-red">K<sub>a</sub></b> =
					<Fraction>
						{#snippet top()}<span class="text-[1.4em]">{@html chem('[H3O+][A-]')}</span>{/snippet}
						{#snippet bottom()}<span class="text-[0.7em]">[HA]</span>{/snippet}
					</Fraction>
				</p>
				<div class="flex flex-col items-center gap-2">
					<p class="text-3xl short:text-2xl">
						<b class="text-red">K<sub>a</sub></b> =
						<Fraction>
							{#snippet top()}<span class="text-[0.7em]">{@html chem('[H3O+][A-]')}</span>{/snippet}
							{#snippet bottom()}<span class="text-[1.4em]">[HA]</span>{/snippet}
						</Fraction>
					</p>
					<p class="text-xl text-subtext0">(smaller = weaker)</p>
				</div>
			</div>
		</section>

		<!-- 1: log and -log together -->
		{#if step >= 1}
			<div in:fade={{ duration: 500 }} data-step="1" class="flex flex-col gap-10 short:gap-6">
				<hr class="rounded-full border-t-3 border-text" />
				<section class="grid grid-cols-2 gap-12">
					<div class="flex flex-col items-center gap-3">
						<p class="font-bold">y = log x</p>
						{@render graph(1, 'var(--color-teal)')}
						<p class="text-center">x goes up → y goes <b class="text-teal">up</b></p>
					</div>
					<div class="flex flex-col items-center gap-3">
						<p class="font-bold">y = <span class="text-mauve">−</span>log x</p>
						{@render graph(-1, 'var(--color-mauve)')}
						<p class="text-center">x goes up → y goes <b class="text-mauve">down</b></p>
					</div>
				</section>
			</div>
		{/if}

		<!-- 2: so pKa -->
		{#if step >= 2}
			<section in:fade={{ duration: 500 }} data-step="2" class="flex flex-col items-center gap-4">
				<p>
					<span class="text-red">pK<sub>a</sub></span> = −log
					<span class="text-red">K<sub>a</sub></span>, larger
					<span class="text-red">K<sub>a</sub></span> = smaller
					<span class="text-red">pK<sub>a</sub></span>
				</p>
				<p class="rounded-xl border-3 border-black/60 px-8 py-3 text-3xl font-bold short:text-2xl">
					lower <span class="text-red">pK<sub>a</sub></span> = stronger acid
				</p>
				<p class="text-xl text-subtext0">
					{@html chem('(same as pH = −log[H3O+])')}
				</p>
			</section>
		{/if}

		<!-- under whatever's showing -->
		{#if step < last}
			<div class="mx-auto">
				<ArrowButton onclick={next} />
			</div>
		{/if}
	</div>
</div>
