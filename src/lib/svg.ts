// mouse pos in the svg
// https://stackoverflow.com/questions/21852543/svg-how-to-get-the-mouse-position-on-the-internal-matrix
export function svgPoint(svg: SVGSVGElement, e: MouseEvent) {
	const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
	return { x: Math.round(p.x), y: Math.round(p.y) };
}
