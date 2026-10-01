<script lang="ts">
	import { chem } from '$lib/chem';
	import { fade } from 'svelte/transition';
	import Arrow from '$lib/components/Arrow.svelte';

	const formulas = ['HCl', 'H2O', 'Cl−', 'H3O+'];

	let acid = $state<number | null>(null);
	let base = $state<number | null>(null);
	let wrong = $state(false);

	/**
	 * 0: asking
	 * 1: correct, H3O+ acid, Cl- base
	 * 2: remember HCl was acid
	 * 3: and H2O was base
	 * 4: line 1 + caption
	 * 5: pair 1 purple
	 * 6: line 2
	 * 7: pair 2 orange
	 * 8: conj labels
	 * 9: shrink to top half + explanation
	 */
	let step = $state(0);
	const solved = $derived(step > 0);
	const canSkip = $derived(solved && step < 9);

	// time between stepS
	const holds = [0, 3000, 2500, 6000, 1000, 5000, 1000, 3700, 4500];

	let timer: ReturnType<typeof setTimeout>;
	$effect(() => () => clearTimeout(timer));

	function goTo(n: number, manual = false) {
		clearTimeout(timer);
		step = n;
		// after a manual skip wait 15s before going on by itself
		if (n < 9) timer = setTimeout(() => goTo(n + 1), manual ? 15000 : holds[n]);
	}

	function skip() {
		if (canSkip) goTo(step + 1, true);
	}

	function pick(i: number) {
		if (acid === null) {
			acid = i;
		} else if (i === acid) {
			acid = null;
		} else {
			base = i;
			if (acid === 3 && base === 2) goTo(1);
			else miss();
		}
	}

	// show wrong picks for a bit then reset
	function miss() {
		wrong = true;
		timer = setTimeout(() => {
			acid = null;
			base = null;
			wrong = false;
		}, 1500);
	}

	// red = acid, blue = base
	function roleOf(i: number) {
		if (step === 0) return i === acid ? 'red' : i === base ? 'blue' : null;
		if (i === 3 || (i === 0 && step >= 2)) return 'red';
		if (i === 2 || (i === 1 && step >= 3)) return 'blue';
		return null;
	}

	// pair 1 is HCl and Cl, pair 2 is H2O and H3O
	const pairOf = (i: number) => (i === 0 || i === 2 ? 1 : 2);

	// pair color once that pair's line is drawn
	function pairColor(i: number) {
		if (pairOf(i) === 1 && step >= 4) return 'mauve';
		if (pairOf(i) === 2 && step >= 6) return 'peach';
		return null;
	}

	// tile fill, outline, text color.  change to pair colors later
	function look(i: number) {
		const pair = pairOf(i);
		if ((pair === 1 && step >= 5) || (pair === 2 && step >= 7)) {
			const c = pair === 1 ? 'mauve' : 'peach';
			return {
				fill: `var(--color-${c}-light)`,
				outline: `var(--color-${c})`,
				text: `var(--color-${c}-dark)`
			};
		}
		const role = roleOf(i);
		if (role) {
			return {
				fill: `color-mix(in oklab, var(--color-${role}) 70%, white)`,
				outline: `var(--color-${role})`,
				text: 'black'
			};
		}
		return {
			fill: 'color-mix(in oklab, var(--color-red) 50%, white)',
			outline: 'transparent',
			text: 'black'
		};
	}

	function labelOf(i: number) {
		const role = roleOf(i);
		if (!role) return '';
		return role === 'red' ? 'acid' : 'base';
	}

	const writing = `Every acid turns into a <b class="text-blue">conjugate base</b> by giving one H+<br>
		And every base turns into a <b class="text-red">conjugate acid</b> by taking one H+<br>
		<p class="mt-4 text-subtext0">A conjugate pair is two molecules that differ by one H+</p>`;
</script>

{#snippet line(drawn: boolean, color: string, flip: boolean)}
	<!-- middle of one tile to middle of tile two over: 5 + 5 + 10 + 7 + 5 = 32rem -->
	<svg viewBox="0 0 512 20" class="h-5 w-[32rem]">
		<path
			d={flip
				? 'M2 2 V14 Q2 18 6 18 H506 Q510 18 510 14 V2'
				: 'M2 18 V6 Q2 2 6 2 H506 Q510 2 510 6 V18'}
			pathLength="1"
			fill="none"
			stroke="var(--color-{color})"
			stroke-width="4"
			stroke-linecap="round"
			stroke-dasharray="1"
			stroke-dashoffset={drawn ? 0 : 1}
			class="transition-[stroke-dashoffset] duration-700 ease-out"
		/>
	</svg>
{/snippet}

<!-- click anywhere to skip a step -->
<svelte:window onclick={skip} />

<div class="relative h-full w-full {canSkip ? 'cursor-pointer' : ''}">
	<p
		class="pointer-events-none absolute -top-6 right-0 text-lg text-subtext0 transition-opacity duration-300 {canSkip
			? ''
			: 'opacity-0'}"
	>
		click to skip
	</p>

	<!-- big and centered, then shrinks into the top half for the text. short screens shrink more so it fits -->
	<div
		class="flex items-center justify-center transition-[height] duration-700 ease-out {step >= 9
			? 'h-1/2'
			: 'h-full'}"
	>
		<div
			class="flex flex-col items-center transition-transform duration-700 ease-out {step >= 9
				? '[@media(max-height:800px)]:scale-80'
				: 'scale-125'}"
		>
			<!-- collapses at the end so the top half has room -->
			<p
				class="text-2xl transition-[opacity,height,margin] duration-300 {step >= 9
					? 'mb-0 h-0 opacity-0 duration-700'
					: step <= 1 || (step >= 4 && step <= 7)
						? 'mb-6 h-8'
						: 'mb-6 h-8 opacity-0'}"
				class:text-red={wrong}
				class:text-green={solved && step < 4}
				class:font-bold={solved && step < 4}
			>
				{#if step >= 4}
					So we call these a <b class="text-mauve">conjugate acid–base pair</b>.
				{:else if solved}
					Correct!
				{:else if wrong}
					Not quite
				{:else if acid === null}
					If this reaction ran <b>backwards</b>, which species would be the
					<b class="text-red">acid</b>?
				{:else}
					And which would be the <b class="text-blue">base</b>?
				{/if}
			</p>

			<div class="grid grid-cols-[10rem_5rem_10rem_7rem_10rem_5rem_10rem] items-end">
				<p
					class="col-start-1 row-start-1 mb-3 justify-self-center whitespace-nowrap transition-opacity duration-500 {step ===
						2 || step === 3
						? ''
						: 'opacity-0'}"
				>
					{@html chem('Remember, HCl was the acid')}
				</p>
				<p
					class="col-start-3 row-start-1 mb-3 justify-self-center whitespace-nowrap transition-opacity duration-500 {step ===
					3
						? ''
						: 'opacity-0'}"
				>
					{@html chem('…and H2O was the base')}
				</p>
				<div class="col-span-5 col-start-1 row-start-1 mb-2 flex flex-col items-center">
					<span
						class="font-semibold text-mauve transition-opacity duration-300 {step >= 8
							? ''
							: 'opacity-0'}"
					>
						conjugate pair
					</span>
					{@render line(step >= 4, 'mauve', false)}
				</div>

				{#each formulas as formula, i (formula)}
					{@const { fill, outline, text } = look(i)}
					{@const role = roleOf(i)}
					<button
						onclick={(e) => {
							// stop so the answering click doesn't also skip
							e.stopPropagation();
							pick(i);
						}}
						disabled={wrong}
						style:grid-column={i * 2 + 1}
						style:background-color={fill}
						style:outline-color={outline}
						style:color={text}
						class="row-start-2 rounded-xl py-8 text-4xl font-bold shadow-sm outline-4 -outline-offset-1 [transition:background-color_700ms,outline-color_700ms,color_700ms,filter_150ms] {solved
							? 'pointer-events-none'
							: wrong
								? ''
								: 'hover:brightness-95'}"
					>
						{@html chem(formula)}
					</button>
					{@const label = labelOf(i)}
					{@const color = pairColor(i) ?? role}
					{@const conj = step >= 8 && i >= 2}
					<!-- delay so the color changes when the line reaches it -->
					<span
						style:grid-column={i * 2 + 1}
						style:color={color ? `var(--color-${color})` : undefined}
						class="row-start-3 flex h-7 justify-center text-lg font-semibold transition-colors duration-500 {solved
							? 'delay-500'
							: ''}"
					>
						<!-- 0fr to 1fr grows the word from nothing, pushing the name right. then it fades in -->
						<span
							class="grid transition-[grid-template-columns] duration-700 ease-out {conj
								? 'grid-cols-[1fr]'
								: 'grid-cols-[0fr]'}"
						>
							<span
								class="overflow-hidden whitespace-nowrap transition-opacity duration-500 {conj
									? 'delay-700'
									: 'opacity-0'}"
							>
								conjugate&nbsp;
							</span>
						</span>
						<!-- old and new name share one cell to fade across -->
						<span class="grid">
							{#key label}
								<span class="col-start-1 row-start-1" transition:fade={{ duration: 400 }}
									>{label}</span
								>
							{/key}
						</span>
					</span>

					{#if i === 1}
						<span
							style:grid-column={i * 2 + 2}
							class="row-start-2 self-center justify-self-center text-black"
						>
							<Arrow reversible={solved} />
						</span>
					{:else if i < 3}
						<span
							style:grid-column={i * 2 + 2}
							class="row-start-2 self-center text-center text-5xl text-black"
						>
							+
						</span>
					{/if}
				{/each}

				<div class="col-span-5 col-start-3 row-start-4 mt-2 flex flex-col items-center">
					<div class="relative">
						{@render line(step >= 6, 'peach', true)}
						<!-- step 8: label slide + fade is 1.2s, then gone 3s after -->
						<span
							class="absolute top-1/2 left-full ml-3 -translate-y-1/2 text-sm whitespace-nowrap text-peach transition-opacity duration-300 {step >=
							9
								? 'opacity-0'
								: step >= 8
									? 'opacity-0 delay-[4200ms]'
									: step >= 6
										? 'delay-500'
										: 'opacity-0'}"
						>
							(and these too)
						</span>
					</div>
					<span
						class="font-semibold text-peach transition-opacity duration-300 {step >= 8
							? ''
							: 'opacity-0'}"
					>
						conjugate pair
					</span>
				</div>
			</div>
		</div>
	</div>

	<!-- pointer-events-none so this layer doesn't block the tiles under it -->
	<div
		class="pointer-events-none absolute inset-x-0 bottom-0 flex h-1/2 flex-col gap-6 transition-opacity duration-700 {step >=
		9
			? 'delay-500'
			: 'opacity-0'}"
	>
		<hr class="rounded-full border-t-4 border-text" />
		<div class="text-center text-2xl leading-relaxed text-black">{@html chem(writing)}</div>
	</div>
</div>
