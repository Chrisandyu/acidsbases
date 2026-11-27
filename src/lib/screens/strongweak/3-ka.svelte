<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import ArrowButton from '$lib/components/ArrowButton.svelte';
	import Arrow from '$lib/components/Arrow.svelte';
	import Fraction from '$lib/components/Fraction.svelte';
	import { chem } from '$lib/chem';

	// student types out the general equation, then K fades in
	type Panel = {
		name: string;
		k: string;
		text: string; // text-red / text-blue
		border: string;
		species: string[]; // reactant, H2O, product, product
		answers: (string | null)[]; // null = still blank
		drafts: string[]; // whats typed so far
		note: string;
	};

	// acid gets HA for free, base starts empty
	const blank = () => ({ answers: [null, null, null, null], drafts: ['', '', '', ''], note: '' });
	const panels: Panel[] = $state([
		{
			name: 'Acid',
			k: 'a',
			text: 'text-red',
			border: 'border-red',
			species: ['HA', 'H2O', 'H3O+', 'A-'],
			...blank(),
			answers: ['HA', null, null, null],
			drafts: ['HA', '', '', '']
		},
		{
			name: 'Base',
			k: 'b',
			text: 'text-blue',
			border: 'border-blue',
			species: ['B', 'H2O', 'BH+', 'OH-'],
			...blank()
		}
	]);

	const done = (p: Panel) => p.answers.every(Boolean);

	// write the given answers (HA) into their boxes
	onMount(() => {
		for (const p of panels) p.answers.forEach((a, j) => a && (boxes[p.k][j].innerHTML = chem(a)));
	});

	// the typing boxes, per panel. not $state, we write their html ourselves
	const boxes: Record<string, HTMLDivElement[]> = { a: [], b: [] };

	// what's typed, only formula characters (a stray < would break chem). all caps, every answer is
	const typed = (box: HTMLDivElement) =>
		box.textContent.replace(/[^A-Za-z0-9+\-()]/g, '').toUpperCase();

	// species on the same side as blank j that aren't filled yet (either order is fine)
	function open(p: Panel, j: number) {
		const side = j < 2 ? [0, 1] : [2, 3];
		return side.map((i) => p.species[i]).filter((s) => !p.answers.includes(s));
	}

	// our own it always sits at the end of the text,
	// x = px from the box's left edge. empty box = middle
	let caret = $state<{ k: string; j: number; x: number } | null>(null);

	function moveCaret(p: Panel, j: number) {
		const box = boxes[p.k][j];
		// real cursor to the end too, so typing always adds to the end
		const range = document.createRange();
		range.selectNodeContents(box);
		range.collapse(false);
		getSelection().removeAllRanges();
		getSelection().addRange(range);

		// measure with a separate range, reusing the one above would select all the text
		const text = document.createRange();
		text.selectNodeContents(box);
		const left = box.getBoundingClientRect().left;
		const x = box.textContent
			? text.getBoundingClientRect().right - left
			: box.getBoundingClientRect().width / 2;
		caret = { k: p.k, j, x };
	}

	// re-render what's typed with chem so it looks exactly like the answer: H3O+ -> H₃O⁺
	function type(p: Panel, j: number) {
		const box = boxes[p.k][j];
		// 4 characters max so it never runs out of the box (longest answer, H3O+, is 4)
		const text = typed(box).slice(0, 4);
		box.innerHTML = chem(text);
		p.drafts[j] = text;
		moveCaret(p, j);

		p.note = '';
		const match = open(p, j).find((s) => s === text);
		if (!match) return;
		p.answers[j] = match;
		// jump to the next empty box (wraps round), or leave if that was the last one.
		// a tick later, firefox puts the cursor back in this box if it's done during the typing
		const next =
			[...p.answers.keys()].find((i) => i > j && !p.answers[i]) ?? p.answers.indexOf(null);
		setTimeout(() => {
			if (next < 0) return box.blur();
			boxes[p.k][next].focus();
			moveCaret(p, next); // moves the real cursor too, focus() alone doesn't always
		});
	}

	// enter or leaving the box with a wrong answer
	function check(p: Panel, j: number) {
		if (!p.answers[j] && typed(boxes[p.k][j])) p.note = 'Incorrect';
	}

	function giveUp(p: Panel) {
		p.answers = [...p.species];
		p.species.forEach((s, j) => (boxes[p.k][j].innerHTML = chem(s)));
		p.drafts = [...p.species];
		p.note = '';
	}

	let split = $state(false);
	$effect(() => {
		if (!done(panels[0]) || split) return;
		const wait = setTimeout(() => (split = true), 1600);
		return () => clearTimeout(wait);
	});

	let showP = $state(false);

	//autoscroll
	let scroller = $state<HTMLDivElement>();
	let content = $state<HTMLDivElement>();
	$effect(() => {
		const watch = new ResizeObserver(() =>
			scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
		);
		watch.observe(content);
		return () => watch.disconnect();
	});
</script>

{#snippet panel(p: Panel)}
	<div class="flex flex-col items-center gap-5">
		<p class="text-xl font-bold {p.text}">{p.name}</p>
		<p>Write the general equation</p>

		<!-- fixed width boxes so nothing shifts. a correct answer just locks + loses its border.
		 locked boxes stay contenteditable and just block typing: turning it off while focused makes firefox drop focus -->
		<div class="flex items-center gap-3 text-3xl short:text-2xl">
			{#each p.species as _, j (j)}
				{#if j === 1 || j === 3}<span>+</span>{/if}
				{#if j === 2}<Arrow reversible class="w-12" />{/if}
				<!-- ? is a separate span, a css ::before placeholder stops firefox from typing in it -->
				<div class="relative">
					<div
						bind:this={boxes[p.k][j]}
						contenteditable="true"
						onbeforeinput={(e) => p.answers[j] && e.preventDefault()}
						role="textbox"
						tabindex={p.answers[j] ? -1 : 0}
						oninput={() => type(p, j)}
						onfocus={() => moveCaret(p, j)}
						onpointerup={() => moveCaret(p, j)}
						onkeydown={(e) => {
							// no moving the cursor around, it lives at the end
							if (
								['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)
							)
								e.preventDefault();
							if (e.key !== 'Enter') return;
							e.preventDefault();
							check(p, j);
						}}
						onblur={() => {
							caret = null;
							check(p, j);
						}}
						spellcheck="false"
						class="peer h-[1.5em] w-24 overflow-hidden rounded-md border-2 border-dashed text-center leading-[1.4em] whitespace-nowrap caret-transparent transition-colors outline-none short:w-20 {p
							.answers[j]
							? 'border-transparent'
							: 'border-subtext0 focus:border-black/50'}"
					></div>
					{#if caret?.k === p.k && caret.j === j && !p.answers[j]}
						<!-- key restarts the blink, so it stays solid while typing -->
						{#key caret.x}
							<span
								class="blink pointer-events-none absolute top-1/2 h-[1.1em] w-0.5 -translate-y-1/2 bg-black"
								style:left="{caret.x}px"
							></span>
						{/key}
					{/if}
					{#if !p.drafts[j]}
						<span
							class="pointer-events-none absolute inset-0 flex items-center justify-center text-subtext0 peer-focus:hidden"
							>?</span
						>
					{/if}
				</div>
			{/each}
		</div>

		{#if !done(p)}
			<button onclick={() => giveUp(p)} class="text-lg text-blue underline underline-offset-4"
				>give up</button
			>
			<p class="h-7 text-lg text-red">{p.note}</p>
		{:else}
			<!-- K fades in once the reaction is built -->
			<div in:fade={{ duration: 800, delay: 300 }} class="flex flex-col items-center gap-2">
				<div class="rounded-xl border-3 px-7 py-4 text-3xl short:text-2xl {p.border}">
					<b class={p.text}>K<sub>{p.k}</sub></b> =
					<Fraction>
						{#snippet top()}{@html chem(`[${p.species[2]}][${p.species[3]}]`)}{/snippet}
						{#snippet bottom()}{@html chem(`[${p.species[0]}]`)}{/snippet}
					</Fraction>
				</div>
			</div>
		{/if}
	</div>
{/snippet}

<div
	bind:this={scroller}
	class="h-full w-full [scrollbar-gutter:stable] overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_1.5rem)] pt-4 pb-6"
>
	<div
		bind:this={content}
		class="mx-auto flex max-w-7xl flex-col gap-10 text-2xl text-black short:gap-8 short:text-xl"
	>
		<p class="mx-auto max-w-5xl">
			We can quantify how strong an acid is with the equilibrium constant:
		</p>

		<!-- acid starts in the middle (pushed right half a column + half the gap) then slides left -->
		<div class="grid grid-cols-2 gap-x-(--gap) gap-y-2 [--gap:4rem] short:[--gap:2.5rem]">
			<div
				class="transition-transform duration-700 ease-in-out"
				style:transform={split ? 'none' : 'translateX(calc(50% + var(--gap) / 2))'}
			>
				{@render panel(panels[0])}
			</div>
			{#if split}
				<div in:fade={{ delay: 600 }}>{@render panel(panels[1])}</div>
			{/if}

			{#if done(panels[1])}
				<p in:fade={{ delay: 1000 }} class="col-span-2 text-center text-xl text-subtext0">
					{@html chem('(products over reactants)')}
				</p>
			{/if}
		</div>

		{#if done(panels[1]) && !showP}
			<div in:fade={{ delay: 1200 }} class="mx-auto">
				<ArrowButton onclick={() => (showP = true)} />
			</div>
		{/if}

		<!-- pKa + pKb-->
		{#if showP}
			<div in:fade class="mx-auto flex max-w-5xl flex-col gap-6 leading-relaxed">
				<hr class="divider" />
				<p>We can use logs to avoid scientific notation (like with pH/pOH):</p>
				<!-- ka left, kb right. only the p's and k's are coloured -->
				<div class="flex justify-center gap-10">
					<div class="eqs">
						<p>
							<b class="text-red">pK<sub>a</sub></b> = −log
							<span class="text-red">K<sub>a</sub></span>
						</p>
						<p>
							<span class="text-red">K<sub>a</sub></span> = 10<sup
								>−<span class="text-red">pK<sub>a</sub></span></sup
							>
						</p>
					</div>
					<div class="eqs">
						<p>
							<b class="text-blue">pK<sub>b</sub></b> = −log
							<span class="text-blue">K<sub>b</sub></span>
						</p>
						<p>
							<span class="text-blue">K<sub>b</sub></span> = 10<sup
								>−<span class="text-blue">pK<sub>b</sub></span></sup
							>
						</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.divider {
		border-top: 3px solid var(--color-text);
		border-radius: 9999px;
	}
	/* equations, a bit bigger */
	.eqs {
		display: flex;
		flex-direction: column;
		align-items: center;
		align-self: center;
		gap: 0.25rem;
		font-size: 1.15em;
		padding: 0.75rem 2.5rem;
	}
	/* google docs ish: on ~half a second, off ~half a second */
	.blink {
		animation: blink 1.06s step-end infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
</style>
