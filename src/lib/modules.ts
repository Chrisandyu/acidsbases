import type { Accent } from './palette';

export type Module = {
	slug: string;
	title: string;
	color: Accent;
	screens: { slug: string; title: string }[];
};

export const modules: Module[] = [
	{
		slug: 'intro',
		title: 'Acids and bases',
		color: 'red',
		screens: [
			{ slug: 'whathappening', title: 'What they do' },
			{ slug: 'conjugate', title: 'Conjugate pairs' },
			{ slug: 'auto', title: 'Autoionisation' },
			{ slug: 'ph', title: 'pH' },
			{ slug: 'scale', title: 'pH scale' },
			{ slug: 'quiz', title: 'Quiz' }
		]
	},
	{
		slug: 'strongweak',
		title: 'Strong vs weak',
		color: 'peach',
		screens: [{ slug: 'test', title: 'soooooo....' }]
	},
	{
		slug: 'buffers',
		title: 'Buffers',
		color: 'mauve',
		screens: [{ slug: 'test', title: 'blooooooood' }]
	},
	{
		slug: 'titrations',
		title: 'Titrations',
		color: 'blue',
		screens: [{ slug: 'test', title: 'titrations' }]
	},
	{
		slug: 'solubility',
		title: 'Solubility',
		color: 'sky',
		screens: [{ slug: 'test', title: 'solubility' }]
	},
	{
		slug: 'ocean',
		title: 'Ocean acidification',
		color: 'green',
		screens: [{ slug: 'hook', title: 'dissolving shells' }]
	}
];

// all screen url list
export const screenUrls = modules.flatMap((m) => m.screens.map((s) => `/${m.slug}/${s.slug}`));
