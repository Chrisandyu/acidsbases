<script lang="ts">
	import type { Color } from '$lib/palette';
	import Charge from './Charge.svelte';

	type Props = {
		symbol: string;
		x: number;
		y: number;
		r: number;
		color: Color;
		// atom charge like H+ or Cl−
		charge?: string;
	};

	let { symbol, x, y, r, color, charge }: Props = $props();

	const id = $props.id();
	const c = $derived(`var(--color-${color})`);
	const dark = $derived(`color-mix(in oklab, ${c}, black 40%)`);
</script>

<g transform="translate({x} {y})" class="select-none">
	<clipPath {id}><circle {r} /></clipPath>

	<!-- shadow-->
	<circle {r} fill={c} />
	<circle
		cx={-r * 0.2}
		cy={-r * 0.2}
		r={r * 0.95}
		fill="color-mix(in oklab, {c}, white 30%)"
		clip-path="url(#{id})"
	/>
	<circle {r} fill="none" stroke={dark} stroke-width="3" />

	<text
		text-anchor="middle"
		dominant-baseline="central"
		font-size={r * 0.8}
		font-weight="800"
		fill="white"
		stroke={dark}
		stroke-width="3"
		paint-order="stroke"
	>
		{symbol}
	</text>

	{#if charge}
		<!-- right of symbol, raised like superscript -->
		<Charge text={charge} x={r * (0.28 * symbol.length + 0.3)} y={-r * 0.4} size={r * 0.75} />
	{/if}
</g>
