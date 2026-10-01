<script lang="ts">
	import { fade } from 'svelte/transition';
	import { chem } from '$lib/chem';

	let { text }: { text: string } = $props();
</script>

<div class="grid text-center text-2xl">
	{#key text}
		<p class="col-start-1 row-start-1" transition:fade={{ duration: 400 }}>{@html chem(text)}</p>
	{/key}
</div>
