import type { ComponentProps } from 'svelte';
import type Molecule from './components/Molecule.svelte';

export const molecules = {
	ammonium: {
		charge: '+',
		atoms: [
			{ symbol: 'H', x: 0, y: -31, r: 14, color: 'teal' },
			{ symbol: 'H', x: -28, y: 12, r: 14, color: 'teal' },
			{ symbol: 'H', x: 28, y: 12, r: 14, color: 'teal' },
			{ symbol: 'N', x: 0, y: 0, r: 22, color: 'teal' },
			{ symbol: 'H', x: 0, y: 29, r: 14, color: 'teal' }
		]
	},
	water1: {
		atoms: [
			{ symbol: 'H', x: -25, y: 13, r: 15, color: 'lavender' },
			{ symbol: 'H', x: 25, y: 13, r: 15, color: 'lavender' },
			{ symbol: 'O', x: 0, y: -6, r: 22, color: 'red' }
		]
	},
	hydronium: {
		charge: '+',
		atoms: [
			{ symbol: 'H', x: 0, y: -38, r: 15, color: 'lavender' },
			{ symbol: 'H', x: -25, y: 13, r: 15, color: 'lavender' },
			{ symbol: 'H', x: 25, y: 13, r: 15, color: 'lavender' },
			{ symbol: 'O', x: 0, y: -6, r: 22, color: 'red' }
		]
	},
	hydrochloric: {
		atoms: [
			{ symbol: 'H', x: 24, y: -22, r: 15, color: 'lavender' },
			{ symbol: 'Cl', x: 0, y: 0, r: 21, color: 'pink' }
		]
	},

	methane: {
		atoms: [
			{ symbol: 'H', x: -4, y: -58, r: 14, color: 'pink' },
			{ symbol: 'H', x: 33, y: -10, r: 14, color: 'pink' },
			{ symbol: 'H', x: -38, y: -9, r: 15, color: 'pink' },
			{ symbol: 'C', x: -4, y: -25, r: 29, color: 'overlay2' },
			{ symbol: 'H', x: 1, y: 10, r: 14, color: 'pink' }
		]
	},
	hydroxide: {
		charge: '-',
		atoms: [
			{ symbol: 'O', x: 0, y: -6, r: 22, color: 'red' },
			{ symbol: 'H', x: 24, y: -24, r: 15, color: 'lavender' }
		]
  },
	ammonia: {
  	atoms: [
  		{ symbol: 'H', x: 0, y: -31, r: 14, color: 'lavender' },
  		{ symbol: 'H', x: -27, y: 12, r: 14, color: 'lavender' },
  		{ symbol: 'H', x: 28, y: 12, r: 14, color: 'lavender' },
  		{ symbol: 'N', x: 0, y: 0, r: 22, color: 'teal' }
  	]
  }
} satisfies Record<string, ComponentProps<typeof Molecule>>;
