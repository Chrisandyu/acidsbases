<script lang="ts">
	// reversible = ⇌ (shorter reverse harpoon), otherwise plain →
	let { reversible = false }: { reversible?: boolean } = $props();
</script>

<!-- on reversible: forward arrow lifts + loses bottom barb, reverse slides in -->
<svg
	viewBox="0 0 64 28"
	class="w-16"
	fill="none"
	stroke="currentColor"
	stroke-width="3"
	stroke-linecap="round"
	stroke-linejoin="round"
>
	<g
		class="transition-transform duration-500"
		style:transform="translateY({reversible ? -4 : 0}px)"
	>
		<path d="M4 14 H58 L49 7" />
		<path d="M58 14 L49 21" class="transition-opacity duration-300" opacity={reversible ? 0 : 1} />
	</g>
	<path
		d="M48 19 H16 L25 26"
		class="transition-all duration-500"
		opacity={reversible ? 1 : 0}
		style:transform="translateX({reversible ? 0 : 8}px)"
	/>
</svg>
