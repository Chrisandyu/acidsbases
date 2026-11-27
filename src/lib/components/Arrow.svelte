<script lang="ts">
	// reversible = ⇌ (both harpoons same length), otherwise plain →
	// class for size, w-16 default
	let { reversible = false, class: size = 'w-16' }: { reversible?: boolean; class?: string } =
		$props();

	// forward one sits in the middle alone, moves up to make room for the back one
	const y = $derived(reversible ? 10 : 14);
	const line = $derived(`M4 ${y} H58 L49 ${y - 7}`);
	const barb = $derived(`M58 ${y} L49 ${y + 7}`);
</script>

<!-- no css transforms in here, they made the bottom one blurry when zoomed out.
 going ⇌: bottom barb tucks in, line lifts, back harpoon draws out from the right. going → is the reverse -->
<svg
	viewBox="0 0 64 28"
	class={size}
	class:on={reversible}
	fill="none"
	stroke="currentColor"
	stroke-width="3"
	stroke-linecap="round"
	stroke-linejoin="round"
>
	<path class="line" d={line} style:d="path('{line}')" />
	<path class="barb" d={barb} style:d="path('{barb}')" pathLength="1" />
	<path class="back" d="M58 19 H4 L13 26" pathLength="1" />
</svg>

<style>
	/* dash 1 long, gap 2. offset 1.1 pushes it fully off the path so no round cap dot is left */
	.barb,
	.back {
		stroke-dasharray: 1 2;
	}
	.line,
	.barb {
		transition:
			d 0.55s cubic-bezier(0.65, 0, 0.35, 1) 0.25s,
			stroke-dashoffset 0.3s ease-out 0.7s;
	}
	.back {
		stroke-dashoffset: 1.1;
		transition: stroke-dashoffset 0.35s cubic-bezier(0.55, 0, 1, 0.45);
	}
	.on .barb {
		stroke-dashoffset: 1.1;
	}
	.on .line,
	.on .barb {
		transition:
			d 0.55s cubic-bezier(0.65, 0, 0.35, 1) 0.15s,
			stroke-dashoffset 0.25s ease-in;
	}
	.on .back {
		stroke-dashoffset: 0;
		transition: stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.45s;
	}
</style>
