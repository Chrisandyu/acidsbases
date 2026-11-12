<script lang="ts">
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import ArrowButton from '$lib/components/ArrowButton.svelte';
	import Arrow from '$lib/components/Arrow.svelte';
	import Fraction from '$lib/components/Fraction.svelte';
	import { chem } from '$lib/chem';

	// the proof they tried on the ka page, one step per click.
	// step 1 is inside the equation line so it keeps its space (invisible) or the line would shift.
	// step 2 just gets added at the bottom, nothing above it moves
	let step = $state(0);
	const last = 2;
	// fades in at step n, takes up its space the whole time
	const at = (n: number) => (step >= n ? 'opacity-100' : 'opacity-0');

	// next step + scroll it into view (the page doesn't grow, so nothing else scrolls it)
	let root = $state<HTMLDivElement>();
	async function next() {
		step++;
		await tick();
		root
			.querySelector(`[data-step="${step}"]`)
			?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}
</script>

<!-- K's coloured: a = red, b = blue -->
{#snippet Ka()}<b class="text-red">K<sub>a</sub></b>{/snippet}
{#snippet Kb()}<b class="text-blue">K<sub>b</sub></b>{/snippet}

<div bind:this={root} class="proof h-full w-full overflow-y-auto pt-4 pb-6">
	<div class="mx-auto flex max-w-6xl flex-col gap-10 text-2xl text-black short:gap-7 short:text-xl">
		<!-- what we want -->
		<div class="flex flex-col gap-3">
			<p>Prove:</p>
			<div class="flex flex-col gap-2 pl-8 text-4xl font-bold short:text-3xl">
				<p>{@render Ka()} × {@render Kb()} = K<sub>w</sub></p>
				<p>
					<span class="text-red">pK<sub>a</sub></span> +
					<span class="text-blue">pK<sub>b</sub></span> = 14
					<span class="text-xl font-normal text-subtext0">at 25 °C</span>
				</p>
			</div>
		</div>

		<hr class="rounded-full border-t-3 border-text" />

		<!-- 1: multiply. the [HA] and [A-] cancel at step 1 -->
		<div class="flex flex-col gap-5">
			<p>Multiply them:</p>
			<p class="mt-14 text-center text-3xl short:text-2xl {step >= 1 ? 'cancel' : ''}">
				{@render Ka()} × {@render Kb()} =
				<Fraction>
					{#snippet top()}{@html chem('[H3O+]<s>[A-]</s>')}{/snippet}
					{#snippet bottom()}{@html chem('<s>[HA]</s>')}{/snippet}
				</Fraction>
				×
				<Fraction>
					{#snippet top()}{@html chem('<s>[HA]</s>[OH-]')}{/snippet}
					{#snippet bottom()}{@html chem('<s>[A-]</s>')}{/snippet}
				</Fraction>
				<span data-step="1" class="transition-opacity duration-500 {at(1)}">
					=
					<span class="relative">
						{@html chem('[H3O+][OH-]')}
						<!-- reminder of where it comes from, right above it, arrow points down at it -->
						<span
							class="absolute bottom-full left-1/2 flex -translate-x-1/2 flex-col items-center text-xl font-normal whitespace-nowrap text-subtext0"
						>
							<span>
								{@html chem('2H2O')}
								<Arrow reversible class="inline w-9 align-middle" />
								{@html chem('H3O+ + OH-')}
							</span>
							<svg
								viewBox="0 0 16 30"
								class="h-6 w-auto"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M8 2 V27 M2 21 L8 27 L14 21" />
							</svg>
						</span>
					</span>
					= <b>K<sub>w</sub></b>
				</span>
			</p>
		</div>

		<!-- 2: -log both sides -->
		{#if step >= 2}
			<div in:fade={{ duration: 500 }} data-step="2" class="flex flex-col gap-5">
				<p>−log both sides:</p>
				<div class="flex flex-col items-center gap-3 text-3xl short:text-2xl">
					<p>−log({@render Ka()} × {@render Kb()}) = −log K<sub>w</sub></p>
					<p>−log {@render Ka()} + (−log {@render Kb()}) = −log K<sub>w</sub></p>
					<p class="mt-2 font-bold">
						<span class="text-red">pK<sub>a</sub></span> +
						<span class="text-blue">pK<sub>b</sub></span> = pK<sub>w</sub> = 14.00
						<span class="text-xl font-normal text-subtext0">at 25 °C</span>
					</p>
				</div>
			</div>
		{/if}

		<!-- in the footer between back + next, always on screen and never over the content -->
		<div class="fixed bottom-8 left-1/2 z-20 -translate-x-1/2 {step < last ? '' : 'invisible'}">
			<ArrowButton onclick={next} />
		</div>
	</div>
</div>

<style>
	/* <s> marks the bits that cancel. they just fade out, no line */
	.proof :global(s) {
		text-decoration: none;
		transition: opacity 0.5s;
	}
	.cancel :global(s) {
		opacity: 0.2;
	}
</style>
