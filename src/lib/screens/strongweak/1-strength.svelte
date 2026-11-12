<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Tween } from 'svelte/motion';
	import { quintOut } from 'svelte/easing';
	import WaterField from '$lib/components/WaterField.svelte';
	import { chem } from '$lib/chem';

	// strong: every particle releases. weak: only a few do
	// main = what's left behind, part = what comes off (H+ for acids, OH- for bases)
	// pink = acid, orange = base
	type Box = { name: string; strong: boolean; main: string; part: string; partR: number };

	const acids: Box[] = [
		{ name: 'Strong acid', strong: true, main: 'pink', part: 'lavender', partR: 5 },
		{ name: 'Weak acid', strong: false, main: 'pink', part: 'lavender', partR: 5 }
	];
	const bases: Box[] = [
		{ name: 'Strong base', strong: true, main: 'peach', part: 'blue', partR: 6 },
		{ name: 'Weak base', strong: false, main: 'peach', part: 'blue', partR: 6 }
	];

	const mainR = 8;
	// water surface: 22% down each box, but always below the box name
	const waterTop = (height: number) => Math.max(height * 0.22, 44);

	// same "random" every load so the server and browser draw the same thing
	let seed = 7;
	const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

	// spread on a grid in the water, each one nudged randomly inside its cell so it doesn't look lined up.
	// jx, jy = the nudge (not too big, so neighbours don't pile up). angle = direction the part sits + flies off, dist = how far.
	// 60 made, only as many as fill the grid get drawn
	const makeParticles = () =>
		Array.from({ length: 60 }, (_, i) => ({
			jx: (random() - 0.5) * 0.7,
			jy: (random() - 0.5) * 0.7,
			angle: random() * Math.PI * 2,
			dist: 32 + random() * 20, // far enough to clearly see it leave
			// the few that react in a weak one
			weakReacts: i % 11 === 4
		}));
	// each box gets its own, so all four look different
	const particles = Object.fromEntries(
		[...acids, ...bases].map((box) => [box.name, makeParticles()])
	);
	const target = 30; // about how many per box

	// how far through releasing (0 -> 1) per box, by name. quintOut = shoots off fast then settles slowly, 2.2s total
	const release = Object.fromEntries(
		[...acids, ...bases].map((box) => [
			box.name,
			new Tween(0, { duration: 2200, easing: quintOut })
		])
	);

	// each box's height, for where its water surface goes
	const heights = $state<Record<string, number>>({});

	// one hover hint for the whole page, gone after the first hover
	let hovered = $state(false);
	// "how come?" side panel
	let why = $state(false);

	// css colour name -> fill + darker outline (canvas can't read css vars)
	const colours: Record<string, { fill: string; edge: string }> = {};
	function colour(name: string) {
		if (!colours[name]) {
			const hex = getComputedStyle(document.documentElement)
				.getPropertyValue(`--color-${name}`)
				.trim();
			const dark = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.6));
			colours[name] = { fill: hex, edge: `rgb(${dark.join()})` };
		}
		return colours[name];
	}

	function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, name: string) {
		const { fill, edge } = colour(name);
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fillStyle = fill;
		ctx.fill();
		ctx.lineWidth = 1;
		ctx.strokeStyle = edge;
		ctx.stroke();
	}

	// particles for one box, drawn into its water every frame.
	// anything that would poke above the (moving) surface gets pushed back under it
	function particlesFor(box: Box) {
		return (ctx: CanvasRenderingContext2D, top: (x: number) => number) => {
			const width = ctx.canvas.clientWidth;
			const height = ctx.canvas.clientHeight;
			const t = release[box.name].current;
			const near = mainR + box.partR * 0.6;
			const water = waterTop(height);
			// same gap on all 4 sides, then a grid shaped like the water so the spacing is even both ways
			const pad = mainR + 10;
			const w = width - 2 * pad;
			const d = height - water - 2 * pad;
			// whole rows only, so there's no empty corner
			const cols = Math.max(1, Math.round(Math.sqrt((target * w) / d)));
			const rows = Math.max(1, Math.round(target / cols));
			particles[box.name].slice(0, cols * rows).forEach((p, i) => {
				const go = box.strong || p.weakReacts ? t : 0;
				const cos = Math.cos(p.angle);
				const sin = Math.sin(p.angle);
				const shift = Math.floor(i / cols) % 2 ? 0.25 : -0.25; // every other row shifted, so the columns don't line up
				const x = pad + ((i % cols) + 0.5 + shift + p.jx) * (w / cols) - cos * 3 * go;
				const cy = water + pad + (Math.floor(i / cols) + 0.5 + p.jy) * (d / rows);
				const y = Math.max(cy - sin * 3 * go, top(x) + mainR + 4);
				const px = x + cos * (near + p.dist * go);
				const py = Math.min(
					Math.max(y + sin * (near + p.dist * go), top(px) + box.partR + 4),
					height - box.partR - 2
				);
				dot(ctx, x, y, mainR, box.main);
				dot(ctx, px, py, box.partR, box.part);
			});
		};
	}
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (why = false)} />

{#snippet water(box: Box)}
	<div
		role="presentation"
		onpointerenter={() => {
			release[box.name].set(1);
			hovered = true;
		}}
		onpointerleave={() => release[box.name].set(0)}
		bind:clientHeight={heights[box.name]}
		class="relative min-h-0 flex-1 overflow-hidden rounded-2xl border-2 border-black/10 bg-white/30"
	>
		<WaterField
			level={heights[box.name] ? waterTop(heights[box.name]) : 0}
			draw={particlesFor(box)}
		/>
		<p
			class="absolute inset-x-0 top-3 text-xl font-bold short:top-2 short:text-lg {box.name.endsWith(
				'acid'
			)
				? 'text-red'
				: 'text-blue'}"
		>
			{box.name}
		</p>
	</div>
{/snippet}

<!-- on short screens it pokes 1.5rem into main's padding above + below, more room for the water -->
<div class="flex h-full w-full short:h-[calc(100%+3rem)]">
	<div
		class="mx-auto flex h-full w-full max-w-[90rem] min-w-0 flex-col gap-6 py-2 text-center text-black short:max-w-[78rem] short:gap-3"
	>
		<div class="grid min-h-0 flex-1 grid-cols-2 gap-x-10 short:gap-x-8">
			<!-- acids: name, definition right under it, then strong + weak -->
			<div class="flex min-h-0 flex-col gap-5 short:gap-4">
				<div>
					<p class="text-2xl font-bold text-red short:text-xl">Strong acid</p>
					<p class="text-xl short:text-lg">100% of the molecules give a proton to water</p>
				</div>
				{#each acids as box (box.name)}{@render water(box)}{/each}
			</div>
			<!-- bases -->
			<div class="flex min-h-0 flex-col gap-5 short:gap-4">
				<div>
					<p class="text-2xl font-bold text-blue short:text-xl">Strong base</p>
					<p class="text-xl short:text-lg">
						{@html chem('100% of the molecules produce OH-')}
						<span class="ml-1 whitespace-nowrap"
							>(<button onclick={() => (why = !why)} class="text-blue underline underline-offset-4"
								>how come?</button
							>)</span
						>
					</p>
				</div>
				{#each bases as box (box.name)}{@render water(box)}{/each}
			</div>
		</div>

		<!-- hint on the same line, saves a row -->
		<p class="text-xl text-subtext0 short:text-lg">
			Weak acids and bases only partly convert
			{#if !hovered}<span out:fade class="ml-3 text-[1rem] short:text-sm"
					>(hover over the boxes)</span
				>{/if}
		</p>
	</div>

	<!-- how come? slides in from the right and pushes the boxes over, so nothing gets covered -->
	<aside
		class="shrink-0 overflow-hidden transition-[width] duration-500 ease-out {why
			? 'w-[32rem] short:w-[28rem]'
			: 'w-0'}"
	>
		<div
			class="ml-8 flex h-full w-[30rem] flex-col gap-3 overflow-y-auto border-l-3 border-black/15 py-2 pr-2 pl-7 text-left text-lg leading-relaxed text-black short:w-[26rem] short:pl-5 short:text-[1rem]"
		>
			<div class="flex items-start justify-between gap-4">
				<p class="text-2xl font-bold text-blue short:text-xl">
					{@html chem('Don’t bases accept H+?')}
				</p>
				<button onclick={() => (why = false)} aria-label="close" class="text-2xl text-subtext0"
					>×</button
				>
			</div>
			<p>Sort of:</p>
			<p>
				{@html chem(
					'The bronsted lowry def of a base is that it accepts H+. However, strong bases make OH- in two different ways:'
				)}
			</p>

			<p class="font-bold">{@html chem('1. They release OH-')}</p>
			<p class="eq">{@html chem('NaOH → Na+ + OH-')}</p>
			<p>
				{@html chem(
					'Nothing is accepted because NaOH just dissolves, so technically just OH- is the base. This is because OH will take H+ from any acid:'
				)}
			</p>
			<p class="eq">{@html chem('OH- + H3O+ → 2H2O')}</p>
			<p>{@html chem('(Na+ is a spectator ion)')}</p>

			<p class="font-bold">{@html chem('2. They take H+ from water and leave OH-')}</p>
			<p class="eq">{@html chem('O^2- + H2O → 2OH-')}</p>
			<p>
				{@html chem(
					'Here, the bronsted lowry def is followed, since O^2- takes a proton from water and makes OH- (Yes, OH- is also a base, but it’s just weaker. Every acid-base reaction will create a new acid and base [the concept of conjugate pairs]).'
				)}
			</p>
			<p>This definition includes both #1 and #2</p>

			<p class="font-bold">Why don’t acids have two ways?</p>
			<p>
				{@html chem(
					'The acid version of #1 would just be something that already has H3O+ and just releases it. They exist (frozen nitric acid, perchloric acid hydrates), but are pretty rare. Why?:'
				)}
			</p>
			<p>
				{@html chem('OH- pairs with metals like Na+ and Ba^2+, which are unreactive in solution.')}
			</p>
			<p>
				{@html chem(
					'H3O+ to pairs with anions, but unfortunately most anions are bases. This means that they’re gonna steal the H+ from H3O+ (this happens to weak acids!), so there’s no unit of H3O+ to give like there is with NaOH. Therefore, acids mostly just give H+ to water.'
				)}
			</p>
		</div>
	</aside>
</div>

<style>
	/* equations in the why panel */
	.eq {
		text-align: center;
		font-size: 1.15em;
	}
</style>
