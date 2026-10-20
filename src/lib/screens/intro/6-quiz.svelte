<script lang="ts">
	import { fade } from 'svelte/transition';
	import Button from '$lib/components/Button.svelte';
	import { chem } from '$lib/chem';

	// choice: pick one, number (one box), sci: a * 10^b
	type Part =
		| { kind: 'choice'; options: string[]; answer: number }
		| { kind: 'number'; check: (v: number) => boolean; unit?: string }
		| { kind: 'sci'; check: (v: number) => boolean; unit?: string };
	type Question = { text: string; part: Part; why: string };

	const between = (a: number, b: number) => (v: number) => v >= a && v <= b;

	// QUESTIONS
	const questions: Question[] = [
		{
			text: 'Which species is both the conjugate acid of OH- and the conjugate base of H3O+?',
			part: { kind: 'choice', options: ['H2O', 'H+', 'O^2-', 'H2O2'], answer: 0 },
			why: 'Adding H+ to OH- makes H2O<br>Taking H+ off H3O+ also makes H2O'
		},
		{
			text: 'Which of these can <b>never</b> act as a Brønsted–Lowry acid?',
			part: { kind: 'choice', options: ['NH3', 'HCO3-', 'Cl-', 'OH-'], answer: 2 },
			why: "Cl- has no hydrogen to give<br>The other optiions all have an H they can lose(in the right condition) even if they're usually bases"
		},
		{
			text: 'Ammonia autoionises in the same way as water. What are the products of NH3 + NH3?',
			part: {
				kind: 'choice',
				options: ['NH4+ + NH2-', 'NH4+ + OH-', 'N2 + 3H2', 'idk'],
				answer: 0
			},
			why: 'After an NH3 gives an H+:<br>NH3 + NH3 ⇌ NH4+ + NH2-'
		},
		{
			text: "Equal volumes of a pH 2.00 solution and a pH 4.00 solution are mixed. What's the pH?",
			part: { kind: 'number', check: between(2.28, 2.32) },
			why: '[H3O+] = (0.0100 + 0.000100) / 2 = 0.00505 M<br>pH = -log(H<sup>+</sup>) = <b>2.30</b><br>The concentrations should be averaged instead of the pH values'
		},
		{
			text: 'Normal rain has a pH of 5.6. An acid rain sample has pH 4.3. How many times more H3O+ does the acid rain have?',
			part: { kind: 'number', check: between(19, 21), unit: 'times' },
			why: '10<sup>5.6 − 4.3</sup> = 10<sup>1.3</sup> ≈ <b>20</b> times<br>Every unit of pH is a factor of 10, so 1.3 units is 10<sup>1.3</sup>'
		},
		{
			text: "In a solution, [H3O+] is one million times larger than [OH-]. What's the pH at 25 °C?",
			part: { kind: 'number', check: between(3.99, 4.01) },
			why: '[H3O+] = 10<sup>6</sup>[OH-]<br>[H3O+][OH-] = 10<sup>−14</sup><br>[H3O+]<sup>2</sup> = 10<sup>6</sup> × 10<sup>−14</sup> = 10<sup>−8</sup> (by substitution) <br>[H3O+] = 10<sup>−4</sup> M<br>pH = <b>4</b>'
		},
		{
			text: 'How many H3O+ ions are in a 250 mL glass of pure water at 25 °C?',
			part: {
				kind: 'sci',
				check: between(1.4e16, 1.6e16),
				unit: 'ions'
			},
			why: '0.250 L × 1.0 × 10<sup>−7</sup> M (pH 7) = 2.5 × 10<sup>−8</sup> mol</sup><br>2.5 × 10<sup>−8</sup> mol × 6.02 × 10<sup>23</sup> ions/mol = <b>1.5 × 10<sup>16</sup></b> ions'
		},
		{
			text: 'A solution of a substance X has a pH of 7.00 at 37 °C. K<sub>w</sub> = 2.4 × 10<sup>−14</sup> at 37 °C. Is X an acid, a base, or neither?',
			part: { kind: 'choice', options: ['acid', 'base', 'neither'], answer: 1 },
			why: '[H3O<sup>+</sup>][OH-] = K<sub>w</sub><br>At 37 °C neutral: <br>[H3O+] = [OH-] = √(2.4 × 10<sup>−14</sup>) = 1.55 × 10<sup>−7</sup> M<br>pH = -log[H<sup>+</sup>] = <b>6.81</b><br>pH 7.00 is above neutral so X is a <b>base</b>'
		}
	];

	// answers by question number
	const answers = $state<Record<string, string>>({});
	// check: marks right/wrong but no answer + possiblity of checking again
	// submit: shows answers + why

	// result after checking/submitting true -> right, falce -> wrong
	const marks = $state<Record<number, boolean>>({});
	let submitted = $state(false);

	//blank defaults to 0 but just in case...
	// check for XSS ??
	const num = (s: string | undefined) => (s ? Number(s) : NaN);

	function right(qs: number) {
		const part = questions[qs].part;
		const a = answers[qs];
		if (part.kind === 'choice') return Number(a) === part.answer;
		if (part.kind === 'number') return part.check(num(a));
		return part.check(num(a) * 10 ** num(answers[`${qs}-e`]));
	}

	// right are locked after checking
	const locked = (qs: number) => submitted || marks[qs] === true;
	// changing an answer clears  old mark
	function answer(key: string, qs: number, value: string) {
		answers[key] = value;
		delete marks[qs];
	}

	function check() {
		questions.forEach((howmanyengineersdoesittaketofixalightbulb, qs) => (marks[qs] = right(qs)));
	}

	let scroller = $state<HTMLDivElement>();
	function submit() {
		submitted = true;
		questions.forEach((potato, qs) => (marks[qs] = right(qs)));
		scroller.scrollTo({ top: 0, behavior: 'smooth' });
	}

	// box border after checking
	// special mark notation
	const mark = (qs: number) => (marks[qs] === undefined ? '' : marks[qs] ? 'border-green!' : 'border-red!');

	// colours for mcq option
	function optionTailwind(qs: number, option: number, correct: number) {
		const picked = answers[qs] === String(option);
		// right answer after submit
		if (submitted && option === correct) return 'bg-green-light/60 outline-green';
		// their pick after checking
		if (picked && marks[qs] === true) return 'bg-green-light/60 outline-green';
		if (picked && marks[qs] === false) return 'bg-red-light/50 outline-red';
		// their pick before checking
		if (picked) return 'bg-black/15 outline-black';
		// the are rest are faded once its submitted or locked
		if (submitted || marks[qs]) return 'bg-black/5 opacity-50 outline-transparent';
		return 'bg-black/5 outline-transparent hover:bg-black/10';
	}
</script>

{#snippet choice(qs: number, options: string[], correct: number)}
	<div class="grid grid-cols-2 gap-3 short:gap-2">
		{#each options as text, option (text)}
			{@const picked = answers[qs] === String(option)}
			<!--
			selected = black
			right wrong green red
		    -->
			<button
				onclick={() => answer(String(qs), qs, String(option))}
				disabled={locked(qs)}
				class="relative rounded-xl px-4 py-3 text-center outline-3 -outline-offset-1 transition-[background-color,outline-color,opacity] duration-200 short:py-2
				{optionTailwind(qs, option, correct)}"
			>
				<span>{@html chem(text)}</span>
				<!-- your answer text -->
				{#if submitted && picked}
					<span
						in:fade
						class="absolute top-1/2 right-4 -translate-y-1/2 text-center text-sm leading-tight text-black"
						>your<br />answer</span
					>
				{/if}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet box(key: string, qs: number, width = 'w-44')}
    <!--delete mark so borders are gone after changing ans -->
	<input
		bind:value={answers[key]}
		oninput={() => delete marks[qs]}
		disabled={locked(qs)}
		inputmode="decimal"
		class="h-12 {width} rounded-lg border-2 border-black bg-white px-4 py-0 text-center outline-none focus:border-red disabled:bg-white/60 short:h-10 {mark(
			qs
		)}"
	/>
{/snippet}

<!-- -mt-8 so the box goes up into the empty space under the title -->
<!-- all the questions top to bottom, checked at the end -->
<div
	bind:this={scroller}
	class="-mt-8 h-[calc(100%+2rem)] w-full overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)] py-6"
>
	<div class="mx-auto flex max-w-5xl flex-col text-2xl text-black short:text-xl">
		{#each questions as question, qs (qs)}
			{@const part = question.part}
			<section class="flex gap-6 short:gap-4">
				<!-- number turns into a tick / cross after checking -->
				<span
					class="grid size-12 shrink-0 place-items-center rounded-full text-2xl font-bold text-white transition-colors duration-500 short:size-10 short:text-xl
					{marks[qs] === undefined
						? 'bg-black'
						: marks[qs]
							? 'bg-green'
							: 'bg-red'}"
				>
					{#if marks[qs] === undefined}
						{qs + 1}
					{:else}
					<!--check or x -->
						<svg
							viewBox="0 0 24 24"
							class="size-7 short:size-6"
							fill="none"
							stroke="white"
							stroke-width="4"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d={marks[qs] ? 'M4 12.5 L9.5 18 L20 6' : 'M6 6 L18 18 M18 6 L6 18'} />
						</svg>
					{/if}
				</span>

				<div class="flex min-w-0 flex-1 flex-col gap-4 pt-1.5 short:gap-3 short:pt-1">
					<p>{@html chem(question.text)}</p>

					{#if part.kind === 'choice'}
						{@render choice(qs, part.options, part.answer)}
					{:else if part.kind === 'number'}
						<div class="flex items-center gap-3">
							{@render box(String(qs), qs)}
							{#if part.unit}<span>{part.unit}</span>{/if}
						</div>
					{:else}
						<div class="flex items-center gap-3">
							{@render box(String(qs), qs, 'w-32')}
							<span>× 10</span>
							<span class="-mt-8 short:-mt-6">{@render box(`${qs}-e`, qs, 'w-20')}</span>
							{#if part.unit}<span class="ml-2">{part.unit}</span>{/if}
						</div>
					{/if}

					<!-- explanation after submitting -->
					{#if submitted}
						<p
							in:fade={{ delay: qs * 80 }}
							class="rounded-xl border-l-4 px-5 py-3 text-xl leading-relaxed short:text-lg {marks[
								qs
							]
								? 'border-green bg-green-light/30'
								: 'border-red bg-red-light/25'}"
						>
							{@html chem(question.why)}
						</p>
					{/if}
				</div>
			</section>
			<hr class="divider" />
		{/each}

		{#if !submitted}
			<div class="flex items-center gap-6 pb-2">
				<Button variant="ghost" onclick={check}>check</Button>
				<Button color="maroon" onclick={submit}>submit</Button>
				<p class="text-lg text-subtext0 short:text-[1rem]">
					check shows questions you got wrong so you can try again<br /><text class="text-maroon"
						>submit</text
					> shows answers
				</p>
			</div>
		{/if}
	</div>
</div>

<!-- just a line -->
<style>
	.divider {
		border-top: 3px solid var(--color-text);
		border-radius: 9999px;
		margin-top: 2.5rem;
		margin-bottom: 2.5rem;
	}
</style>
