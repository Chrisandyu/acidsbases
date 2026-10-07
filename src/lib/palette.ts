export const accents = [
	'rosewater',
	'flamingo',
	'pink',
	'mauve',
	'red',
	'maroon',
	'peach',
	'yellow',
	'green',
	'teal',
	'sky',
	'sapphire',
	'blue',
	'lavender'
] as const;
export type Accent = (typeof accents)[number];

export const colors = [
	...accents,
	...accents.map((a) => `${a}-light` as const),
	...accents.map((a) => `${a}-dark` as const),
	'overlay2',
	'overlay1',
	'overlay0',
	'surface2',
	'surface1',
	'surface0'
] as const;
export type Color = (typeof colors)[number];

export function tint(color: Accent): string {
	return `color-mix(in oklab, var(--color-${color}) 18%, var(--color-base))`;
}

// pH colours like universal indicator: red acid, green neutral, purple base
export const phStops: [number, Accent][] = [
	[0, 'red'],
	[3, 'peach'],
	[5, 'yellow'],
	[7, 'green'],
	[10, 'blue'],
	[14, 'mauve']
];

// css colour for a pH, under 0 goes from red to dark red at −2
export function phColor(pH: number): string {
	if (pH < 0)
		return `color-mix(in oklab, var(--color-red-dark) ${Math.min(1, -pH / 2) * 100}%, var(--color-red))`;
	const i = Math.max(
		1,
		phStops.findIndex(([at]) => at >= pH)
	);
	const [a, ca] = phStops[i - 1];
	const [b, cb] = phStops[i];
	const t = (pH - a) / (b - a);
	return `color-mix(in oklab, var(--color-${ca}) ${(1 - t) * 100}%, var(--color-${cb}))`;
}
