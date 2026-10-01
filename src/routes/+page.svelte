<script lang="ts">
	import { modules } from '$lib/modules';
	import { tint } from '$lib/palette';
</script>

<svelte:head><title>Acids & Bases</title></svelte:head>

<main class="mx-auto max-w-4xl space-y-10 px-8 py-16">
	<h1 class="text-5xl font-bold">Acids & Bases</h1>

	<ol class="space-y-4">
		{#each modules as module (module.slug)}
			<li>
				<a
					href="/{module.slug}/{module.screens[0].slug}"
					class="relative block rounded-3xl bg-(--bg) px-8 py-6 transition-colors select-none hover:bg-[color-mix(in_oklab,var(--bg),white_10%)] active:top-0.5 active:bg-[color-mix(in_oklab,var(--bg),black_6%)]"
					style:--bg={tint(module.color)}
				>
					<h2 class="text-2xl font-semibold">{module.title}</h2>
				</a>
			</li>
		{/each}
	</ol>
</main>
