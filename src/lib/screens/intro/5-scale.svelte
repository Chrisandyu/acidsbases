<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Tween } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import Button from '$lib/components/Button.svelte';
	import { chem } from '$lib/chem';
	import { phColor } from '$lib/palette';
	import stomach from '$lib/assets/stomach.png';
	import vinegar from '$lib/assets/vinegar.png';
	import ammonia from '$lib/assets/ammonia.png';
	import bleach from '$lib/assets/bleach.png';
	import drain from '$lib/assets/draincleaner.png';

	// icon is an emoji/image from assets. small shrinks the image
	type Thing = {
		name: string;
		pH: number;
		icon: string;
		img?: boolean;
		small?: boolean;
		up: boolean;
	};

	const things: Thing[] = [
		{ name: 'battery acid', pH: 0.8, icon: '🔋', up: false },
		{ name: 'stomach acid', pH: 1.5, icon: stomach, img: true, up: true },
		{ name: 'lemon juice', pH: 2.2, icon: '🍋', up: false },
		{ name: 'vinegar', pH: 2.9, icon: vinegar, img: true, up: true },
		{ name: 'orange juice', pH: 3.5, icon: '🍊', up: false },
		{ name: 'tomato', pH: 4.3, icon: '🍅', up: true },
		{ name: 'coffee', pH: 5, icon: '☕', up: false },
		{ name: 'milk', pH: 6.6, icon: '🥛', up: true },
		{ name: 'pure water', pH: 7, icon: '💧', up: false },
		{ name: 'blood', pH: 7.4, icon: '🩸', up: true },
		{ name: 'seawater', pH: 8.1, icon: '🌊', up: false },
		{ name: 'baking soda', pH: 8.3, icon: '🧁', up: true },
		{ name: 'soap', pH: 10, icon: '🧼', up: false },
		{ name: 'antacid', pH: 10.5, icon: '💊', up: true },
		{ name: 'ammonia', pH: 11.6, icon: ammonia, img: true, up: false },
		{ name: 'bleach', pH: 12.5, icon: bleach, img: true, up: true },
		{ name: 'drain cleaner', pH: 14, icon: drain, img: true, small: true, up: false }
	];
	// appears after lcick
	const hcl: Thing = { name: 'concentrated HCl', pH: -1.1, icon: '🧪', up: true };

	let ended = $state(false);
	const shown = $derived(ended ? [hcl, ...things] : things);

	// left end of the scale, goes to −2 at the end to make room under 0
	const lo = new Tween(0, { duration: 1500, easing: cubicInOut });
	const blocks = Array.from({ length: 17 }, (_, i) => i - 2);
	const span = $derived(15 - lo.current);
	// pH -> %, each number is in the middle oif its block
	const at = (p: number) => ((p - lo.current + 0.5) / span) * 100;

	const marker = new Tween(7, { duration: 800, easing: cubicInOut });
	const pH = $derived(marker.current);

	// you MUST move it.
	let moved = $state(false);

	function move(p: number, duration = 800) {
		const to = Math.round(Math.min(14, Math.max(lo.target, p)) * 10) / 10;
		marker.set(to, { duration });
		moved = true;
	}

	// drag on bar
	let bar = $state<HTMLDivElement>();
	let dragging = false;
	function drag(e: PointerEvent) {
		const box = bar!.getBoundingClientRect();
		move(((e.clientX - box.left) / box.width) * span + lo.current - 0.5, 0);
	}

	// end: scale grows left, then the marker goes off the bottom to HCl
	async function end() {
		ended = true;
		await lo.set(-2);
		move(hcl.pH, 1500);
	}

	const h = $derived(10 ** -pH);
	const oh = $derived(10 ** (pH - 14));

	// whole number, 3 sig figs then zeros
	function full(n: number) {
		const digits = Math.floor(Math.log10(n)) + 1;
		if (digits <= 3) return Math.round(n).toLocaleString();
		return (
			BigInt(Math.round(n / 10 ** (digits - 3))) *
			10n ** BigInt(digits - 3)
		).toLocaleString();
	}
	// H3O+ : OH−, 2 sig figs
	function ratio() {
		const r = h / oh;
		const two = (n: number) => full(Number(n.toPrecision(2)));
		return r >= 1 ? `${two(r)} : 1` : `1 : ${two(1 / r)}`;
	}
</script>

{#snippet thing(t: Thing)}
	<button
		in:fade={{ duration: 600 }}
		onclick={() => move(t.pH)}
		style:left="{at(t.pH)}%"
		style:--c={phColor(t.pH)}
		class="absolute flex w-24 -translate-x-1/2 items-center gap-1 select-none short:w-20 {t.up
			? 'bottom-2 flex-col short:bottom-1'
			: 'top-2 flex-col-reverse short:top-1'}"
	>
		<span class="text-center text-[1rem] leading-tight text-black short:text-sm"
			>{@html chem(t.name)}</span
		>
		<span
			class="grid size-16 place-items-center rounded-full bg-[color-mix(in_oklab,var(--c)_35%,white)] text-3xl short:size-10 short:text-xl"
		>
			{#if t.img}
				<img
					src={t.icon}
					alt=""
					class="object-contain {t.small ? 'size-8 short:size-6' : 'size-10 short:size-7'}"
				/>
			{:else}
				{t.icon}
			{/if}
		</span>
	</button>
{/snippet}

<div class="flex h-full w-full flex-col items-center justify-center gap-6 short:gap-2">
	<!-- pH label -->
	<div
		style:background-color={phColor(pH)}
		class="w-44 rounded-2xl py-3 text-center text-4xl font-bold text-white tabular-nums shadow-sm short:w-32 short:py-1.5 short:text-2xl"
	>
		pH {pH.toFixed(1)}
	</div>

	<div class="relative w-full">
		<!-- above bar -->
		<div class="relative h-32 short:h-20">
			{#each shown.filter((t) => t.up) as t (t.name)}
				{@render thing(t)}
			{/each}
			<!-- acidic + basic on corners -->
			<span class="absolute bottom-1 left-1 text-lg font-semibold text-red short:text-sm"
				>acidic</span
			>
			<span class="absolute right-1 bottom-1 text-lg font-semibold text-mauve short:text-sm"
				>basic</span
			>
		</div>

		<!-- bar -->
		<div
			bind:this={bar}
			role="presentation"
			onpointerdown={(e) => {
				dragging = true;
				bar!.setPointerCapture(e.pointerId);
				drag(e);
			}}
			onpointermove={(e) => dragging && drag(e)}
			onpointerup={() => (dragging = false)}
			class="relative h-16 cursor-ew-resize touch-none select-none short:h-10"
		>
			<div class="absolute inset-0 overflow-hidden rounded-xl">
				{#each blocks as n (n)}
					<div
						style:left="{at(n) - 50 / span}%"
						style:width="{100 / span}%"
						style:background-color={phColor(n)}
						class="absolute inset-y-0 grid place-items-center text-3xl font-bold text-white short:text-xl"
					>
						{String(n).replace('-', '−')}
					</div>
				{/each}
			</div>
			<!-- marker -->
			<div
				style:left="{at(pH)}%"
				style:width="{100 / span}%"
				class="pointer-events-none absolute inset-y-0 -translate-x-1/2 rounded-lg border-4 border-black"
			></div>
		</div>

		<!-- below the bar -->
		<div class="relative h-32 short:h-20">
			{#each shown.filter((t) => !t.up) as t (t.name)}
				{@render thing(t)}
			{/each}
		</div>
	</div>

	<!-- H3O vs OH ratio  -->
	<div class="mt-4 flex w-2/3 flex-col items-center gap-2 short:gap-1">
		<div class="flex h-6 w-full overflow-hidden rounded-full short:h-4">
			<div style:width="{(h / (h + oh)) * 100}%" class="bg-red"></div>
			<div class="flex-1 bg-blue"></div>
		</div>
		<p class="text-3xl whitespace-nowrap text-black tabular-nums short:text-xl">
			<!-- label -->
			<b class="text-red">{@html chem('H3O+')}</b> : <b class="text-blue">{@html chem('OH−')}</b> =
			{ratio()}
		</p>
	</div>

	<div class="min-h-24 w-full text-xl text-black short:min-h-16 short:text-[1rem]">
		{#if !ended}
			{#if moved}
				<div in:fade class="flex justify-center">
					<Button variant="ghost" size="sm" onclick={end}>→</Button>
				</div>
			{:else}
				<p class="text-center text-lg text-subtext0 short:text-sm">drag the marker to move on</p>
			{/if}
		{:else}
			<div in:fade={{ delay: 1500 }} class="flex flex-col gap-2 short:gap-1">
				<p>
					{@html chem(
						'Concentrated HCl is 12 M (pH = −log(12) = <text class="text-red-dark">−1.1</text>)'
					)}
				</p>
				<p class="text-lg text-subtext0 short:text-sm">
					Interesting case: superacids like magic acid (and also superbases) are so strong you can’t use the pH scale
					<br />We use the Hammett acidity function instead because of water's leveling effect
				</p>
			</div>
		{/if}
	</div>
</div>
