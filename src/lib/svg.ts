/** Mouse position in an SVG's own coordinates (its viewBox units), rounded */
export function svgPoint(svg: SVGSVGElement, e: MouseEvent) {
	const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
	return { x: Math.round(p.x), y: Math.round(p.y) };
}
