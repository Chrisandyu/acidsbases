<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Accent } from '$lib/palette';

	type Props = {
		href?: string;
		onclick?: () => void;
		variant?: 'solid' | 'ghost';
		color?: Accent;
		size?: 'md' | 'sm';
		children: Snippet;
	};

	let {
		href,
		onclick,
		variant = 'solid',
		color = 'mauve',
		size = 'md',
		children
	}: Props = $props();

	//CREDIT: https://github.com/codrops/CreativeButtons/blob/master/css/component.css
	const style = $derived(
		variant === 'solid'
			? `--fill: color-mix(in oklab, var(--color-${color}), black 12%); --lip: color-mix(in oklab, var(--color-${color}), black 28%)`
			: '--fill: rgb(0 0 0 / 0.08); --lip: rgb(0 0 0 / 0.16)'
	);

	const classes = $derived(
		`relative inline-flex items-center gap-2 rounded-[5px] bg-(--fill) font-bold tracking-wider uppercase shadow-[0_6px_var(--lip)] select-none hover:top-0.5 hover:shadow-[0_4px_var(--lip)] active:top-1.5 active:shadow-[0_0_var(--lip)] ${variant === 'solid' ? 'text-white' : 'text-text'} ${size === 'md' ? 'px-8 py-3' : 'px-4 py-1.5 text-sm'}`
	);
</script>

{#if href}
	<a {href} class={classes} {style}>{@render children()}</a>
{:else}
	<button {onclick} class={classes} {style}>{@render children()}</button>
{/if}
