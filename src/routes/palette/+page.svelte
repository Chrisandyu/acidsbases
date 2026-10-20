<script lang="ts">
	import css from '../layout.css?raw';
	import Button from '$lib/components/Button.svelte';
	import { modules } from '$lib/modules';
	import { tint } from '$lib/palette';

	//--color-rosewater: #dc8a78;
	const colors = css
		.split('\n')
		//leadinng trailing spacce/tab
		.map((line) => line.trim())
		.filter((line) => line.startsWith('--color-'))
		.map((line) => {

		    //split first/second half into array
			const [name, value] = line.slice('--color-'.length).split(':');
			//remove whitespace and semicolon
			return { name, hex: value.split(';')[0].trim() };
		});
</script>

<svelte:head><title>Palette</title></svelte:head>

<main class="mx-auto max-w-6xl space-y-16 px-8 py-16">
	<h1 class="text-5xl font-bold">Palette</h1>

	<section class="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
		{#each colors as { name, hex } (name)}
			<div>
				<div class="h-20 rounded-2xl" style:background-color={hex}></div>
				<p class="mt-2 font-semibold">{name}</p>
				<p class="text-sm text-subtext0">{hex}</p>
			</div>
		{/each}
	</section>

	<section class="grid grid-cols-2 gap-4 lg:grid-cols-3">
		{#each modules as module (module.slug)}
			<div class="rounded-3xl p-6" style:background-color={tint(module.color)}>
				<p class="font-semibold">{module.title}</p>
				<p class="text-subtext0">{module.color}</p>
			</div>
		{/each}
	</section>

	<section class="flex flex-wrap gap-4">
		<Button color="red">Acid</Button>
		<Button color="green">Neutral</Button>
		<Button color="blue">Base</Button>
		<Button variant="ghost">Ghost</Button>
	</section>
</main>
