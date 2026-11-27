// molecules for the strong acid slide
// each one keeps its own atoms so when a proton moves nothing else does

type El = 'O' | 'H' | 'Cl';
type A = { el: El; x: number; y: number };
type Kind = 'water' | 'h3o' | 'oh' | 'hcl' | 'cl';

export type Mode = 'pure' | 'freeze' | 'acid';
export type View = {
	mode: Mode;
	zoom: { x: number; y: number; z: number };
	mouse: { x: number; y: number };
	depth: number; // px scrolled while in the water, back layer moves with it
	fall: number; // 0 -> 1 first hcl falling in
	hero: number; // 0 -> 1 its H going over to the water, follows the scroll
	acid: number; // 0 -> 1 the rest of the hcl
};

export const SEA = 0.46; // water line, share of window height

// same sizes + colours as molecules.ts
const look: Record<El, { r: number; color: string }> = {
	O: { r: 22, color: 'red' },
	H: { r: 15, color: 'lavender' },
	Cl: { r: 21, color: 'pink' }
};
// O or Cl always first, at 0,0
const water = (): A[] => [
	{ el: 'O', x: 0, y: 0 },
	{ el: 'H', x: -25, y: 19 },
	{ el: 'H', x: 25, y: 19 }
];
const hcl = (): A[] => [
	{ el: 'Cl', x: 0, y: 0 },
	{ el: 'H', x: 24, y: -22 }
];
const BOND = 31;

type Mol = {
	atoms: A[];
	x: number;
	y: number;
	vx: number;
	vy: number;
	hx: number;
	hy: number;
	rot: number;
	spin: number;
	phase: number;
	heading: number;
	age: number;
	life: number;
	busy: boolean;
	target: Mol | null;
	fade: number;
	drop: Drop | null; // the hcl this was
};
type Hop = {
	from: Mol;
	to: Mol;
	t: number;
	h: A;
	sx: number;
	sy: number;
	ex: number;
	ey: number;
	ra: number; // spin at start + end so the H letter turns smoothly
	rb: number;
	took: A; // the H as it was on "from", for putting it back
	scrub: 'fwd' | 'back' | null; // hero H moves with the scroll instead of the clock
};
// hcl follows the scroll. a = how far in, inside = landed and in the water
type Drop = {
	m: Mol;
	start: number;
	a: number;
	x: number;
	y: number;
	inside: boolean;
	turn: number; // spin by the time it lands
};
const POUR = 0.5; // share of the pour each one takes to fall

const TAU = Math.PI * 2;
const HOP = 0.7;
const FRONT = 0.66;
const BACK = 0.34;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (v: number) => v * v * (3 - 2 * v);
// goes towards want but at most rate per sec, so fast scrolling still plays it out
const toward = (v: number, want: number, rate: number) =>
	v + clamp(want - v, -rate, rate);

function kind(m: Mol): Kind {
	const hs = m.atoms.filter((a) => a.el === 'H').length;
	if (m.atoms[0].el === 'Cl') return hs ? 'hcl' : 'cl';
	return hs === 3 ? 'h3o' : hs === 2 ? 'water' : 'oh';
}
const charge: Record<Kind, string> = { water: '', hcl: '', h3o: '+', oh: '−', cl: '−' };

function rgb(name: string) {
	const hex = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
	return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
const css = (c: number[], alpha = 1) => `rgba(${c.map(Math.round).join()},${alpha})`;
const white = [255, 255, 255];
const black = [0, 0, 0];

export function createDive(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext('2d')!;
	const dpr = window.devicePixelRatio || 1;
	const font = getComputedStyle(document.body).fontFamily;
	const colors: Record<string, number[]> = {};
	const color = (name: string) => (colors[name] ??= rgb(name));

	let W = 0;
	let H = 0;
	let u = 1;
	let S = 1; // px per molecule unit
	let t = 0;
	let backSprite: HTMLCanvasElement | null = null;
	let back: { fx: number; fy: number; rot: number; phase: number; speed: number }[] = [];
	let mols: Mol[] = [];
	let hops: Hop[] = [];
	let drops: Drop[] = [];
	let pairTimer = 0.8;
	// first hcl, done slowly so u can see it. mate = the water it gives to
	let hero: Drop | null = null;
	let mate: Mol | null = null;
	let sitting = false;

	// same look as Atom.svelte
	function atom(g: CanvasRenderingContext2D, a: A, labels: boolean) {
		const { r, color: name } = look[a.el];
		const c = color(name);
		g.beginPath();
		g.arc(a.x, a.y, r, 0, TAU);
		g.fillStyle = css(c);
		g.fill();
		g.save();
		g.clip();
		g.beginPath();
		g.arc(a.x - r * 0.2, a.y - r * 0.2, r * 0.95, 0, TAU);
		g.fillStyle = css(mix(c, white, 0.3));
		g.fill();
		g.restore();
		g.beginPath();
		g.arc(a.x, a.y, r, 0, TAU);
		g.strokeStyle = css(mix(c, black, 0.4));
		g.lineWidth = 3;
		g.stroke();
		if (!labels) return;
		g.font = `800 ${r * 0.8}px ${font}`;
		g.textAlign = 'center';
		g.textBaseline = 'middle';
		g.lineJoin = 'round';
		g.strokeText(a.el, a.x, a.y);
		g.fillStyle = 'white';
		g.fillText(a.el, a.x, a.y);
	}

	// far away water, drawn once blurry then stamped
	function bakeBack() {
		const k = u * BACK * dpr;
		const size = Math.ceil(110 * k + 8 * dpr);
		const flat = document.createElement('canvas');
		flat.width = flat.height = size;
		const f = flat.getContext('2d')!;
		f.translate(size / 2, size / 2);
		f.scale(k, k);
		for (const a of water()) atom(f, a, false);
		const soft = document.createElement('canvas');
		soft.width = soft.height = size;
		const g = soft.getContext('2d')!;
		g.filter = `blur(${1.2 * dpr}px)`;
		g.drawImage(flat, 0, 0);
		return soft;
	}

	const toWorld = (m: Mol, a: { x: number; y: number }) => {
		const c = Math.cos(m.rot);
		const s = Math.sin(m.rot);
		return { x: m.x + (a.x * c - a.y * s) * S, y: m.y + (a.x * s + a.y * c) * S };
	};

	function drawMol(m: Mol, ox: number, oy: number) {
		const k = kind(m);
		const x = m.x + ox;
		const y = m.y + oy;
		ctx.globalAlpha = m.fade;
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(m.rot);
		ctx.scale(S, S);
		for (const a of m.atoms) if (a.el === 'H') atom(ctx, a, true);
		atom(ctx, m.atoms[0], true);
		ctx.restore();
		ctx.globalAlpha = 1;
		if (!charge[k]) return;
		// charge top right on screen, doesnt spin with it
		let right = -Infinity;
		let top = Infinity;
		for (const a of m.atoms) {
			const p = toWorld(m, a);
			const r = look[a.el].r * S;
			right = Math.max(right, p.x - m.x + r);
			top = Math.min(top, p.y - m.y - r);
		}
		const size = 26 * S;
		ctx.font = `700 ${size}px ${font}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.lineJoin = 'round';
		ctx.lineWidth = size * 0.25;
		ctx.strokeStyle = css(mix(color('yellow-light'), white, 0.45));
		ctx.strokeText(charge[k], x + right + 2 * S, y + top + 6 * S);
		ctx.fillStyle = 'black';
		ctx.fillText(charge[k], x + right + 2 * S, y + top + 6 * S);
	}

	// right side is for the nav
	const band = () => ({
		left: 50 * u,
		right: Math.max(W - 250 * u, 100 * u),
		top: H * SEA + 50 * u,
		bottom: H - 115 * u
	});

	const mol = (atoms: A[], x: number, y: number): Mol => ({
		atoms,
		x,
		y,
		vx: 0,
		vy: 0,
		hx: x,
		hy: y,
		rot: (Math.random() - 0.5) * 1.2,
		spin: (Math.random() - 0.5) * 0.15,
		phase: Math.random() * TAU,
		heading: Math.random() * TAU,
		age: 0,
		life: 2.5 + Math.random(),
		busy: false,
		target: null,
		fade: 0.6,
		drop: null
	});

	function populate() {
		mols = [];
		hops = [];
		drops = [];
		pairTimer = 0.8;
		sitting = false;
		// loose grid so nothing starts on top of something
		const b = band();
		const w = b.right - b.left;
		const d = b.bottom - b.top;
		const n = (w * d) / (125 * u) ** 2;
		const cols = Math.max(1, Math.round(Math.sqrt((n * w) / d)));
		const rows = Math.max(1, Math.round(n / cols));
		for (let r = 0; r < rows; r++)
			for (let c = 0; c < cols; c++) {
				const shift = r % 2 ? 0.25 : -0.25;
				const x = b.left + (c + 0.5 + shift + (Math.random() - 0.5) * 0.4) * (w / cols);
				const y = b.top + (r + 0.5 + (Math.random() - 0.5) * 0.4) * (d / rows);
				mols.push(mol(water(), x, y));
			}
		// hcl waiting above the screen, each one lands next to a water
		// first one goes near the middle under the text
		const off = (m: Mol) => Math.hypot(m.x - W / 2, m.y - b.top - 40 * u);
		mate = mols.reduce((a, m) => (off(m) < off(a) ? m : a));
		const free = mols.filter((m) => m !== mate);
		const count = Math.min(clamp(Math.round(W / 220), 4, 8), free.length + 1);
		for (let i = 0; i < count; i++) {
			const w = i ? free.splice(Math.floor(Math.random() * free.length), 1)[0] : mate;
			const side = i ? (Math.random() < 0.5 ? -1 : 1) : w.x > W / 2 ? -1 : 1;
			// hero a bit further off so u can see its H go across
			const gap = (i ? 70 : 150) * u;
			const m = mol(hcl(), clamp(w.x + side * gap, b.left, b.right), -60 * u);
			m.fade = 1;
			// hero lands with its H pointing at the water
			const turn = i ? 3 : (side > 0 ? Math.PI : 0) - Math.atan2(-22, 24) + TAU;
			const start = i ? ((i - 1) / Math.max(1, count - 1)) * (1 - POUR) : 0;
			const d: Drop = { m, start, a: 0, x: m.x, y: w.y, inside: false, turn };
			m.drop = d;
			drops.push(d);
		}
		hero = drops[0] ?? null;
		back = Array.from({ length: Math.round((W * H * (1 - SEA)) / (110 * u) ** 2) }, () => ({
			fx: Math.random(),
			fy: Math.random(),
			rot: Math.random() * TAU,
			phase: Math.random() * TAU,
			speed: (Math.random() - 0.5) * 16
		}));
	}

	function nearest(from: Mol, k: Kind, within = Infinity) {
		let best: Mol | null = null;
		let far = within;
		for (const m of mols) {
			if (m === from || m.busy || kind(m) !== k) continue;
			const d = Math.hypot(m.x - from.x, m.y - from.y);
			if (d < far) [best, far] = [m, d];
		}
		return best;
	}

	// proton from -> to. the H closest to "to" leaves and lands on the side of "to" facing it
	function hop(from: Mol, to: Mol, scrub: Hop['scrub'] = null) {
		from.busy = to.busy = true;
		from.target = to.target = null;
		let h = from.atoms[1];
		let best = Infinity;
		for (const a of from.atoms) {
			if (a.el !== 'H') continue;
			const p = toWorld(from, a);
			const d = Math.hypot(p.x - to.x, p.y - to.y);
			if (d < best) [h, best] = [a, d];
		}
		const start = toWorld(from, h);
		from.atoms = from.atoms.filter((a) => a !== h);
		// keep the shapes right. OH- -> bent water (105° from its H), water -> H3O+ (H goes in the biggest gap)
		const face = Math.atan2(from.y - to.y, from.x - to.x) - to.rot;
		const taken = to.atoms.filter((a) => a.el === 'H').map((a) => Math.atan2(a.y, a.x));
		const diff = (a: number, b: number) =>
			Math.abs(((((a - b) % TAU) + TAU * 1.5) % TAU) - Math.PI);
		let ang = face;
		if (taken.length === 1) {
			const bent = 1.83;
			ang = [taken[0] + bent, taken[0] - bent].sort((a, b) => diff(a, face) - diff(b, face))[0];
		} else if (taken.length === 2) {
			// middle of the side without the H's
			const mid = Math.atan2(
				Math.sin(taken[0]) + Math.sin(taken[1]),
				Math.cos(taken[0]) + Math.cos(taken[1])
			);
			ang = mid + Math.PI;
		}
		const land: A = { el: 'H', x: Math.cos(ang) * BOND, y: Math.sin(ang) * BOND };
		const end = toWorld(to, land);
		hops.push({
			from,
			to,
			t: 0,
			h: land,
			sx: start.x,
			sy: start.y,
			ex: end.x,
			ey: end.y,
			ra: from.rot,
			rb: to.rot,
			took: h,
			scrub
		});
	}

	function spawnPair() {
		// leave the heros water alone so its still there when it lands
		const free = mols.filter((m) => kind(m) === 'water' && !m.busy && m !== mate);
		for (let tries = 0; tries < 5; tries++) {
			const a = free[Math.floor(Math.random() * free.length)];
			const b = a && nearest(a, 'water', 160 * u);
			if (b && b !== mate) return hop(a, b);
		}
	}

	function fall(d: Drop, dt: number) {
		const ty = -60 * u + (d.y + 60 * u) * d.a * d.a;
		const glide = 1 - Math.exp(-dt * 3);
		d.m.x += (d.x - d.m.x) * glide;
		d.m.y += (ty - d.m.y) * glide;
		d.m.rot += (d.a * d.turn - d.m.rot) * glide;
		if (d.a >= 1 && Math.abs(d.m.y - d.y) < 2 * u) {
			d.inside = true;
			d.m.vx = d.m.vy = 0;
			mols.push(d.m);
		}
	}

	// floats back up from where it drifted to
	function out(d: Drop) {
		d.inside = false;
		[d.x, d.y] = [d.m.x, d.m.y];
		mols = mols.filter((m) => m !== d.m);
	}

	// lands, sits still next to one water, then its H goes over as u scroll
	function heroStep(d: Drop, view: View, dt: number) {
		d.a = toward(d.a, clamp(view.fall, 0, 1), dt * 1.5);
		if (!d.inside) return fall(d, dt);
		if (hops.some((h) => h.scrub)) return;
		const k = kind(d.m);
		if (k === 'hcl') {
			if (d.a < 0.5) {
				if (sitting) d.m.busy = mate!.busy = false;
				sitting = false;
				return out(d);
			}
			if (!sitting) {
				if (!mate || kind(mate) !== 'water' || mate.busy) mate = partner(d.m);
				if (!mate || d.m.busy) return;
				sitting = true;
				d.m.busy = mate.busy = true;
			}
			if (view.hero > 0) {
				sitting = false;
				hop(d.m, mate!, 'fwd');
			}
		} else if (k === 'cl' && view.hero < 1 && !d.m.busy && !drops.some((o) => o !== d && o.inside)) {
			// only takes it back once the rest are all out
			const h = nearest(d.m, 'h3o');
			if (!h) return;
			mate = h;
			hop(h, d.m, 'back');
		}
	}

	// free water about 150 away, on the side its H is pointing
	function partner(m: Mol) {
		const h = toWorld(m, m.atoms.find((a) => a.el === 'H')!);
		const aim = Math.atan2(h.y - m.y, h.x - m.x);
		let best: Mol | null = null;
		let low = Infinity;
		for (const w of mols) {
			if (kind(w) !== 'water' || w.busy) continue;
			const off = Math.abs(((Math.atan2(w.y - m.y, w.x - m.x) - aim + TAU * 1.5) % TAU) - Math.PI);
			const score = Math.abs(Math.hypot(w.x - m.x, w.y - m.y) - 150 * u) + off * 60 * u;
			if (score < low) [best, low] = [w, score];
		}
		return best;
	}

	// hero still doing its thing
	const heroOn = () =>
		!!hero?.inside && (kind(hero.m) === 'hcl' || hops.some((h) => h.scrub));
	// its H has landed on the water, the rest can go now
	const heroDone = () => !!hero?.inside && kind(hero.m) === 'cl' && !hops.some((h) => h.scrub);

	function step(dt: number, view: View) {
		t += dt;
		const b = band();
		const sea = H * SEA;

		// hcl falls as u scroll. scroll back and it gets its H back then floats back up
		for (const d of drops) {
			if (d === hero) {
				heroStep(d, view, dt);
				continue;
			}
			// the rest wait till the first ones done
			const want = heroDone() ? clamp((view.acid - d.start) / POUR, 0, 1) : 0;
			d.a = toward(d.a, want, dt * 2);
			const k = kind(d.m);
			if (!d.inside) fall(d, dt);
			else if (d.a < 1 && !d.m.busy) {
				// gets its H back straight away but only leaves the water once ur scrolled back a bit
				if (k === 'hcl' && d.a < 0.5) out(d);
				else if (k === 'cl') {
					const h = nearest(d.m, 'h3o');
					if (h) hop(h, d.m);
				}
			}
		}

		// slow drifting, no random kicks so nothing shakes
		const damp = Math.exp(-2 * dt);
		const ease = 1 - Math.exp(-dt * 3);
		for (const m of mols) {
			m.age += dt;
			const k = kind(m);
			m.fade += ((k === 'water' ? 0.6 : 1) - m.fade) * ease;
			if (m.busy) {
				m.vx = m.vy = 0;
				continue;
			}
			m.rot += m.spin * dt;
			if (k === 'water') {
				const hx = m.hx + Math.sin(t * 0.3 + m.phase) * 6 * u;
				const hy = m.hy + Math.cos(t * 0.25 + m.phase) * 4 * u;
				m.vx += (hx - m.x) * 3 * dt;
				m.vy += (hy - m.y) * 3 * dt;
			} else {
				m.heading += Math.sin(t * 0.5 + m.phase) * dt;
				m.vx += Math.cos(m.heading) * 40 * u * dt;
				m.vy += Math.sin(m.heading) * 40 * u * dt;
			}
			m.vx *= damp;
			m.vy *= damp;
			m.x += m.vx * dt;
			m.y += m.vy * dt;
			if (m.x < b.left || m.x > b.right) {
				m.vx = (m.x < b.left ? 1 : -1) * Math.abs(m.vx);
				m.heading = Math.PI - m.heading;
			}
			if (m.y < b.top || m.y > b.bottom) {
				m.vy = (m.y < b.top ? 1 : -1) * Math.abs(m.vy);
				m.heading = -m.heading;
			}
		}

		// push apart so nothing overlaps, except an OH- and the H3O+ its going for
		// more room round the hero so its just it and its water
		const on = heroOn();
		const big = (m: Mol) => on && (m === hero!.m || m === mate);
		for (let i = 0; i < mols.length; i++) {
			for (let j = i + 1; j < mols.length; j++) {
				const [p, q] = [mols[i], mols[j]];
				if (p.target === q || q.target === p || (p.busy && q.busy)) continue;
				const room = (big(p) || big(q) ? 140 : 80) * u;
				const dx = q.x - p.x;
				const dy = q.y - p.y;
				const d = Math.hypot(dx, dy) || 1;
				if (d > room) continue;
				const push = ((room - d) / room) * 500 * u * dt;
				const [pk, qk] = p.busy ? [0, 2] : q.busy ? [2, 0] : [1, 1];
				p.vx -= (dx / d) * push * pk;
				p.vy -= (dy / d) * push * pk;
				q.vx += (dx / d) * push * qk;
				q.vy += (dy / d) * push * qk;
			}
		}

		// strong acid, gives its H away as soon as it lands
		for (const m of mols) {
			if (kind(m) !== 'hcl' || m.busy || m.drop === hero || (m.drop && m.drop.a < 1)) continue;
			const w = nearest(m, 'water');
			if (w) hop(m, w);
		}

		// autoionisation, same speed the whole time. in acid the OH- just gets caught fast
		pairTimer -= dt;
		const ohs =
			mols.filter((m) => kind(m) === 'oh').length +
			hops.filter((h) => kind(h.from) === 'oh').length;
		if (pairTimer <= 0 && !on && (view.mode === 'acid' || ohs < 2)) {
			spawnPair();
			pairTimer = 1 + Math.random() * 0.8;
		}

		// OH- goes for the closest H3O+. freeze = not yet
		if (view.mode !== 'freeze') {
			const acidic = view.mode === 'acid';
			const pull = (acidic ? 260 : 150) * u;
			for (const oh of mols) {
				if (kind(oh) !== 'oh' || oh.busy || oh.age < (acidic ? 0.6 : oh.life)) continue;
				if (!oh.target || oh.target.busy || kind(oh.target) !== 'h3o')
					oh.target = nearest(oh, 'h3o');
				const h = oh.target;
				if (!h) continue;
				const far = Math.hypot(h.x - oh.x, h.y - oh.y) || 1;
				const ux = (h.x - oh.x) / far;
				const uy = (h.y - oh.y) / far;
				oh.vx += ux * pull * dt;
				oh.vy += uy * pull * dt;
				h.vx -= ux * pull * 0.6 * dt;
				h.vy -= uy * pull * 0.6 * dt;
				if (far < 66 * u) hop(h, oh);
			}
		}

		for (const h of hops) {
			if (h.scrub) {
				// follows the scroll but cant go faster than half a sec across, so no teleporting
				const v = clamp(h.scrub === 'fwd' ? view.hero : 1 - view.hero, 0, 1);
				const want = v * HOP;
				const max = (dt * HOP) / 0.5;
				h.t = Math.abs(want - h.t) <= max ? want : h.t + Math.sign(want - h.t) * max;
				// scrolled all the way back, H goes home
				if (h.t <= 0 && v <= 0) {
					h.from.atoms.push(h.took);
					h.from.busy = h.to.busy = false;
					h.t = -1;
					continue;
				}
			} else h.t += dt;
			if (h.t < HOP) continue;
			h.to.atoms.push(h.h);
			for (const m of [h.from, h.to]) {
				m.busy = false;
				m.age = 0;
				if (kind(m) === 'water') [m.hx, m.hy] = [m.x, m.y];
			}
		}
		hops = hops.filter((h) => h.t >= 0 && h.t < HOP);
	}

	function draw(view: View) {
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, W, H);
		const { x, y, z } = view.zoom;
		ctx.translate(x, y);
		ctx.scale(z, z);
		ctx.translate(-W / 2, -H * SEA);

		backSprite ??= bakeBack();
		const top = H * SEA + 25 * u;
		const w = backSprite.width / dpr;
		ctx.globalAlpha = 0.2;
		for (const d of back) {
			const span = W + 100 * u;
			const bx = ((((d.fx * span + t * d.speed * u) % span) + span) % span) - 50 * u;
			const deep = H - top;
			const by =
				top +
				((((d.fy * deep - view.depth * 0.25) % deep) + deep) % deep) +
				Math.sin(t * 0.4 + d.phase) * 4 * u;
			ctx.save();
			ctx.translate(bx + view.mouse.x * 6, by + view.mouse.y * 6);
			ctx.rotate(d.rot + t * 0.05);
			ctx.drawImage(backSprite, -w / 2, -w / 2, w, w);
			ctx.restore();
		}
		ctx.globalAlpha = 1;

		const ox = view.mouse.x * 14;
		const oy = view.mouse.y * 14;
		// jumping H's go under everything, same as an H sitting under its O. straight line, eased
		for (const h of hops) {
			const k = smooth(Math.min(1, h.t / HOP));
			ctx.globalAlpha = h.from.fade + (h.to.fade - h.from.fade) * k;
			ctx.save();
			ctx.translate(h.sx + (h.ex - h.sx) * k + ox, h.sy + (h.ey - h.sy) * k + oy);
			ctx.rotate(h.ra + (h.rb - h.ra) * k);
			ctx.scale(S, S);
			atom(ctx, { el: 'H', x: 0, y: 0 }, true);
			ctx.restore();
		}
		ctx.globalAlpha = 1;
		// same order every frame so nothing swaps layers
		for (const m of mols) drawMol(m, ox, oy);
		// not while zooming out or u see them floating off
		if (z > 0.999) for (const d of drops) if (!d.inside && d.m.y > -55 * u) drawMol(d.m, ox, oy);
	}

	return {
		resize(w: number, h: number) {
			if (w === W && h === H) return;
			W = w;
			H = h;
			u = clamp(h / 700, 0.8, 1.25);
			S = u * FRONT;
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
			backSprite = null;
			populate();
		},
		// back to how it started, only if something moved. for when its off screen
		reset() {
			if (W && (hops.some((h) => h.scrub) || drops.some((d) => d.inside || d.a > 0))) populate();
		},
		// how many hcl have given their H away, 0 -> 1
		donated: () =>
			drops.length
				? drops.filter((d) => kind(d.m) === 'cl' && !d.m.busy).length / drops.length
				: 0,
		frame(dt: number, view: View) {
			if (!W) return;
			step(dt, view);
			draw(view);
		}
	};
}
