<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import Button from '$lib/components/Button.svelte';
	import Arrow from '$lib/components/Arrow.svelte';
	import Fraction from '$lib/components/Fraction.svelte';
	import { chem } from '$lib/chem';

	let step = $state(0);
	const last = 3;
	// fades in at step n
	const at = (n: number) => (step >= n ? 'opacity-100' : 'opacity-0');

	// next step + scroll it into view
	let root = $state<HTMLDivElement>();
	async function next() {
		step++;
		await tick();
		root
			.querySelector(`[data-step="${step}"]`)
			?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}
</script>

{#snippet Ka()}<b class="text-red">K<sub>a</sub></b>{/snippet}
{#snippet Kb()}<b class="text-blue">K<sub>b</sub></b>{/snippet}

<!-- arrow sits right in the middle of the column -->
{#snippet reaction(left: string, right: string)}
	<p class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
		<span class="text-right">{@html chem(left)}</span>
		<Arrow reversible class="w-12" />
		<span>{@html chem(right)}</span>
	</p>
{/snippet}

<!-- fraction bar lines up under the arrow, "K =" hangs off the left -->
{#snippet k(K: Snippet, num: string, den: string)}
	<p class="flex justify-center">
		<span class="relative">
			<span class="absolute top-1/2 right-full -translate-y-1/2 pr-3 whitespace-nowrap"
				>{@render K()} =</span
			>
			<Fraction>
				{#snippet top()}{@html chem(num)}{/snippet}
				{#snippet bottom()}{@html chem(den)}{/snippet}
			</Fraction>
		</span>
	</p>
{/snippet}

<div bind:this={root} class="proof h-full w-full overflow-y-auto pt-4 pb-6">
	<div class="mx-auto flex max-w-6xl flex-col gap-10 text-2xl text-black short:gap-7 short:text-xl">
		<!-- what we want -->
		<div class="flex flex-col gap-3">
			<p>Prove: <span class="text-subtext0">(try to do it yourself!)</span></p>
			<div class="flex flex-col gap-2 pl-8 text-3xl font-bold short:text-2xl">
				<p>{@render Ka()} × {@render Kb()} = K<sub>w</sub></p>
				<p>
					<span class="text-red">pK<sub>a</sub></span> +
					<span class="text-blue">pK<sub>b</sub></span> = 14
					<span class="text-xl font-normal text-subtext0">at 25 °C</span>
				</p>
			</div>
		</div>

		<hr class="rounded-full border-t-3 border-text" />

		<!-- 1: hcn is the acid, cn- is its conjugate base. hidden till they try it -->
		{#if step >= 1}
			<div in:fade={{ duration: 500 }} data-step="1" class="flex flex-col gap-5">
				<p class="mb-4">{@html chem('Ex: HCN + its conjugate base CN-')}</p>
				<div class="grid grid-cols-2 gap-x-16 gap-y-6 text-3xl short:text-2xl">
					{@render reaction('HCN + H2O', 'H3O+ + CN-')}
					{@render reaction('CN- + H2O', 'HCN + OH-')}
					{@render k(Ka, '[H3O+][CN-]', '[HCN]')}
					{@render k(Kb, '[HCN][OH-]', '[CN-]')}
				</div>
			</div>

			<!-- multiply comes in with it. the [HA] and [A-] cancel at step 2 -->
			<div in:fade={{ duration: 500 }} class="flex flex-col gap-5">
				<p>Multiply them:</p>
				<p class="text-center text-3xl short:text-2xl {step >= 2 ? 'cancel' : ''}">
					{@render Ka()} × {@render Kb()} =
					<Fraction>
						{#snippet top()}{@html chem('[H3O+]<s>[CN-]</s>')}{/snippet}
						{#snippet bottom()}{@html chem('<s>[HCN]</s>')}{/snippet}
					</Fraction>
					×
					<Fraction>
						{#snippet top()}{@html chem('<s>[HCN]</s>[OH-]')}{/snippet}
						{#snippet bottom()}{@html chem('<s>[CN-]</s>')}{/snippet}
					</Fraction>
					<span data-step="2" class="transition-opacity duration-500 {at(2)}">
						=
						{@html chem('[H3O+][OH-]')}
						= <b>K<sub>w</sub></b>
					</span>
				</p>
			</div>
		{/if}

		<!-- 3: -log both sides -->
		{#if step >= 3}
			<div in:fade={{ duration: 500 }} data-step="3" class="flex flex-col gap-5">
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

		<!-- under whatever's showing. says reveal so they try it first -->
		{#if step < last}
			<div class="mx-auto">
				<Button variant="ghost" onclick={next}>reveal</Button>
			</div>
		{/if}
	</div>
</div>

<style>
	/* cancel part */
	.proof :global(s) {
		text-decoration: none;
		transition: opacity 0.5s;
	}
	.cancel :global(s) {
		opacity: 0.2;
	}
</style>
