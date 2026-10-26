<script lang="ts">
	import { fade } from 'svelte/transition';
	import Button from '$lib/components/Button.svelte';
	import { chem } from '$lib/chem';
	import { onMount } from 'svelte';

	// clips in static/videos/blood/<name>.mp4
	// loop: repeats until  click. otherwise plays once then switches to next
	// clips with no file yet just show the background


  const steps = [
  	{ loop: 'flow', text: '<b class="text-protein">Proteins</b> inn blood keep their shape between pH 7.35 - 7.45', button: 'add acid' },
  	{ once: 'acid-nobuff', loop: 'denatured', text: 'a', button: 'add a buffer' },
  	{ loop: 'flow-buff', text: 'a', button: 'add acid' },
  	{ once: 'acid-buff', loop: 'flow-buff', text: 'a', button: 'add base' },
  	{ once: 'base-buff', loop: 'flow-buff', text: 'a', button: null }
  ];

  //videos to load
    const videoNames = [];
    steps.forEach((s) => {
        if(s.once) videoNames.push(s.once);
        if(!videoNames.includes(s.loop)) videoNames.push(s.loop);
    } )

	let step = $state(0);

	//which video is showing
	let current = $state('flow');
	// true while a play once clip is playing  (make buttons wait)
	let playing = $state(false);

	const videos: Record<string, HTMLVideoElement> = {};

	// switch clip
	function show(name: string) {
		videos[current].pause();
		current = name;
		// file not made yet (REMOVE LATER): the video failed to load
		if (videos[name].error) {
			playing = false;
			return;
		}

		//no press
		videos[name].currentTime = 0;
		videos[name].play();
	}

	function goTo(n: number) {
		step = n;
		const s = steps[n];
		if(s.once) {
		    playing = true;
			show(s.once);
		} else show(s.loop);
	}

	//effect reruns cause it looks for state inside functions??????
	onMount(() => goTo(0));

</script>

<!-- every clip stacked so no black flash when switching
fit height to screen -->
{#each videoNames as name (name)}
	<video
		bind:this={videos[name]}
		src="/videos/blood/{name}.mp4"
		loop={name === steps[step].loop}
		onended={() => {
		    show(steps[step].loop)
			playing = false;
		}}
		muted
		playsinline
		preload="auto"
		class="pointer-events-none fixed top-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 {current ===
		name ? '' : 'opacity-0'}"
	></video>
{/each}

<!-- text with hardcoded location from center -->
<div
	class="fixed top-[17.4vh] left-[calc(50%-63.4vh)] z-10 flex w-[68vh] flex-col items-start gap-[1.5vh] text-[2.6vh] leading-snug text-black"
>
	{#key step}
		<p in:fade>{@html chem(steps[step].text)}</p>
	{/key}
	{#if steps[step].button && !playing}
		<div in:fade>
			<Button color="mauve" size="sm" onclick={() => goTo(step + 1)}>{steps[step].button}</Button>
		</div>
	{/if}
</div>
