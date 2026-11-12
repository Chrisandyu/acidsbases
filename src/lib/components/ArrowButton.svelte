<script lang="ts">
	import Button from './Button.svelte';
	import Arrow from './Arrow.svelte';

	// the "keep going" button, bigger + a real arrow so ppl actually see it
	let { onclick }: { onclick: () => void } = $props();
</script>

<Button variant="ghost" {onclick}><Arrow class="w-8" /></Button>
