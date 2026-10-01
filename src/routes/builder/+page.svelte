<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import type { ComponentProps } from 'svelte';
	import type Atom from '$lib/components/Atom.svelte';
	import Molecule, { type Bond } from '$lib/components/Molecule.svelte';
	import { molecules } from '$lib/molecules';
	import { colors, type Color } from '$lib/palette';
	import { svgPoint } from '$lib/svg';

	let mode = $state<'atoms' | 'bonds'>('atoms');
	let atoms = $state<ComponentProps<typeof Atom>[]>([]);
	let bonds = $state<Bond[]>([]);
	let charge = $state('');
	let selected = $state<{ type: 'atom' | 'bond'; i: number } | null>(null);

	//
	let draft = $state<{ symbol: string; r: number; color: Color }>({
		symbol: '',
		r: 15,
		color: 'surface2'
	});
	let draftOrder = $state<1 | 2 | 3>(1);

	const atom = $derived(selected?.type === 'atom' ? atoms[selected.i] : draft);
	const order = $derived(selected?.type === 'bond' ? bonds[selected.i].order : draftOrder);

	let svg = $state<SVGSVGElement>();
	let drag: { dx: number; dy: number } | null = null;
	let drawing = false;

	function onBackground(e: PointerEvent) {
		if (selected) {
			selected = null;
			return;
		}
		const p = svgPoint(svg!, e);
		if (mode === 'atoms') {
			atoms.push({ ...draft, ...p });
		} else {
			bonds.push({ x1: p.x, y1: p.y, x2: p.x, y2: p.y, order: draftOrder });
			drawing = true;
			svg!.setPointerCapture(e.pointerId);
		}
	}

	function onAtom(e: PointerEvent, i: number) {
		e.stopPropagation();
		selected = { type: 'atom', i };
		const p = svgPoint(svg!, e);
		drag = { dx: p.x - atoms[i].x, dy: p.y - atoms[i].y };
		svg!.setPointerCapture(e.pointerId);
	}

	function onBond(e: PointerEvent, i: number) {
		e.stopPropagation();
		selected = { type: 'bond', i };
	}

	function onMove(e: PointerEvent) {
		const p = svgPoint(svg!, e);
		if (drawing) {
			bonds[bonds.length - 1].x2 = p.x;
			bonds[bonds.length - 1].y2 = p.y;
		}
		if (drag && selected) {
			atoms[selected.i].x = p.x - drag.dx;
			atoms[selected.i].y = p.y - drag.dy;
		}
	}

	function onUp() {
		const last = bonds[bonds.length - 1];
		//kill zero len bond
		if (drawing && last.x1 === last.x2 && last.y1 === last.y2) bonds.pop();
		drawing = false;
		drag = null;
	}

	function setOrder(n: 1 | 2 | 3) {
		if (selected?.type === 'bond') bonds[selected.i].order = n;
		else draftOrder = n;
	}

	function remove() {
		(selected!.type === 'atom' ? atoms : bonds).splice(selected!.i, 1);
		selected = null;
	}

	function toFront() {
		atoms.push(...atoms.splice(selected!.i, 1));
		selected = { type: 'atom', i: atoms.length - 1 };
	}

	function toBack() {
		atoms.unshift(...atoms.splice(selected!.i, 1));
		selected = { type: 'atom', i: 0 };
	}

	let loaded = $state('');

	function load() {
		const m: ComponentProps<typeof Molecule> = molecules[loaded as keyof typeof molecules];
		atoms = m.atoms.map((a) => ({ ...a }));
		bonds = (m.bonds ?? []).map((b) => ({ ...b }));
		charge = m.charge ?? '';
		selected = null;
	}

	function clear() {
		loaded = '';
		atoms = [];
		bonds = [];
		charge = '';
		selected = null;
	}

	function onKey(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || !selected) return;
		if (e.key === 'Delete' || e.key === 'Backspace') remove();
	}

	const code = $derived(
		[
			...(charge ? [`charge: '${charge}',`] : []),
			'atoms: [',
			atoms
				.map(
					(a) => `\t{ symbol: '${a.symbol}', x: ${a.x}, y: ${a.y}, r: ${a.r}, color: '${a.color}' }`
				)
				.join(',\n'),
			bonds.length ? '],\nbonds: [' : ']',
			...(bonds.length
				? [
						bonds
							.map(
								(b) => `\t{ x1: ${b.x1}, y1: ${b.y1}, x2: ${b.x2}, y2: ${b.y2}, order: ${b.order} }`
							)
							.join(',\n'),
						']'
					]
				: [])
		].join('\n')
	);
</script>

<svelte:window onkeydown={onKey} />
<svelte:head><title>Molecule builder · Acids & Bases</title></svelte:head>

<div class="flex h-dvh gap-8 p-8">
	<svg
		bind:this={svg}
		viewBox="-120 -120 240 240"
		class="aspect-square h-full rounded-3xl bg-mantle {mode === 'bonds' ? 'cursor-crosshair' : ''}"
		role="application"
		onpointerdown={onBackground}
		onpointermove={onMove}
		onpointerup={onUp}
	>
		<defs>
			<pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse" x="-5" y="-5">
				<circle cx="5" cy="5" r="0.6" fill="var(--color-surface2)" />
			</pattern>
		</defs>
		<rect x="-120" y="-120" width="240" height="240" fill="url(#dots)" />

		<!-- centr-->
		<g stroke="var(--color-black)" stroke-width="0.75" opacity="0.8" pointer-events="none">
			<line x1="-120" y1="0" x2="120" y2="0" />
			<line x1="0" y1="-120" x2="0" y2="120" />
		</g>

		<Molecule {atoms} {bonds} {charge} />

		<!-- invis shapes for clickyt -->
		{#if mode === 'atoms'}
			{#each bonds as bond, i (i)}
				<line
					role="button"
					tabindex="-1"
					x1={bond.x1}
					y1={bond.y1}
					x2={bond.x2}
					y2={bond.y2}
					stroke="transparent"
					stroke-width="12"
					class="cursor-pointer"
					onpointerdown={(e) => onBond(e, i)}
				/>
			{/each}
			{#each atoms as a, i (i)}
				<circle
					role="button"
					tabindex="-1"
					cx={a.x}
					cy={a.y}
					r={a.r}
					fill="transparent"
					class="cursor-grab"
					onpointerdown={(e) => onAtom(e, i)}
				/>
			{/each}
		{/if}

		{#if selected?.type === 'atom'}
			<circle
				cx={atoms[selected.i].x}
				cy={atoms[selected.i].y}
				r={atoms[selected.i].r + 5}
				fill="none"
				stroke="var(--color-text)"
				stroke-width="1.5"
				stroke-dasharray="4 3"
				pointer-events="none"
			/>
		{:else if selected?.type === 'bond'}
			<line
				x1={bonds[selected.i].x1}
				y1={bonds[selected.i].y1}
				x2={bonds[selected.i].x2}
				y2={bonds[selected.i].y2}
				stroke="var(--color-mauve)"
				stroke-width="16"
				stroke-linecap="round"
				opacity="0.25"
				pointer-events="none"
			/>
		{/if}
	</svg>

	<aside class="flex w-96 flex-col gap-6 overflow-y-auto pr-2">
		<h1 class="text-3xl font-bold">Molecule builder</h1>

		<div class="flex gap-3">
			<select bind:value={loaded} onchange={load} class="flex-1 rounded-xl bg-mantle px-4 py-2">
				<option value="" disabled>Load…</option>
				{#each Object.keys(molecules) as name (name)}
					<option value={name}>{name}</option>
				{/each}
			</select>
			<Button variant="ghost" onclick={clear}>New</Button>
		</div>

		<div class="grid grid-cols-2 gap-2">
			{#each ['atoms', 'bonds'] as const as m (m)}
				<button
					onclick={() => {
						mode = m;
						selected = null;
					}}
					class="rounded-xl py-2 font-bold capitalize {mode === m
						? 'bg-text text-base'
						: 'bg-mantle hover:bg-crust'}"
				>
					{m}
				</button>
			{/each}
		</div>

		{#if mode === 'bonds' || selected?.type === 'bond'}
			<section class="space-y-3">
				<h2 class="font-semibold">{selected ? 'Selected bond' : 'Next bond'}</h2>
				<div class="grid grid-cols-3 gap-2">
					{#each [1, 2, 3] as const as n (n)}
						<button
							onclick={() => setOrder(n)}
							class="rounded-xl py-2 font-bold {order === n
								? 'bg-text text-base'
								: 'bg-mantle hover:bg-crust'}"
						>
							{['Single', 'Double', 'Triple'][n - 1]}
						</button>
					{/each}
				</div>
			</section>
		{:else}
			<section class="space-y-3">
				<h2 class="font-semibold">{selected ? 'Selected atom' : 'Next atom'}</h2>

				<label class="flex items-center gap-3">
					<span class="w-16">Symbol</span>
					<input bind:value={atom.symbol} class="flex-1 rounded-xl bg-mantle px-4 py-2" />
				</label>

				<label class="flex items-center gap-3">
					<span class="w-16">Size</span>
					<input type="range" min="6" max="40" bind:value={atom.r} class="flex-1 accent-text" />
					<span class="w-8 text-right">{atom.r}</span>
				</label>

				<div class="grid grid-cols-10 gap-2">
					{#each colors as color (color)}
						<button
							onclick={() => (atom.color = color)}
							title={color}
							aria-label={color}
							class="aspect-square rounded-full {atom.color === color
								? 'ring-2 ring-text ring-offset-2 ring-offset-base'
								: ''}"
							style:background-color="var(--color-{color})"
						></button>
					{/each}
				</div>
			</section>
		{/if}

		{#if selected}
			<div class="flex flex-wrap gap-2">
				{#if selected.type === 'atom'}
					<Button variant="ghost" onclick={toFront}>Front</Button>
					<Button variant="ghost" onclick={toBack}>Back</Button>
				{/if}
				<Button color="red" onclick={remove}>Delete</Button>
			</div>
		{/if}

		<label class="flex items-center gap-3">
			<span class="w-16">Charge</span>
			<input
				bind:value={charge}
				placeholder="+, −, 2+"
				class="flex-1 rounded-xl bg-mantle px-4 py-2"
			/>
		</label>

		<section class="space-y-2">
			<div class="flex items-center justify-between">
				<h2 class="font-semibold">CODE</h2>
				<Button variant="ghost" onclick={() => navigator.clipboard.writeText(code)}>Copy</Button>
			</div>
			<pre class="overflow-x-auto rounded-2xl bg-mantle p-4 text-sm">{code}</pre>
		</section>
	</aside>
</div>
