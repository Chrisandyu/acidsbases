<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import Atom from '$lib/components/Atom.svelte';
	import Charge from '$lib/components/Charge.svelte';
	import Molecule from '$lib/components/Molecule.svelte';
	import WaterField from '$lib/components/WaterField.svelte';
	import { chem } from '$lib/chem';
	import { molecules } from '$lib/molecules';

	const [hLeft, proton, oxygen] = molecules.water1.atoms;

	// left water gives a proton then right water takes it
	const giver = { x: 130, y: 80 };
	const taker = { x: 250, y: 80 };

	// path starts go,  down-right, pauyse,  arc to taker O
	const start = { x: giver.x + proton.x, y: giver.y + proton.y };
	const loose = { x: start.x + 10, y: start.y + 6 };
	const end = { x: taker.x + oxygen.x, y: taker.y + oxygen.y - 32 };

	const detach = new Tween(0, { duration: 600, easing: cubicInOut });
	const travel = new Tween(0, { duration: 1400, easing: cubicInOut });
	const plusMove = new Tween(0, { duration: 800, easing: cubicInOut });

	let charged = $state(false);

	const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

	// proton goes over and comes back
	$effect(() => {
		let alive = true;
		(async () => {
			while (alive) {
				await wait(1200);
				charged = true;
				await detach.set(1);
				await travel.set(1);
				await plusMove.set(1);
				await wait(2000);
				await plusMove.set(0);
				await travel.set(0);
				await detach.set(0);
				charged = false;
			}
		})();
		return () => (alive = false);
	});

	const x = $derived(
		start.x + (loose.x - start.x) * detach.current + (end.x - loose.x) * travel.current
	);
	const y = $derived(
		start.y +
			(loose.y - start.y) * detach.current +
			(end.y - loose.y) * travel.current -
			Math.sin(Math.PI * travel.current) * 14
	);

	const onH = $derived({ x: x + proton.r * 0.58, y: y - proton.r * 0.4 });
	const net = { x: taker.x + 40, y: taker.y - 49 };
	const plus = $derived({
		x: onH.x + (net.x - onH.x) * plusMove.current,
		y: onH.y + (net.y - onH.y) * plusMove.current,
		size: proton.r * 0.75 + (16 - proton.r * 0.75) * plusMove.current
	});

	// get bounding box of screen for water
	let surface = $state<HTMLDivElement>();
	let level = $state(0);
	function measure() {
		level = surface!.getBoundingClientRect().top;
	}
	$effect(measure);

	// lines fade in, click=skip
	const total = 3;
	let lines = $state(0);
	$effect(() => {
		let timer = setTimeout(function next() {
			lines++;
			if (lines < total) timer = setTimeout(next, 4000);
		}, 700);
		return () => clearTimeout(timer);
	});
</script>

<svelte:window onresize={measure} onclick={() => (lines = total)} />

<WaterField {level} />

<div class="relative z-10 flex h-full w-full flex-col">
	<!-- anim centered .above water-->
	<div class="flex justify-center">
		<svg
			viewBox="80 15 230 100"
			class="w-sm shrink-0 short:w-64"
			role="img"
			aria-label="one water passing a proton to another"
		>
			<Molecule atoms={[hLeft, oxygen]} charge={charged ? '−' : undefined} {...giver} />
			<Molecule {...molecules.water1} {...taker} />
			<Atom {...proton} {x} {y} />
			{#if charged}
				<Charge text="+" {...plus} />
			{/if}
		</svg>
	</div>

	<div bind:this={surface} class="mt-6 short:mt-3"></div>

	<!-- in the water -->
	<div
		class="mt-16 flex flex-col items-center gap-4 text-3xl text-black short:mt-6 short:gap-3 short:text-2xl"
	>
		<p class="line" class:hidden-line={lines < 1}>Water can steal a proton from itself</p>
		<p class="line" class:hidden-line={lines < 1}>
			{@html chem(
				'<b class="text-red">H2O</b>(l) + <b class="text-blue">H2O</b>(l) ⇌ H3O+(aq) + OH−(aq)'
			)}
		</p>
		<p class="line mt-15" class:hidden-line={lines < 2}>
			In pure water, <b>2 in every billion</b> molecules are ionised at equilibrium
		</p>

		<!-- K = [H3O+][OH−] / [H2O] , then cross out denom-->
		<div
			class="line mt-6 flex items-center gap-4 text-4xl short:mt-0 short:text-3xl"
			class:hidden-line={lines < 3}
		>
			<span class="font-bold">K</span>
			<span>=</span>
			<span class="relative flex flex-col items-center">
				<span>{@html chem('[H3O+][OH−]')}</span>
				<span class="relative border-t-2 border-black px-2">
					{@html chem('[H2O]<sup>2</sup>')}
					<span
						class="absolute top-[65%] -left-1 h-1 w-[calc(100%+0.5rem)] origin-left -rotate-6 rounded-full bg-red opacity-50 transition-transform delay-700 duration-500 {lines >=
						3
							? 'scale-x-100'
							: 'scale-x-0'}"
					></span>
				</span>
			</span>
			<span>=</span>
			<span>{@html chem('[H3O+][OH−]')}</span>
			<span>=</span>
			<b>1.0 × 10<sup>−14</sup></b>
			<span class="mx-3 text-xl text-subtext0 short:text-lg">at 25 °C</span>
		</div>

		<p class="line mt-4 text-xl text-subtext0 short:text-lg" class:hidden-line={lines < 3}>
			The reason pure solids and liquids are 1 is
			<a
				href="https://new.scielo.br/j/qn/a/FrbFh3xX7KL3DjrThWcTBgc/?format=html&lang=en&ilang=en"
				target="_blank"
				rel="noreferrer"
				class="text-blue underline underline-offset-4">a bit complicated</a
			>
		</p>
	</div>
</div>

<!-- above next next button -->
<p
	class="pointer-events-none fixed bottom-10 left-1/2 z-10 -translate-x-1/2 text-lg text-subtext0 transition-opacity duration-300 {lines <
	total
		? ''
		: 'opacity-0'}"
>
	click to skip
</p>

<style>
	.line {
		transition:
			opacity 500ms,
			translate 500ms;
	}
	.hidden-line {
		opacity: 0;
		translate: 0 0.5rem;
	}
</style>
