<script lang="ts">
	import { tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import Arrow from '$lib/components/Arrow.svelte';
	import Fraction from '$lib/components/Fraction.svelte';
	import { chem } from '$lib/chem';

	// increase's button text turns into these one click at a time. add more here
	const doubts = [
		'are you sure?',
		'are you reaaaally sure??',
		'are you reeeaaaaaaaaaaaaaaaly sure?',
		"i don't think you're sure, so you should just give up now"
	];
	const options = ['increase', 'decrease', 'stay the same'];

	let asks = $state(0);
	let picked = $state<number | null>(null);
	let note = $state('');
	let right = $state(false);

	let root = $state<HTMLDivElement>();

	// where the buttons start, worked out once so they're centred before increase grows
	let row = $state<HTMLDivElement>();
	let start = $state(0);
	$effect(() => {
		const width = [...row.children].reduce((w, b) => w + b.clientWidth, 0) + 16 * 2;
		start = (row.clientWidth - width) / 2;
	});
	async function choose(i: number) {
		picked = i;
		// the other two are just wrong
		if (i !== 0) {
			note = 'nope';
			return;
		}
		note = '';
		if (asks < doubts.length) {
			asks++;
			return;
		}
		// clicked through all of them
		right = true;
		await tick();
		root.querySelector('[data-why]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<!-- 1/10 with a real bar, smaller so it fits inside the big fraction -->
<!-- tall brackets so they wrap the whole 1/10 -->
{#snippet paren(c: string)}<span class="text-[1.9em] leading-none font-light">{c}</span>{/snippet}

{#snippet tenth()}<span class="text-[0.7em]"
		><Fraction>{#snippet top()}1{/snippet}{#snippet bottom()}10{/snippet}</Fraction></span
	>{/snippet}

<div
	bind:this={root}
	class="h-full w-full overflow-x-hidden overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_1.5rem)] pt-4 pb-6"
>
	<div
		class="mx-auto flex max-w-5xl flex-col gap-10 text-2xl leading-relaxed text-black short:gap-7 short:text-xl"
	>
		<section class="flex flex-col items-center gap-5 text-center">
			<p class="text-3xl short:text-2xl">
				% ionisation =
				<Fraction>
					{#snippet top()}{@html chem('[H3O+]<sub>eq</sub>')}{/snippet}
					{#snippet bottom()}[HA]<sub>initial</sub>{/snippet}
				</Fraction>
				× 100
			</p>

		</section>

		<hr class="rounded-full border-t-3 border-text" />

		<!-- the joke question -->
		<section class="flex flex-col items-center gap-6 text-center">
			<p>If you add water to vinegar, does the % of acid that ionises:</p>
			<!-- increase stays put as its text grows, the others get pushed right (off screen is fine) -->
			<div
				bind:this={row}
				class="flex gap-4 self-stretch whitespace-nowrap"
				style:padding-left="{start}px"
			>
				{#each options as text, i (text)}
					<button
						onclick={() => choose(i)}
						disabled={right}
						class="rounded-xl px-6 py-2 outline-3 -outline-offset-1 transition-colors {right && i === 0
							? 'bg-green-light/60 outline-green'
							: picked === i
								? 'bg-black/15 outline-black'
								: 'bg-black/5 outline-transparent hover:bg-black/10'} {right && i !== 0
							? 'opacity-50'
							: ''}"
					>
						{#key asks}
							<span in:fade={{ duration: 250 }}>{i === 0 && asks ? doubts[asks - 1] : text}</span>
						{/key}
					</button>
				{/each}
			</div>
			<p data-note class="h-9">
				{#key note + picked + right}
					<span in:fade={{ duration: 250 }} class={right ? 'font-bold text-green' : 'text-red'}>
						{right ? 'Correct!' : note}
					</span>
					{#if right}
						<span in:fade>(but it's still gonna taste less sour)</span>
					{/if}
				{/key}
			</p>
		</section>

		{#if right}
			<div in:fade={{ duration: 600 }} data-why class="flex flex-col gap-10 short:gap-7">
				<hr class="rounded-full border-t-3 border-text" />

				<section class="grid grid-cols-2 gap-12">
					<div class="flex flex-col gap-3">
						<p class="font-bold">Splitting</p>
						<p>
							{@html chem('HA + H2O')}
							<Arrow class="inline w-10 align-middle" />
							{@html chem('H3O+ + A-')}
						</p>
						<p class="text-xl">
							Each HA just has to collide with water, and water is abundant
						</p>
					</div>
					<div class="flex flex-col gap-3">
						<p class="font-bold">Joining back</p>
						<p>
							{@html chem('H3O+ + A-')}
							<Arrow class="inline w-10 align-middle" />
							{@html chem('HA + H2O')}
						</p>
						<p class="text-xl">
							{@html chem(
								'Diluting the solution makes it harder for H3O to find A-'
							)}
						</p>
					</div>
				</section>
				<p class="rainbow text-center font-bold">
					Same splitting + less joining back = more ionised acid
				</p>


				<section class="flex flex-col items-center gap-4">
					<p class="mb-3">Equilibrium explanation: dilute by a factor of 10:</p>
					<p class="mb-4 flex items-center gap-4 text-3xl short:text-2xl">
						Q =
						<Fraction>
							{#snippet top()}{@html chem('[H3O+][A-]')}{/snippet}
							{#snippet bottom()}[HA]{/snippet}
						</Fraction>
						<Arrow class="w-12" />
						<Fraction>
							{#snippet top()}<span class="flex items-center"
									>{@render paren('(')}{@render tenth()}{@render paren(')')}{@render paren(
										'('
									)}{@render tenth()}{@render paren(')')}</span
								>{/snippet}
							{#snippet bottom()}{@render tenth()}{/snippet}
						</Fraction>
						<span class="flex items-center gap-3">= {@render tenth()} of undiluted acid</span>
					</p>
					<p>
						Since Q &lt; <span class="text-red">K<sub>a</sub></span>, equilibrium shifts right so
						more acid is ionised
					</p>
				</section>
			</div>
		{/if}
	</div>
</div>

<style>
	/* rainbow text, still */
	.rainbow {
		background: linear-gradient(
			90deg,
			var(--color-red),
			var(--color-peach),
			var(--color-yellow),
			var(--color-green),
			var(--color-blue),
			var(--color-mauve)
		);
		background-clip: text;
		color: transparent;
	}
</style>
