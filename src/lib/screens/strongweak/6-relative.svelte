<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import Arrow from '$lib/components/Arrow.svelte';
	import { chem } from '$lib/chem';

	// each side is [acid, base]. why shows once they get it
	type Side = 'left' | 'right';
	const reactions: {
		left: string[];
		right: string[];
		wins: Side;
		oneWay?: boolean;
		why: string;
	}[] = [
		{
			left: ['HCl', 'H2O'],
			right: ['H3O+', 'Cl-'],
			wins: 'right',
			oneWay: true,
			why: 'HCl is a stronger acid than H3O+'
		},
		{
			left: ['CH3COOH', 'H2O'],
			right: ['H3O+', 'CH3COO-'],
			wins: 'left',
			why: 'H3O+ is a stronger acid than CH3COOH'
		},
		{
			left: ['H2O', 'NH3'],
			right: ['NH4+', 'OH-'],
			wins: 'left',
			why: 'NH4+ is a stronger acid than H2O/OH- is a stronger base than NH3'
		}
	];

	// what they picked per reaction, and if it was wrong
	const picks = $state<(Side | null)[]>(reactions.map(() => null));
	const wrong = $state<(Side | null)[]>(reactions.map(() => null));

	function pick(i: number, side: Side) {
		if (picks[i]) return;
		if (side === reactions[i].wins) picks[i] = side;
		else wrong[i] = side;
	}

	let popup = $state(false);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (popup = false)} />

{#snippet species(i: number, side: Side, j: number, s: string)}
	{@const weaker = side === reactions[i].wins}
	<span class="relative">
		{@html chem(s)}
		<!-- labels show up once they get it right. absolute so they dont push the + around -->
		<span
			class="absolute top-full left-1/2 flex -translate-x-1/2 flex-col items-center text-[0.875rem] leading-tight font-normal transition-opacity duration-500 {weaker
				? 'text-teal'
				: 'text-black/70'} {picks[i] ? 'opacity-100' : 'opacity-0'}"
		>
			<!-- two lines so neighbours dont run into each other -->
			<span>{weaker ? 'weaker' : 'stronger'}</span>
			<span>{j === 0 ? 'acid' : 'base'}</span>
		</span>
	</span>
{/snippet}

{#snippet side(i: number, which: Side)}
	{@const r = reactions[i]}
	{@const done = picks[i] !== null}
	<button
		onclick={() => pick(i, which)}
		disabled={done}
		class="flex items-baseline gap-2 rounded-xl px-3 py-1 transition-[color,opacity,background-color] duration-150 {which ===
		'left'
			? 'justify-self-end'
			: 'justify-self-start'} {done
			? r.wins === which
				? 'font-bold'
				: 'opacity-60'
			: wrong[i] === which
				? 'text-red'
				: 'hover:bg-black/8'}"
	>
		{@render species(i, which, 0, r[which][0])}
		<span>+</span>
		{@render species(i, which, 1, r[which][1])}
	</button>
{/snippet}

<div
	class="h-full w-full overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_1.5rem)] pt-4 pb-6"
>
	<div
		class="mx-auto flex max-w-6xl flex-col gap-10 text-2xl leading-relaxed text-black short:gap-7 short:text-xl"
	>
		<!-- follows from ka x kb = kw -->
		<section class="flex flex-col items-center gap-3 text-center">
			<p class="max-w-10xl text-2xl font-bold short:text-2xl">
				The conjugate base of a strong acid is a weak base + vice versa
			</p>
			<p>
				<span class="text-red">K<sub>a</sub></span> × <span class="text-blue">K<sub>b</sub></span> =
				10<sup>-14</sup>, if K<sub>a</sub> is big K<sub>b</sub> is small
			</p>
		</section>

		<section class="flex flex-col items-center gap-5 text-center">
			<p class="max-w-8xl">
				You can always predict the direction of any acid/base reaction with this rule:<br />
				Equilibrium always favours the side with the <b>weaker</b> acid and base
			</p>
			<p class="flex items-center gap-4 text-3xl short:text-2xl">
				stronger acid + stronger base
				<Arrow reversible class="w-14" />
				<b class="text-teal">weaker acid + weaker base</b>
			</p>
		</section>

		<hr class="rounded-full border-t-3 border-text" />

		<!-- they click the side it favours. same 3 columns for every row so the arrows line up -->
		<section class="flex flex-col items-center gap-6 short:gap-4">
			<p>Which side will be favoured?</p>
			<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 text-3xl short:text-2xl">
				{#each reactions as r, i (i)}
					<!-- next one shows up once they get the one before -->
					{#if i === 0 || picks[i - 1]}
						<div in:fade={{ duration: 500 }} class="col-span-3 grid grid-cols-subgrid items-center">
							{@render side(i, 'left')}
							<!-- hcl turns into a one way arrow once they get it -->
							<Arrow reversible={!(picks[i] && r.oneWay)} class="w-14" />
							{@render side(i, 'right')}
							<!-- room for the labels only once they're there, so nope sits right under -->
							<p
								class="col-span-3 mb-3 min-h-8 text-center text-xl text-black/75 short:mb-2 {picks[
									i
								]
									? 'mt-12 short:mt-11'
									: 'mt-1'}"
							>
								{#if picks[i]}
									<span in:fade>{@html chem(r.why)}</span>
								{:else if wrong[i]}
									<span in:fade class="text-red">nope</span>
								{/if}
							</p>
						</div>
					{/if}
				{/each}
			</div>
			<button
				onclick={() => (popup = true)}
				class="text-xl text-blue underline underline-offset-4 hover:text-blue-dark"
			>
				why is stronger acid + weaker base → weaker acid + stronger base not possible?
			</button>
		</section>
	</div>
</div>

<!-- why the strong acid always comes with the strong base, drops down from the top -->
{#if popup}
	<button
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-30 bg-black/20"
		aria-label="close"
		onclick={() => (popup = false)}
	></button>
	<div
		transition:fly={{ y: -300, duration: 400 }}
		class="fixed top-6 left-1/2 z-40 flex w-[min(56rem,90vw)] -translate-x-1/2 flex-col gap-5 rounded-2xl border-3 border-black/60 bg-[color-mix(in_oklab,var(--color-peach)_30%,var(--color-base))] px-10 py-7 text-xl leading-relaxed text-black shadow-xl"
	>
		<button
			onclick={() => (popup = false)}
			class="absolute top-3 right-5 text-3xl text-black/50 hover:text-black"
			aria-label="close">×</button
		>
		<!-- 7 fixed columns so the pair lines know where everything is (in rem, x16 for the svg) -->
		<div class="relative mx-auto py-9 text-3xl">
			<div class="grid grid-cols-[8rem_2rem_8rem_5rem_8rem_2rem_8rem] items-center text-center">
				<span>HA</span><span>+</span><span>B</span>
				<span class="flex justify-center"><Arrow reversible class="w-14" /></span>
				<span>{@html chem('A-')}</span><span>+</span><span>{@html chem('HB+')}</span>
			</div>
			<svg
				viewBox="0 0 656 130"
				preserveAspectRatio="none"
				class="absolute inset-0 h-full w-full"
				fill="none"
				aria-hidden="true"
			>
				<path
					d="M64 30 Q248 -8 432 30"
					stroke="var(--color-red)"
					stroke-width="3"
					stroke-dasharray="7 7"
				/>
				<path
					d="M224 100 Q408 138 592 100"
					stroke="var(--color-blue)"
					stroke-width="3"
					stroke-dasharray="7 7"
				/>
			</svg>
		</div>
		<!-- their words -->
		<p>
			There are two acids and two bases. To clear up: stronger would mean the stronger of the two
			acids
		</p>
		<p>
			If the first acid is strong, its conjugate base on the other side must be weaker (the
			conjugate base could not possibly be the one because that would mean that that first acid is
			weaker by K<sub>a</sub> × K<sub>b</sub> = K<sub>w</sub>). Therefore the base on the left must
			be the stronger base and it's conjugate acid must be the weaker acid.
		</p>
	</div>
{/if}
