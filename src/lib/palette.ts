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
