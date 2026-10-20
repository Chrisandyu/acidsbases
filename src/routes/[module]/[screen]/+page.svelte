<script lang="ts">
	import type { Component } from 'svelte';
	import { page } from '$app/state';
	import Button from '$lib/components/Button.svelte';
	import { modules, screenUrls } from '$lib/modules';
	import { tint } from '$lib/palette';

	// get all files in src/lib/screens
	const files = import.meta.glob<Component>('/src/lib/screens/*/*.svelte', {
		import: 'default',
		eager: true //important but i forgot why
	});
	// remove the number before the dash in the file name: 2-conjugate.svelte -> conjugate.svelte
	// if only files were not sorted alphabetically in the explorer...
	function removeNumber(path) {
		const folder = path.slice(0, path.lastIndexOf('/') + 1);
		const file = path.slice(folder.length);
		return folder + file.slice(file.indexOf('-') + 1);
	}
	//import component with filepath being the key, number prefix dropped
	const screens = Object.fromEntries(
		Object.entries(files).map(([path, c]) => [removeNumber(path), c])
	);


	const url = $derived(page.url.pathname); //http://localhost:5173/hello/hi
	//match to $lib/modules
	const module = $derived(modules.find((m) => m.slug === page.params.module));
	const step = $derived(module.screens.findIndex((s) => s.slug === page.params.screen));

	const Content = $derived(screens[`/src/lib/screens${url}.svelte`]);
	const i = $derived(screenUrls.indexOf(url));
</script>

<svelte:head><title>{module.screens[step].title}</title></svelte:head>

<div class="flex h-dvh flex-col overflow-hidden" style:background-color={tint(module.color)}>
	<!-- z-10 so screens can put things (like water) behind header + footer -->
	<header class="relative z-10 flex items-start justify-between gap-8 px-10 pt-8">
		<!--title group -->
		<a href="/" class="group block space-y-1">
			<span class="block text-subtext0 group-hover:opacity-90">{module.title}</span>
			<h1 class="text-4xl font-bold group-hover:opacity-90">{module.screens[step].title}</h1>
		</a>
		<!-- update progress bar so current screen ishighlighted? -->
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

	<!-- DO NOT TOUCH (unless i really need to) -->
	<main class="flex min-h-0 flex-1 items-center justify-center p-10">
		<Content />
	</main>

	<!--add a way to disabl e btns during animations? -->
	<footer class="relative z-10 flex justify-between px-10 pb-8">
		<Button href={screenUrls[i - 1] ?? '/'} variant="ghost">← Back</Button>
		<Button href={screenUrls[i + 1] ?? '/'} color={module.color}>Next →</Button>
	</footer>
</div>
