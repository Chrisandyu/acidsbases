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
  eric: {
  charge: 'ASSUME HYDROGEN      kjkjk=jjjjjj         ',
    atoms: [
  	{ symbol: 'ERIC', x: -7, y: -36, r: 40, color: 'teal' },
  	{ symbol: 'H', x: -73, y: -61, r: 16, color: 'red' },
  	{ symbol: 'O', x: 82, y: -74, r: 20, color: 'peach' },
  	{ symbol: 'C', x: -80, y: 23, r: 17, color: 'overlay2' },
  	{ symbol: 'S', x: 69, y: 39, r: 27, color: 'yellow-light' }
    ],
    bonds: [
  	{ x1: 29, y1: -46, x2: 73, y2: -67, order: 1 },
  	{ x1: -42, y1: -49, x2: -69, y2: -59, order: 1 },
  	{ x1: -27, y1: -7, x2: -79, y2: 20, order: 1 },
  	{ x1: 15, y1: -14, x2: 64, y2: 39, order: 1 }
    ]
  }
} satisfies Record<string, ComponentProps<typeof Molecule>>;
