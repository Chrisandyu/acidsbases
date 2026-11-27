<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import Arrow from '$lib/components/Arrow.svelte';
	import Button from '$lib/components/Button.svelte';
	import Fraction from '$lib/components/Fraction.svelte';
	import { chem } from '$lib/chem';

	// typed text -> number. takes 0.0038, 3.8e-3, 3.8x10^-3, −
	function num(s = '') {
		const t = s
			.replace(/\s/g, '')
			.replace(/[−–]/g, '-')
			.replace(/(x|×|\*)10\^/i, 'e');
		return t ? Number(t) : NaN;
	}
	const norm = (s = '') => s.replace(/\s/g, '').replace(/[−–]/g, '-').toLowerCase();
	const near = (a: number, b: number) => (s: string) => num(s) >= a && num(s) <= b;
	const oneOf = (...ok: string[]) => (s: string) => ok.includes(norm(s));

	// every blank: how to check it + what it shows once its right
	const blanks: Record<string, { test: (s: string) => boolean; show: string; w?: string }> = {
		I0: { test: (s) => num(s) === 0.8, show: '0.80' },
		I2: { test: (s) => num(s) === 0, show: '0' },
		I3: { test: (s) => num(s) === 0, show: '0' },
		C0: { test: oneOf('-x'), show: '−x' },
		C3: { test: oneOf('+x', 'x'), show: '+x' },
		E0: { test: oneOf('0.80-x', '0.8-x'), show: '0.80 − x', w: 'w-44' },
		E2: { test: oneOf('x', '+x', '0+x'), show: 'x' },
		E3: { test: oneOf('x', '+x', '0+x'), show: 'x' },
		x: { test: near(3.75e-3, 3.85e-3), show: '', w: 'w-40' },
		pH: { test: near(2.41, 2.43), show: '' }
	};
	const typed = $state<Record<string, string>>({});
	const ok = $state<Record<string, boolean>>({});
	const bad = $state<Record<string, boolean>>({});

	function type(key: string, value: string) {
		typed[key] = value;
		bad[key] = false;
		if (!blanks[key].test(value)) return;
		ok[key] = true;
		// the box turns into text, so move on to the next one
		tick().then(() => root.querySelector<HTMLInputElement>('input[data-blank]')?.focus());
	}
	// enter or clicking away with something wrong in it
	function miss(key: string) {
		if (typed[key] && !ok[key]) bad[key] = true;
	}
	function idk(keys: string[]) {
		for (const k of keys) ok[k] = true;
	}
	const all = (keys: string[]) => keys.every((k) => ok[k]);
	const initial = ['I0', 'I2', 'I3'];
	const change = ['C0', 'C3'];
	const equilibrium = ['E0', 'E2', 'E3'];

	// the walkthrough after the I row, one line each, typed out. spot = what the light is on
	const talk = [
		{ say: 'We have Ka', spot: 'ka' },
		{ say: 'and we are trying to find [H3O+]', spot: 'h3o' },
		{ say: 'so we define it as x', spot: 'C2' },
		{ say: 'We can find the conjugate base because it’s the same as [H3O+]', spot: 'base' },
		{
			say: 'and we can find the acid because it’s the initial acid added subtracted by the amount of base at equilibrium',
			spot: 'acid'
		},
		{ say: 'So fill out the ICE table!', spot: 'table' }
	];
	let started = $state(false);
	let line = $state(0); // which talk line

	const stage = $derived(
		!started
			? 0
			: !all(initial)
				? 1
				: line < talk.length
					? 2
					: !all(change) || !all(equilibrium)
						? 3
						: !ok.x
							? 4
							: !ok.pH
								? 5
								: 6
	);
	// x for H3O+ goes in once its been explained
	const xIn = $derived(stage > 2 || (stage === 2 && line >= 2));

	// what the light is on + what it says
	const target = $derived(
		stage === 1 ? initial.find((k) => !ok[k])! : stage === 2 ? talk[line].spot : null
	);
	const caption = $derived(
		stage === 1
			? target === 'I2'
				? 'First, how much of each do we have? (ignore the tiny bit from water)'
				: 'First, how much of each do we have?'
			: stage === 2
				? talk[line].say
				: ''
	);

	// typewriter, a letter every 22ms. then a pause before the next line, click skips either
	let letters = $state(0);
	$effect(() => {
		const text = caption;
		letters = 0;
		const timer = setInterval(() => {
			if (letters >= text.length) return clearInterval(timer);
			letters++;
		}, 22);
		return () => clearInterval(timer);
	});
	const typing = $derived(letters < caption.length);
	$effect(() => {
		if (stage !== 2 || typing) return;
		const wait = setTimeout(next, 1700);
		return () => clearTimeout(wait);
	});
	function next() {
		if (typing) return (letters = caption.length);
		line++;
	}
	// half typed text through chem, Ka gets its subscript
	const shown = $derived(
		chem(caption.slice(0, letters)).replace(
			/Ka\b/g,
			'<span class="text-red-light">K<sub>a</sub></span>'
		)
	);

	// the spotlight. eases towards whatever its on every frame so it follows scrolling too.
	// a = how dark the rest is. once theres nothing to light it grows past the screen + fades out
	let light = $state({ x: 0, y: 0, w: 0, h: 0, a: 0 });
	let root = $state<HTMLDivElement>();
	onMount(() => {
		let raf = 0;
		let then = performance.now();
		function frame(now: number) {
			const dt = Math.min(0.05, (now - then) / 1000);
			then = now;
			const el = target && root.querySelector(`[data-spot="${target}"]`);
			let goal = { ...light, a: 0 };
			if (el) {
				const r = el.getBoundingClientRect();
				goal = {
					x: r.x + r.width / 2,
					y: r.y + r.height / 2,
					w: r.width * 1.25 + 70,
					h: r.height * 1.5 + 60,
					a: 1
				};
			} else if (light.a > 0.01) goal = { ...light, w: innerWidth * 3, h: innerHeight * 3, a: 0 };
			// first time on, start where it lands instead of flying in from the corner
			if (el && !light.w) light = { ...goal, a: 0 };
			const k = 1 - Math.exp(-dt * (el ? 6 : 2.5));
			if (el || light.a > 0.01)
				light = {
					x: light.x + (goal.x - light.x) * k,
					y: light.y + (goal.y - light.y) * k,
					w: light.w + (goal.w - light.w) * k,
					h: light.h + (goal.h - light.h) * k,
					a: light.a + (goal.a - light.a) * k
				};
			raf = requestAnimationFrame(frame);
		}
		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	});
	// new thing in the light: bring it to the middle, and put the cursor in it if its a box
	$effect(() => {
		const key = target;
		if (!key) return;
		tick().then(() => {
			const el = root.querySelector(`[data-spot="${key}"]`);
			el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			el?.querySelector('input')?.focus({ preventScroll: true });
		});
	});
	// caption goes on whichever half the light isn't
	const low = $derived(light.y > innerHeight * 0.55);

	// each new bit after the walkthrough scrolls into view
	$effect(() => {
		const s = stage;
		if (s < 3) return;
		tick().then(() =>
			root
				.querySelector(`[data-stage="${s}"]`)
				?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
		);
	});

	// their turn, ka from pH. a x 10^b
	const ka = $derived(num(typed.a) * 10 ** num(typed.b));
	let checked = $state<boolean | null>(null);
	const check = () => (checked = ka >= 1.7e-4 && ka <= 1.9e-4);
	let solution = $state(false);
	async function reveal() {
		solution = true;
		await tick();
		root
			.querySelector('[data-solution]')
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<!-- a blank, turns into the answer once its right. same look as the boxes on the ka slide -->
{#snippet blank(key: string)}
	{#if ok[key]}
		<span in:fade>{@html blanks[key].show}</span>
	{:else}
		<input
			data-blank
			value={typed[key] ?? ''}
			oninput={(e) => type(key, e.currentTarget.value)}
			onkeydown={(e) => e.key === 'Enter' && miss(key)}
			onblur={() => miss(key)}
			aria-label={key}
			spellcheck="false"
			autocomplete="off"
			class="h-[1.5em] {blanks[key].w ??
				'w-24'} rounded-md border-2 border-dashed bg-transparent text-center leading-[1.4em] outline-none {bad[
				key
			]
				? 'border-red'
				: 'border-subtext0 focus:border-black/50'}"
		/>
	{/if}
{/snippet}

<!-- proper root sign, grows with whats inside. the svg's top end meets the bar -->
{#snippet sqrt(inner: string)}
	<span class="inline-flex items-stretch">
		<svg
			viewBox="0 0 24 48"
			preserveAspectRatio="none"
			class="w-[0.75em] shrink-0 overflow-visible"
			fill="none"
			stroke="currentColor"
			stroke-width="3"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path vector-effect="non-scaling-stroke" d="M2 29 L7 25.5 L13 45 L24 1.5" />
		</svg>
		<span class="border-t-[3px] border-current px-2 pt-1">{@html inner}</span>
	</span>
{/snippet}

<!-- big ice table. cells: html, '?key' for a blank, '' for nothing yet. spots names the cells for the light -->
{#snippet ice(
	names: string[],
	table: { letter: string; rest: string; cells: string[] }[],
	spots = false
)}
	<div
		data-spot={spots ? 'table' : undefined}
		class="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto_1fr] items-center text-center text-3xl text-black short:text-2xl"
	>
		<span></span>
		{#each names as name, j (j)}
			{#if j}
				<span class="px-2">
					{#if j === 2}<Arrow reversible class="w-12" />{:else}+{/if}
				</span>
			{/if}
			<span class="py-3 font-bold">{@html chem(name)}</span>
		{/each}
		{#each table as row (row.letter)}
			<span class="flex h-full items-center border-t-2 border-black/25 py-4 pr-8 text-left">
				<b class="text-4xl text-[color-mix(in_oklab,var(--color-peach),black_15%)] short:text-3xl"
					>{row.letter}</b
				><span class="text-lg">{row.rest}</span>
			</span>
			{#each row.cells as cell, j (j)}
				{#if j}<span class="h-full border-t-2 border-black/25"></span>{/if}
				<span class="flex h-full items-center justify-center border-t-2 border-black/25 py-4">
					<span data-spot={spots && j !== 1 ? `${row.letter}${j}` : undefined} class="px-1">
						{#if j === 1}
							<!-- water is a liquid, it stays out of K -->
							—
						{:else if cell.startsWith('?')}
							{@render blank(cell.slice(1))}
						{:else if cell}
							<span in:fade>{@html cell}</span>
						{/if}
					</span>
				</span>
			{/each}
		{/each}
	</div>
{/snippet}

{#snippet idkButton(keys: string[])}
	<button onclick={() => idk(keys)} class="shrink-0 text-xl text-blue underline underline-offset-4"
		>idk</button
	>
{/snippet}

<div
	bind:this={root}
	class="h-full w-full overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_1.5rem)] pt-4 pb-10"
>
	<div
		class="mx-auto flex max-w-5xl flex-col gap-10 text-2xl leading-relaxed text-black short:gap-7 short:text-xl"
	>
		<section class="flex flex-col gap-2">
			<p class="text-3xl font-bold short:text-2xl">
				Vinegar is about 0.80 M acetic acid. What's its pH?
			</p>
			<p><span class="text-red">K<sub>a</sub></span> = 1.8 × 10<sup>−5</sup></p>
		</section>

		<!-- Ka comes up once the I row is in, the walkthrough points at bits of it -->
		{#if stage >= 2}
			<p in:fly={{ y: 30, duration: 600 }} class="flex justify-center text-3xl short:text-2xl">
				<span data-spot="ka" class="inline-flex items-center gap-3 px-2">
					<span class="text-red">K<sub>a</sub></span> =
					<Fraction>
						{#snippet top()}<span data-spot="h3o">{@html chem('[H3O+]')}</span><span
								data-spot="base">{@html chem('[CH3COO-]')}</span
							>{/snippet}
						{#snippet bottom()}<span data-spot="acid">{@html chem('[CH3COOH]')}</span>{/snippet}
					</Fraction>
				</span>
			</p>
		{/if}

		<section class="flex flex-col gap-3">
			{@render ice(
				['CH3COOH', 'H2O', 'H3O+', 'CH3COO-'],
				[
					{
						letter: 'I',
						rest: 'nitial',
						cells: stage >= 1 ? ['?I0', '', '?I2', '?I3'] : ['', '', '', '']
					},
					{
						letter: 'C',
						rest: 'hange',
						cells: [stage >= 3 ? '?C0' : '', '', xIn ? '+x' : '', stage >= 3 ? '?C3' : '']
					},
					{
						letter: 'E',
						rest: 'quilibrium',
						cells: stage >= 3 && all(change) ? ['?E0', '', '?E2', '?E3'] : ['', '', '', '']
					}
				],
				true
			)}
			{#if stage === 0}
				<div class="mt-4 self-center">
					<Button color="peach" onclick={() => (started = true)}>start!</Button>
				</div>
			{:else if stage === 3}
				<!-- what to do on the row they're on -->
				<p in:fade class="flex items-start justify-between gap-8 text-xl">
					<span>
						{@html chem(
							all(change)
								? 'add I and C'
								: 'every H3O+ made comes with one CH3COO-, and uses up one CH3COOH'
						)}
					</span>
					{@render idkButton(all(change) ? equilibrium : change)}
				</p>
			{/if}
		</section>

		<!-- E row into Ka, then solve -->
		{#if stage >= 4}
			<section in:fade data-stage="4" class="flex flex-col items-center gap-4">
				<p class="flex items-center gap-3 text-3xl short:text-2xl">
					<span>1.8 × 10<sup>−5</sup> =</span>
					<Fraction>
						{#snippet top()}x<sup>2</sup>{/snippet}
						{#snippet bottom()}0.80 <span class="opacity-30">− x</span>{/snippet}
					</Fraction>
				</p>
				<p>
					x is tiny next to 0.80, so 0.80 − x ≈ 0.80 <span class="text-green">(5% rule)</span>
				</p>
				<p class="mt-2 flex items-center gap-3 text-3xl short:text-2xl">
					{#if ok.x}
						<span in:fade class="flex items-center gap-3">
							x = {@render sqrt('1.8 × 10<sup>−5</sup> × 0.80')}
							<span>= 3.8 × 10<sup>−3</sup> M</span>
						</span>
					{:else}
						x = {@render blank('x')} M
					{/if}
				</p>
				{#if stage === 4}{@render idkButton(['x'])}{/if}
			</section>
		{/if}

		{#if stage >= 5}
			<section in:fade data-stage="5" class="flex flex-col items-center gap-3">
				<p class="flex items-center gap-3 text-3xl short:text-2xl">
					{#if ok.pH}
						<span in:fade>
							{@html chem('pH = −log[H3O+] = −log(3.8 × 10<sup>−3</sup>) = <b>2.42</b>')}
						</span>
					{:else}
						pH = {@render blank('pH')}
					{/if}
				</p>
				{#if stage === 5}{@render idkButton(['pH'])}{/if}
			</section>
		{/if}

		{#if stage >= 6}
			<div in:fade data-stage="6" class="flex flex-col gap-10 short:gap-7">
				<hr class="rounded-full border-t-3 border-text" />

				<!-- their turn: backwards, Ka from pH -->
				<section class="flex flex-col gap-5">
					<p>
						{@html chem(
							'Ant stings have formic acid (HCOOH)<br> A 0.10 M solution of formic acid a pH of 2.38, find What’s <span class="text-red">K<sub>a</sub></span>?'
						)}
					</p>
					<div class="flex items-center gap-3">
						<span><span class="text-red">K<sub>a</sub></span> =</span>
						{#each ['a', 'b'] as part (part)}
							{#if part === 'b'}<span>× 10</span>{/if}
							<input
								bind:value={typed[part]}
								oninput={() => (checked = null)}
								onkeydown={(e) => e.key === 'Enter' && check()}
								inputmode={part === 'a' ? 'decimal' : undefined}
								aria-label={part === 'a' ? 'number' : 'power of 10'}
								spellcheck="false"
								autocomplete="off"
								class="h-[1.5em] rounded-md border-2 border-dashed bg-transparent text-center leading-[1.4em] outline-none {part ===
								'a'
									? 'w-24'
									: '-mt-6 w-16 text-xl'} {checked === null
									? 'border-subtext0 focus:border-black/50'
									: checked
										? 'border-green'
										: 'border-red'}"
							/>
						{/each}
						<span class="ml-2 text-xl {checked ? 'text-green' : 'text-red'}">
							{checked === null ? '' : checked ? 'yep!' : 'not quite'}
						</span>
					</div>
					<!-- check goes once the answer's out -->
					{#if !solution}
						<div class="flex items-center gap-6">
							<Button size="sm" color="maroon" onclick={check}>check</Button>
							<button onclick={reveal} class="text-xl text-blue underline underline-offset-4"
								>show solution</button
							>
						</div>
					{/if}
				</section>

				{#if solution}
					<section in:fade data-solution class="flex flex-col gap-6">
						<p>
							{@html chem('We can find [H3O+] from pH and call it x:')}
							<span class="whitespace-nowrap">x = 10<sup>−2.38</sup> = 4.2 × 10<sup>−3</sup> M</span>
						</p>
						<p class="text-xl">
							{@html chem(
								'Every H3O+ comes with one HCOO-, so that’s x too. The acid left is what we started with minus x.'
							)}
						</p>
						{@render ice(
							['HCOOH', 'H2O', 'H3O+', 'HCOO-'],
							[
								{ letter: 'I', rest: 'nitial', cells: ['0.10', '', '0', '0'] },
								{ letter: 'C', rest: 'hange', cells: ['−x', '', '+x', '+x'] },
								{ letter: 'E', rest: 'quilibrium', cells: ['0.096', '', '0.0042', '0.0042'] }
							]
						)}
						<p class="flex items-center justify-center gap-3 text-3xl short:text-2xl">
							<span class="text-red">K<sub>a</sub></span> =
							<Fraction>
								{#snippet top()}(4.2 × 10<sup>−3</sup>)<sup>2</sup>{/snippet}
								{#snippet bottom()}0.10 − 0.0042{/snippet}
							</Fraction>
							=
							<Fraction>
								{#snippet top()}(4.2 × 10<sup>−3</sup>)<sup>2</sup>{/snippet}
								{#snippet bottom()}0.096{/snippet}
							</Fraction>
							= <b>1.8 × 10<sup>−4</sup></b>
						</p>
					</section>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- the spotlight: a see-through oval with a huge dark shadow round it, soft on the inside edge.
 shadows dont catch clicks so the box in the light still works -->
{#if light.a > 0.01}
	<div
		class="pointer-events-none fixed z-40 rounded-[50%]"
		style:left="{light.x - light.w / 2}px"
		style:top="{light.y - light.h / 2}px"
		style:width="{light.w}px"
		style:height="{light.h}px"
		style:box-shadow="0 0 0 300vmax rgb(17 17 27 / {0.8 * light.a}), inset 0 0 40px 26px rgb(17 17 27 / {0.8 *
			light.a})"
	></div>
{/if}

{#if stage === 2}
	<!-- click anywhere to hurry it along -->
	<button class="fixed inset-0 z-40 cursor-pointer" aria-label="next" onclick={next}></button>
{/if}

{#if stage === 1 || stage === 2}
	<div
		transition:fade={{ duration: 300 }}
		class="pointer-events-none fixed left-1/2 z-50 flex w-[min(60rem,90vw)] -translate-x-1/2 flex-col items-center gap-2 rounded-3xl bg-[rgb(17_17_27/0.6)] px-8 py-4 text-center text-white backdrop-blur-sm {low
			? 'top-[12%]'
			: 'bottom-[12%]'}"
	>
		<p
			class="text-3xl leading-snug font-bold [text-shadow:0_2px_12px_rgb(0_0_0/0.6)] short:text-2xl"
		>
			{@html shown}<span class="caret">|</span>
		</p>
		{#if stage === 1}
			<button
				onclick={() => idk([target!])}
				class="pointer-events-auto text-xl text-white/80 underline underline-offset-4 hover:text-white"
				>idk</button
			>
		{:else}
			<p class="text-lg text-white/50">click to skip</p>
		{/if}
	</div>
{/if}

<style>
	.caret {
		font-weight: 400;
		animation: blink 1s step-end infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
</style>
