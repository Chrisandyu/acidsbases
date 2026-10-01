const isLetter = (c: string) => c.toLowerCase() !== c.toUpperCase();
const isDigit = (c: string) => c >= '0' && c <= '9';
const isCharge = (c: string) => c === '+' || c === '−' || c === '-';
/** End of a word: end of the text, a space, or punctuation */
const isWordEnd = (c: string | undefined) => c === undefined || ' .,;:!?)'.includes(c);

/**
 * Turns plain formulas in text into HTML sub/superscripts.
 * Digits after a letter or ")" become subscripts: H2O → H₂O, NH4+ → NH₄⁺.
 * A + or − at the end of a word becomes a superscript: H3O+ → H₃O⁺, Cl− → Cl⁻.
 * ^ makes the rest of the word a superscript, for charges with a number: Ca^2+ → Ca²⁺, CO3^2− → CO₃²⁻.
 * HTML tags are copied as they are, so you can mix in things like <b class="text-red">.
 */
export function chem(text: string): string {
	let html = '';
	let i = 0;

	while (i < text.length) {
		const c = text[i];
		const prev = text[i - 1];
		const afterFormula = prev !== undefined && (isLetter(prev) || isDigit(prev) || prev === ')');

		if (c === '<') {
			const j = text.indexOf('>', i) + 1;
			html += text.slice(i, j);
			i = j;
		} else if (c === '^') {
			let j = i + 1;
			while (!isWordEnd(text[j])) j++;
			html += `<sup class="charge">${text.slice(i + 1, j)}</sup>`;
			i = j;
		} else if (isDigit(c) && prev !== undefined && (isLetter(prev) || prev === ')')) {
			let j = i;
			while (isDigit(text[j])) j++;
			html += `<sub>${text.slice(i, j)}</sub>`;
			i = j;
		} else if (isCharge(c) && afterFormula && isWordEnd(text[i + 1])) {
			html += `<sup class="charge">${c}</sup>`;
			i++;
		} else {
			html += c;
			i++;
		}
	}

	return html;
}
