const isLetter = (c: string) => c.toLowerCase() !== c.toUpperCase();
const isDigit = (c: string) => c >= '0' && c <= '9';
const isCharge = (c: string) => c === '+' || c === '−' || c === '-';
const isWordEnd = (c: string | undefined) => c === undefined || ' .,;:!?)]('.includes(c); // brackets so [H3O+] and OH−(aq) work

// plain formulas -> sub/superscripts for chem formulas
// numbers after a letter or ) are sub H2O -> H₂O
// + or - at end of a word is sup: Cl− → Cl⁻
// ^ makes rest of word sup: Ca^2+ → Ca²⁺
// html tags are left alone so you can use @html
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
