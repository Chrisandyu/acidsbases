<script lang="ts" module>
	export type Bond = { x1: number; y1: number; x2: number; y2: number; order: 1 | 2 | 3 };
</script>

<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import Atom from './Atom.svelte';
	import Charge from './Charge.svelte';

	type Props = {
		atoms: ComponentProps<typeof Atom>[];
		bonds?: Bond[];
		/** NET MOLECULE CHARGE */
		charge?: string;
		chargeAt?: { x: number; y: number };
		x?: number;
		y?: number;
		scale?: number;
	};

	let { atoms, bonds = [], charge, chargeAt, x = 0, y = 0, scale = 1 }: Props = $props();

	//charge
	const right = $derived(Math.max(...atoms.map((a) => a.x + a.r)));
	const top = $derived(Math.min(...atoms.map((a) => a.y - a.r)));
	const at = $derived(chargeAt ?? { x: right + 4, y: top - 2 });

	function lines(b: Bond) {
		const length = Math.hypot(b.x2 - b.x1, b.y2 - b.y1) || 1;
		const nx = -(b.y2 - b.y1) / length;
		const ny = (b.x2 - b.x1) / length;
		const offsets = { 1: [0], 2: [-3.5, 3.5], 3: [-6, 0, 6] }[b.order];
		return offsets.map((o) => ({
			x1: b.x1 + nx * o,
			y1: b.y1 + ny * o,
			x2: b.x2 + nx * o,
			y2: b.y2 + ny * o
		}));
	}
</script>

<g transform="translate({x} {y}) scale({scale})">
	{#each bonds as bond, i (i)}
		{#each lines(bond) as l, j (j)}
			<line {...l} stroke="var(--color-text)" stroke-width="3" stroke-linecap="round" />
		{/each}
	{/each}

	{#each atoms as atom, i (i)}
		<Atom {...atom} />
	{/each}

	{#if charge}
		<Charge text={charge} x={at.x} y={at.y} size={16} />
	{/if}
</g>
