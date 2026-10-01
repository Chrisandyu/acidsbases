<script lang="ts">
	import type { Component } from 'svelte';
	import { page } from '$app/state';
	import Button from '$lib/components/Button.svelte';
	import { modules, screenUrls } from '$lib/modules';
	import { tint } from '$lib/palette';

	// get all files in src/lib/screens
	const screens = import.meta.glob<Component>('/src/lib/screens/*/*.svelte', {
		import: 'default',
		eager: true //
	});
	//import component with filepath being the key

	const url = $derived(page.url.pathname); //http://localhost:5173/hello/hi
	const module = $derived(modules.find((m) => m.slug === page.params.module)!);
	const step = $derived(module.screens.findIndex((s) => s.slug === page.params.screen));
	const Content = $derived(screens[`/src/lib/screens${url}.svelte`]);
	const i = $derived(screenUrls.indexOf(url));
</script>

<svelte:head><title>{module.screens[step].title}</title></svelte:head>

<div class="flex h-dvh flex-col overflow-hidden" style:background-color={tint(module.color)}>
	<header class="flex items-start justify-between gap-8 px-10 pt-8">
		<div class="space-y-1">
			<a href="/" class="text-subtext0 hover:text-text">{module.title}</a>
			<h1 class="text-4xl font-bold">{module.screens[step].title}</h1>
		</div>
		<div class="flex gap-2 pt-2">
			{#each module.screens as screen, j (screen.slug)}
				<span
					class="size-3 rounded-full"
					style:background-color={j <= step
						? `var(--color-${module.color})`
						: 'var(--color-surface1)'}
				></span>
			{/each}
		</div>
	</header>

	<main class="flex min-h-0 flex-1 items-center justify-center p-10">
		<Content />
	</main>

	<footer class="flex justify-between px-10 pb-8">
		<Button href={screenUrls[i - 1] ?? '/'} variant="ghost">← Back</Button>
		<Button href={screenUrls[i + 1] ?? '/'} color={module.color}>Next →</Button>
	</footer>
</div>
