<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import Atom from '$lib/components/Atom.svelte';
	import Button from '$lib/components/Button.svelte';
	import Charge from '$lib/components/Charge.svelte';
	import Caption from '$lib/components/Caption.svelte';
	import Molecule from '$lib/components/Molecule.svelte';
	import { chem } from '$lib/chem';
	import { molecules } from '$lib/molecules';
	import { svgPoint } from '$lib/svg';

	const [proton, chlorine] = molecules.hydrochloric.atoms;
	const oxygen = molecules.water1.atoms[2];

	const hcl = { x: 130, y: 80 };
	const water = { x: 260, y: 80 };

	// The proton's path: start on HCl, pop off a little up-right, then arc over to water's O
	const start = { x: hcl.x + proton.x, y: hcl.y + proton.y };
	const loose = { x: start.x + 12, y: start.y - 8 };
	const end = { x: water.x + oxygen.x, y: water.y + oxygen.y - 32 };

	const detach = new Tween(0, { duration: 600, easing: cubicInOut });
	const travel = new Tween(0, { duration: 1400, easing: cubicInOut });

	const plusMove = new Tween(0, { duration: 800, easing: cubicInOut });

	let stage = $state(0);

	const captions = [
		'Hydrochloric acid is mixed with water',
		'HCl donates* a <b class="text-lavender"> proton </b> and becomes Cl-',
		'Water becomes H3O+'
	];
	const holds = [4000, 2000, 8000];
	const manualHold = 15000;

	const writing = `<b>Brønsted–Lowry</b> definitions:<br>
		<b class="text-red">Acid</b>: proton donor<br>
		<b class="text-blue">Base</b>: proton acceptor<br>
		<p class="mt-2 text-black">
		  In this reaction, HCl is an acid and water is a base <br>
		</p>
		`;

	let timer: ReturnType<typeof setTimeout>;
	let run = 0;

	async function goTo(n: number, manual = false) {
		clearTimeout(timer);
		const me = ++run;
		stage = n;
		if (n === 0) {
			detach.set(0, { duration: 0 });
			travel.set(0, { duration: 0 });
			plusMove.set(0, { duration: 0 });
		}
		if (n === 1) await detach.set(1);
		if (n === 2) {
			await travel.set(1);
			await plusMove.set(1);
		}
		if (me !== run) return;
		timer = setTimeout(() => goTo((n + 1) % captions.length), manual ? manualHold : holds[n]);
	}

	$effect(() => {
		goTo(0);
		return () => {
			clearTimeout(timer);
			run++;
		};
	});

	const x = $derived(
		start.x + (loose.x - start.x) * detach.current + (end.x - loose.x) * travel.current
	);
	const y = $derived(
		start.y +
			(loose.y - start.y) * detach.current +
			(end.y - loose.y) * travel.current -
			Math.sin(Math.PI * travel.current) * 12
	);

	const onH = $derived({ x: x + proton.r * 0.58, y: y - proton.r * 0.4 });
	const net = { x: water.x + 40, y: water.y - 49 };
	const plus = $derived({
		x: onH.x + (net.x - onH.x) * plusMove.current,
		y: onH.y + (net.y - onH.y) * plusMove.current,
		size: proton.r * 0.75 + (16 - proton.r * 0.75) * plusMove.current
	});

	let svg = $state<SVGSVGElement>();
	let mouse = { x: 0, y: 0 };

	function onKey(e: KeyboardEvent) {
		if (e.key !== 'c') return;
		console.log('svg', mouse);
		console.log('from water', { x: mouse.x - water.x, y: mouse.y - water.y });
		console.log('from HCl', { x: mouse.x - hcl.x, y: mouse.y - hcl.y });
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="flex h-full w-full flex-col gap-8">
	<div class="flex items-center justify-center gap-24">
		<svg
			bind:this={svg}
			viewBox="100 15 210 100"
			class="w-lg shrink-0"
			role="img"
			onpointermove={(e) => (mouse = svgPoint(svg!, e))}
		>
			<Molecule atoms={[{ ...chlorine, charge: stage >= 1 ? '−' : undefined }]} {...hcl} />
			<Molecule {...molecules.water1} {...water} />
			<Atom {...proton} {x} {y} />
			{#if stage >= 1}
				<Charge text="+" {...plus} />
			{/if}
		</svg>

		<div class="flex w-md flex-col items-center gap-4">
			<Caption text={captions[stage]} />
			<Button variant="ghost" size="sm" onclick={() => goTo((stage + 1) % captions.length, true)}>
				→
			</Button>
		</div>
	</div>

	<hr class="rounded-full border-t-4 border-text" />

	<div class="relative">
		<div class="text-center text-2xl leading-relaxed text-black">{@html chem(writing)}</div>
		<p class="absolute top-0 left-0 w-3xs text-left text-sm text-subtext0">
			*The proton moves across in one step, pulled by one of oxygen's lone pairs.
		</p>
	</div>
</div>
