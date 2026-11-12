<script lang="ts">
	import type { Snippet } from 'svelte';

	// top over bottom. line is a bit thicker than the letters, em so it scales with the text
	let { top, bottom }: { top: Snippet; bottom: Snippet } = $props();
</script>

<span class="inline-flex flex-col items-center align-middle">
	<span class="px-2 pb-[0.12em]">{@render top()}</span>
	<span class="w-full border-t-[max(3px,0.1em)] border-current"></span>
	<!-- relative so stuff can be drawn over the bottom (auto page crosses it out) -->
	<span class="relative px-2 pt-[0.12em]">{@render bottom()}</span>
</span>
