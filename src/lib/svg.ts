// mouse pos in the svg's viewBox units, rounded
export function svgPoint(svg: SVGSVGElement, e: MouseEvent) {
	const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
	return { x: Math.round(p.x), y: Math.round(p.y) };
}
