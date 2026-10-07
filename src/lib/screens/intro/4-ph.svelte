<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Tween } from 'svelte/motion';
	import Button from '$lib/components/Button.svelte';
	import BeakerPour from '$lib/components/BeakerPour.svelte';
	import { chem } from '$lib/chem';

	// 0: dilute (need pH 4 to go on), 1: everything else
	let step = $state(0);

	// 0.01 mol of H3O+
	const mol = 0.01;
	let dilutions = $state(0);
	const maxDilutions = 5;
	const litres = $derived(0.1 * 10 ** dilutions);

	const decimal = (n: number) => '0.' + '0'.repeat(n - 1) + '1';

	// how full the beaker is after each dilution (1 = rim)
	const fills = [0.15, 0.25, 0.4, 0.65, 1.05, 2.2];

	let beaker = $state<SVGSVGElement>();

	// ANSWERS
	const checks = {
		times: (v: number) => v === 1000,
		log: (v: number) => v === -3,
		ph6: (v: number) => v === 22,
		calc: (v: number) => v >= 2.5 && v <= 2.53,
		sum: (v: number) => v === 14
	};
	type Key = keyof typeof checks;
	const answers = $state({ times: '', log: '', ph6: '', calc: '', sum: '' });
	const checked = $state({ times: false, log: false, ph6: false, calc: false, sum: false });
	const right = (key: Key) => checks[key](Number(answers[key].replace('−', '-')));
	const solved = (key: Key) => checked[key] && right(key);

	// multiple choice
	const ranges = ['1 and 2', '2 and 3', '3 and 4'];
	let range = $state<string | null>(null);

	let hint = $state(false);

	const pH = $derived(1 + dilutions);
	// colour changes while the water pours in
	const shownPH = Tween.of(() => pH, { duration: 1500 });

	const rows = $derived(
		Array.from({ length: dilutions + 1 }, (_, i) => ({
			conc: decimal(i + 1),
			power: `−${i + 1}`,
			pH: `${i + 1}`
		}))
	);

	//autoscroll
	let scroller = $state<HTMLDivElement>();
	let content = $state<HTMLDivElement>();
	$effect(() => {
		const watch = new ResizeObserver(() =>
			scroller!.scrollTo({ top: scroller!.scrollHeight, behavior: 'smooth' })
		);
		watch.observe(content!);
		return () => watch.disconnect();
	});
</script>

<!-- top: false when the question text is its own line above -->
{#snippet question(key: Key, before: string, wrong = 'not quite', top = true, feedback = true)}
	<form
		class="flex flex-wrap items-center gap-3 text-red"
		onsubmit={(e) => {
			e.preventDefault();
			checked[key] = true;
		}}
	>
		<span>{@html chem(before)}</span>
		<!-- locked once it's right -->
		<input
			bind:value={answers[key]}
			oninput={() => (checked[key] = false)}
			disabled={solved(key)}
			class="h-[1.4em] w-24 rounded-md border-2 border-black bg-white px-3 py-0 text-center leading-none outline-none focus:border-red disabled:opacity-60"
		/>
		{#if !solved(key)}
			<Button size="sm" color="maroon">check</Button>
		{/if}
	</form>
	{#if feedback}
		{@render miss(key, wrong)}
	{/if}
{/snippet}

<!-- wrong shows up where correct would -->
{#snippet miss(key: Key, wrong = 'not quite')}
	{#if checked[key] && !right(key)}
		<p class="text-red" in:fade>{wrong}</p>
	{/if}
{/snippet}

{#snippet correct(text: string)}
	<p in:fade>{@html chem(`<b class="text-green">Correct!</b> ${text}`)}</p>
{/snippet}

<BeakerPour {beaker} fill={fills[dilutions]} pH={shownPH.current} />

<!-- WATER -->
<div class="relative z-10 flex h-full w-full gap-12 short:gap-8">
	<!--fixed width-->
	<div class="flex w-[30rem] shrink-0 flex-col items-center gap-4 short:w-[26rem] short:gap-2">
		<!-- mol / volume = concentration-->
		<div class="flex items-center gap-3 text-xl text-black short:text-lg">
			<span class="flex flex-col items-center leading-tight">
				<span>{@html chem(`${mol} mol H3O+`)}</span>
				<span class="border-t-2 border-black px-1">
					{#key litres}
						<b in:fade>{litres.toLocaleString()} L</b>
					{/key}
					water
				</span>
			</span>
			<span>=</span>
			<b>{decimal(1 + dilutions)} M</b>
		</div>

		<!-- beaker w/btn -->
		<div class="flex flex-col items-center gap-3 short:gap-2">
			<!-- black glass -->
			<svg
				bind:this={beaker}
				viewBox="0 0 160 190"
				class="w-64 short:w-28"
				role="img"
				aria-label="beaker, pH {pH}"
			>
				<path
					d="M22 40 H30 V170 Q30 182 42 182 H118 Q130 182 130 170 V40 H138"
					fill="none"
					stroke="black"
					stroke-width="5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<text x="80" y="140" text-anchor="middle" font-size="22" font-weight="800" fill="black">
					pH {Number(pH.toFixed(2))}
				</text>
			</svg>

			<div class="whitespace-nowrap {dilutions < maxDilutions ? '' : 'invisible'}">
				<Button color="blue" size="sm" onclick={() => dilutions++}>water × 10</Button>
			</div>
		</div>

		<!-- sss -->
		<table class="mt-4 text-3xl short:mt-2 short:text-lg">
			<colgroup>
				<col style:width="calc(9ch + 2rem)" />
				<col style:width="calc(7ch + 2rem)" />
				<col style:width="calc(4ch + 2rem)" />
			</colgroup>
			<thead>
				<tr class="text-left text-xl whitespace-nowrap text-black short:text-lg">
					<th class="px-4 pb-1 font-normal">{@html chem('[H3O+] (M)')}</th>
					<th class="px-4 pb-1 font-normal">power of 10</th>
					<th class="px-4 pb-1 font-normal">pH</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row, i (row.conc)}
					<tr in:fade={{ duration: 400 }}>
						<td class="px-4 font-semibold tabular-nums">{row.conc}</td>
						<!-- power + pH go red together, a row at a time from the top -->
						<!-- only the power goes red, not the 10 -->
						<td class="px-4">
							10<sup
								class="transition-colors duration-500 {step >= 1 ? 'text-red' : ''}"
								style:transition-delay="{i * 250}ms">{row.power}</sup
							>
						</td>
						<td
							class="px-4 font-bold transition-colors duration-500 {step >= 1 ? 'text-red' : ''}"
							style:transition-delay="{i * 250}ms"
						>
							{row.pH}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- text apprs top to bottom -->
	<!-- pb so the btn not cut off -->
	<div
		bind:this={scroller}
		class="min-w-0 flex-1 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_1.5rem)] pt-4 pr-2 pb-6 text-2xl leading-relaxed text-black short:text-lg"
	>
		<div bind:this={content} class="flex flex-col gap-3">
			<p>
				{@html chem('Suppose a solution has [H3O+] = 0.1 M. An acid probably did this.<br>')}
				Watch the <b>pH</b> as you do 10x dilutions.
			</p>
			<hr class="divider" />

			{#if step === 0}
				{#if dilutions < 3}
					<p class="text-lg text-subtext0">dilute to pH 4 to move on</p>
				{:else}
					<div in:fade><Button variant="ghost" size="sm" onclick={() => step++}>→</Button></div>
				{/if}
			{/if}

			<!-- pattern -->
			{#if step >= 1}
				<div in:fade class="flex flex-col gap-3">
					<p>
						{@html chem(
							'pH is the <b>power of 10</b> with the sign reversed: 10<sup>−4</sup> M → pH 4.'
						)}
					</p>
					<p>
						{@html chem('A small change in pH is a big change in acidity.')}
					</p>
					{@render question(
						'times',
						'How many times more H3O+ is there at pH 1 than at pH 4?',
						'count the dilutions in between'
					)}
					{#if solved('times')}
						{@render correct('Three tenfold dilutions gets you from pH 1 to 4 (10*10*10 = 1000)')}
						<hr class="divider" />
					{/if}
				</div>
			{/if}

			<!-- naming it + log -->
			{#if solved('times')}
				<div in:fade class="flex flex-col gap-3">
					<p class="text-3xl short:text-2xl">{@html chem('<b>pH = −log[H3O+]</b>')}</p>
					<p class="text-lg text-subtext0 short:text-[1rem]">
						{@html chem('[H3O+] is usually abbreviated as [H+]')}
					</p>
					<!--<br>pH is really −log([H3O+] / 1 M), because you can’t take the log of something with units. -->
					<p><b>log(x)</b>: <i>10 to what power is equal to x?</i></p>
					{@render question('log', 'log(0.001) =')}
					{#if solved('log')}
						{@render correct('log(0.001) = log(10<sup>−3</sup>) = −3')}
						<hr class="divider" />
						<p in:fade class="text-red">Find the pH of a 0.0000000000000000000001 M solution.</p>
						{@render question('ph6', 'pH =', 'not quite', false)}
					{/if}
					{#if solved('ph6')}
						{@render correct('')}
						<hr class="divider" />
					{/if}
				</div>
			{/if}

			<!-- in-between values -->
			{#if solved('ph6')}
				<div in:fade class="flex flex-col gap-3">
					<p>Concentrations usually arent't exact powers of 10.</p>
					<p class="text-red">{@html chem('[H+] = 0.003 M. Its pH is between…')}</p>
					<div class="flex flex-wrap items-center gap-3">
						{#each ranges as r (r)}
							<Button
								variant={range === r && r === '2 and 3' ? 'solid' : 'ghost'}
								color="green"
								size="sm"
								onclick={() => range !== '2 and 3' && (range = r)}
							>
								{r}
							</Button>
						{/each}
					</div>
					{#if range && range !== '2 and 3'}
						<p class="text-red" in:fade>not quite</p>
					{/if}
					{#if range === '2 and 3'}
						{@render correct(
							'0.003 is between 0.01 (10<sup>−2</sup>) and 0.001 (10<sup>−3</sup>), so its pH is between 2 and 3.'
						)}
						<p in:fade class="mt-4 text-red">Use a calculator to find the exact pH:</p>
						{@render question('calc', 'pH =', 'not quite', false)}
					{/if}
					{#if solved('calc')}
						{@render correct('')}
						<hr class="divider" />
					{/if}
				</div>
			{/if}

			<!-- bases + pOH -->
			{#if solved('calc')}
				<div in:fade class="flex flex-col gap-3">
					<p>{@html chem('Bases are similar: <b>pOH = −log[OH−]</b>')}</p>
					<p class="mt-4">
						{@html chem('K<sub>w</sub> = [H3O+][OH−] = 1.0 × 10<sup>−14</sup> at 25 °C.')}
					</p>
					<p class="text-red">What is pH + pOH always equal to?</p>
					{@render question('sum', 'pH + pOH =', 'not quite', false, false)}
					<!-- hint -->
					{#if hint}
						<p in:fade class="text-lg text-subtext0">log(a × b) = log a + log b</p>
					{:else}
						<button
							class="w-fit text-left text-lg text-blue underline underline-offset-4"
							onclick={() => (hint = true)}
						>
							hint
						</button>
					{/if}
					{@render miss('sum')}
					{#if solved('sum')}
						{@render correct(
							'−log[H3O+] + (−log[OH−]) = −log(10<sup>−14</sup>), so <b>pH + pOH = 14</b> at 25 °C.'
						)}
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.divider {
		border-top: 3px solid var(--color-text);
		border-radius: 9999px;
		margin-top: 1.5rem;
		margin-bottom: 1.5rem;
	}
</style>
