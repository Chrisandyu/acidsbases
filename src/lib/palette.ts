/** Accent colors from layout.css */
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

/** Every color an atom can use: accents, their light and dark versions, and the greys */
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

/** Pale version of an accent, for backgrounds */
export function tint(color: Accent): string {
	return `color-mix(in oklab, var(--color-${color}) 18%, var(--color-base))`;
}
