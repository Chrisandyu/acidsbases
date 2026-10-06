<script lang="ts">
	import { fade } from 'svelte/transition';

	type Props = { text: string; x: number; y: number; size: number };

	let { text, x, y, size }: Props = $props();
</script>

<text
	{x}
	{y}
	text-anchor="middle"
	dominant-baseline="central"
	font-size={size}
	font-weight="700"
	fill="black"
	stroke="color-mix(in oklab, var(--color-yellow-light), white 45%)"
	stroke-width={size * 0.2}
	stroke-linejoin="round"
	paint-order="stroke"
	style="filter: drop-shadow(0 0 3px color-mix(in oklab, var(--color-yellow-light) 50%, transparent))"
	class="select-none"
	in:fade|global={{ duration: 300 }}
	out:fade={{ duration: 300 }}
>
	{text}
</text>
