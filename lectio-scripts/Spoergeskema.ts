import 'rx-lite';
import { LectioJSUtils } from "./LectioJSUtils";

export namespace Spoergeskema {

	type Point = Readonly<{ x: number, y: number }>;

	type Polyline = {
		readonly type: "polyline";
		id: string;
		readonly points: Point[];
	};

	// (de)serialiseres paa serveren.
	type HotspotPolygon = Polyline;

	type PolygonPainter = {
		hotspots: HotspotPolygon[];
		currentlyPainting: (HotspotPolygon & { cancel: () => void }) | null;
		hidden: HTMLInputElement;
	};

	function dist(p1: Point, p2: Point) {
		return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
	}

	let idgen = 0;
	function getNewId() {
		idgen++;
		return "i" + idgen;
	}

	function isPointInsidePolyline(poly: {
		x: number,
		y: number
	}[],
		pointx: number,
		pointy: number
	): boolean {
		// https://stackoverflow.com/questions/217578/how-can-i-determine-whether-a-2d-point-is-within-a-polygon
		let i, j;
		let inside = false;
		for (i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const uhmm =
				(poly[i].y > pointy) !== (poly[j].y > pointy) &&
				(pointx < (poly[j].x - poly[i].x) * (pointy - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x);
			if (uhmm)
				inside = !inside;
		}
		return inside;
	}

	function GetElementById(id: string): HTMLElement {
		const ele = document.getElementById(id);
		if (!ele)
			throw new Error('Fandt ikke element med givne id.');
		return ele;
	}

	function GetElementByTagName(container: HTMLElement, tagName: string): Element {
		const list = container.getElementsByTagName(tagName);
		if (!list || list.length === 0)
			throw new Error(`Fandt ikke tag '${tagName}'.`);
		if (list.length !== 1)
			throw new Error(`Fandt flere tags '${tagName}'.`);
		return list[0] as HTMLElement;
	}

	function GetElementByQuerySelector(container: HTMLElement, selector: string): Element {
		const list = container.querySelectorAll(selector);
		if (!list || list.length === 0)
			throw new Error(`Fandt ikke med selector '${selector}'.`);
		if (list.length !== 1)
			throw new Error(`Fandt flere tags med selector '${selector}'.`);
		return list[0] as HTMLElement;
	}

	function setOwnerId(element: Element, id: string) {
		element.setAttribute('lec-owner-id', id);
	}

	const svgns = 'http://www.w3.org/2000/svg';

	function createPolylineDom(svg: SVGElement, ownerId: string) {
		const line = document.createElementNS(svgns, 'polyline');
		line.setAttribute('class', 'ls-questionnaire-hotspot-path');
		setOwnerId(line, ownerId);

		const linebg = document.createElementNS(svgns, 'polyline');
		linebg.setAttribute('class', 'ls-questionnaire-hotspot-pathbg');
		setOwnerId(linebg, ownerId);

		svg.appendChild(linebg);
		svg.appendChild(line);

		return { line, linebg };
	}

	function updatePolylineDom(data: Polyline, line: SVGPolylineElement, linebg: SVGPolylineElement, connectToOrigin: boolean) {
		const d = data.points.map(r => r.x + ' ' + r.y).join(',');
		line.setAttribute('points', d + (connectToOrigin ? ',' + data.points[0].x + ' ' + data.points[0].y : ''));
		linebg.setAttribute('points', d + (connectToOrigin ? ',' + data.points[0].x + ' ' + data.points[0].y : ''));
	}

	function GetClickedCoordinates(svg: SVGElement, evt: MouseEvent) {
		const rect = svg.getBoundingClientRect();
		return {
			x: Math.floor(evt.clientX - rect.left),
			y: Math.floor(evt.clientY - rect.top)
		};
	}

	function extend<T, K>(t: T, k: K): T & K {
		for (const p of Object.getOwnPropertyNames(k))
			(t as any)[p] = (k as any)[p];
		return t as T & K;
	}

	function BeginDrawPolyline(painter: PolygonPainter, svg: SVGElement) {
		if (painter.currentlyPainting) {
			painter.currentlyPainting.cancel();
			return;
		}

		const id = getNewId();
		const dom = createPolylineDom(svg, id);
		const pol: HotspotPolygon = { type: "polyline", points: [], id: id };

		const clicks = Rx.Observable.fromEvent<MouseEvent>(svg, 'click');
		const stopHandlingClicks = new Rx.Subject<undefined>();
		const cancelDrawing = new Rx.Subject<undefined>();
		painter.currentlyPainting = extend(pol, {
			cancel: () => cancelDrawing.onNext(undefined)
		});

		painter.hotspots.push(pol);

		cancelDrawing.take(1).subscribe(() => {
			LectioJSUtils.AssertArgument(painter.currentlyPainting === pol, 'cancel: painter.currentlypainter != pol');
			LectioJSUtils.AssertArgument(painter.hotspots[painter.hotspots.length - 1] === pol, 'painter.hotspots[painter.hotspots.length - 1] === pol');
			stopHandlingClicks.onNext(undefined);
			painter.currentlyPainting = null;
			RemoveHotspot(painter, id, svg);
			SaveHotspots(painter);
		});

		const classDrawing = 'ls-questionnaire-hotspot-drawing';
		addClass(svg, classDrawing);
		stopHandlingClicks.subscribe(() => removeClass(svg, classDrawing));

		clicks.takeUntil(stopHandlingClicks).subscribe(evt => {
			const coord = GetClickedCoordinates(svg, evt);

			const isSamePoint = pol.points.length !== 0 && dist(coord, pol.points[pol.points.length - 1]) < 3;
			if (isSamePoint)
				return;

			const isFirstPoint = pol.points.length === 0;

			let done = false;
			const isStartPoint = pol.points.length !== 0 && dist(coord, pol.points[0]) < 10;
			if (isStartPoint) {
				if (pol.points.length <= 2)
					return;
				// afslut.
				done = true;
				stopHandlingClicks.onNext(undefined);
			}
			else {
				const edgePoint = document.createElementNS(svgns, 'circle');
				addClass(edgePoint, 'ls-questionnaire-hotspot-edgepoint');
				if (isFirstPoint)
					addClass(edgePoint, 'lc-comb-first');
				edgePoint.setAttribute('cx', coord.x.toString());
				edgePoint.setAttribute('cy', coord.y.toString());
				edgePoint.setAttribute('r', isFirstPoint ? '6' : '4');
				edgePoint.setAttribute('lec-role', 'hotspot-drawadorner');
				setOwnerId(edgePoint, id);
				svg.appendChild(edgePoint);
				pol.points.push(coord);
			}

			updatePolylineDom(pol, dom.line, dom.linebg, done);
			if (done) {
				const circles = svg.querySelectorAll('[lec-owner-id=' + id + '][lec-role=hotspot-drawadorner]');
				removeElement(circles);
				painter.currentlyPainting = null;
				SaveHotspots(painter);
			}
		});
	}

	function SaveHotspots(painter: PolygonPainter) {
		painter.hidden.value = JSON.stringify(painter.hotspots);
	}

	function RemoveAllHotspots(painter: PolygonPainter, svg: SVGElement) {
		if (painter.currentlyPainting)
			painter.currentlyPainting.cancel();
		LectioJSUtils.AssertArgument(painter.currentlyPainting === null, "painter === null");
		for (const hs of painter.hotspots.slice())
			RemoveHotspot(painter, hs.id, svg);
		painter.hotspots = [];
		SaveHotspots(painter);
	}

	function RemoveHotspot(painter: PolygonPainter, id: string, svg: SVGElement) {
		LectioJSUtils.AssertNotNullOrEmpty(id, 'id');

		const hslist = painter.hotspots.filter(hs => hs.id === id);
		LectioJSUtils.AssertArgument(hslist.length === 1, "hslist.length === 1");
		painter.hotspots.splice(painter.hotspots.indexOf(hslist[0]), 1);

		const toRemove = ChildrenToArray(svg).filter(e => (e.getAttribute('lec-owner-id') || "x") === id);
		removeElement(toRemove);
	}

	function PA<T>(coll: { length: number, [i: number]: T }): T[] {
		return coll as any as T[];
	}

	function ChildrenToArray(ele: Element): Element[] {
		const rv: Element[] = [];
		// edge (creators update) understoetter ikke .children.
		// for (let c of ele.childNodes) {
		for (const c of PA(ele.childNodes)) {
			if (c instanceof Element)
				rv.push(c);
		}
		return rv;
	}

	function LocateEditorParts(containerId: string) {
		const container = GetElementById(containerId);
		const hotspotHidden = GetElementByQuerySelector(container, 'input[type=hidden][lec-role=hotspot-json]') as HTMLInputElement;
		const svg = GetElementByTagName(container, 'svg') as SVGElement;

		const hotspotsJson = hotspotHidden.value;
		const hotspots = hotspotsJson ? JSON.parse(hotspotsJson) as HotspotPolygon[] : [];

		return { container, hotspotHidden, svg, hotspots };
	}

	function LocateDisplayParts(containerId: string) {
		const container = GetElementById(containerId);
		const svg = GetElementByTagName(container, 'svg') as SVGElement;

		return { container, svg };
	}

	function LocateAnswerParts(displayParts: { container: HTMLElement, svg: SVGElement }) {
		const svg = displayParts.svg;

		const pointsHidden = GetElementByQuerySelector(displayParts.container, 'input[type=hidden]') as HTMLInputElement;
		const pointsJson = pointsHidden.value;
		const points = pointsJson ? JSON.parse(pointsJson) as Point[] : [];

		return { container: displayParts.container, pointContainer: svg.parentNode as HTMLElement, pointsHidden, svg, points };
	}

	function addClass(element: Element, className: string) {
		// Aht. IE11.
		$(element).addClass(className);
	}

	function removeClass(element: Element, className: string) {
		// Aht. IE11.
		$(element).removeClass(className);
	}

	function removeElement<T extends Element>(e: T | T[] | NodeListOf<T>) {
		function removeSingle(e: Element) {
			if (!e.parentNode)
				return;
			e.parentNode.removeChild(e);
		}

		if (e instanceof Element) {
			removeSingle(e);
		} else {
			for (const ele of e as Element[])
				removeSingle(ele);
		}
	}

	export function DrawHotspots(containerId: string, hotspots: HotspotPolygon[]) {
		const parts = LocateDisplayParts(containerId);

		for (const hotspot of hotspots) {
			hotspot.id = getNewId();
		}
		for (const hotspot of hotspots) {
			const poly = createPolylineDom(parts.svg, hotspot.id);
			updatePolylineDom(hotspot, poly.line, poly.linebg, true);
		}
	}

	export function InitializeHotspotAnswering(containerId: string, hotspots: HotspotPolygon[] | null, allowEdit: boolean): void {
		function createPointCircle(p: Point) {
			const circle = document.createElementNS(svgns, 'circle');
			circle.setAttribute('cx', p.x.toString());
			circle.setAttribute('cy', p.y.toString());
			circle.setAttribute('r', '4');
			circle.setAttribute('class', 'ls-questionnaire-hotspot-point');
			circle.setAttribute('lec-role', 'point-marker');

			return circle;
		}

		function getPointCirle(svg: SVGElement, p: Point) {
			for (let i = 0; i < svg.childNodes.length; i++) {
				const child = svg.childNodes[i];
				if (!(child instanceof Element))
					continue;
				if (child.getAttribute('lec-role') === 'point-marker' && child.getAttribute('cx') === p.x.toString() && child.getAttribute('cy') === p.y.toString())
					return child;
			}
			throw new Error('Fandt ikke svg-element med koordinat ' + p.x + ", " + p.y + '.');
		}

		const parts = LocateAnswerParts(LocateDisplayParts(containerId));
		function SaveAnswerPoints() {
			parts.pointsHidden.value = JSON.stringify(parts.points);
		}

		if (hotspots)
			DrawHotspots(containerId, hotspots);

		for (const p of parts.points) {
			const circle = createPointCircle(p);
			parts.svg.appendChild(circle);
		}

		if (!allowEdit)
			return;

		addClass(parts.pointContainer, 'ls-questionnaire-points-editable');
		function RemovePoint(p: Point) {
			for (let i = 0; i < parts.points.length; i++) {
				if (p.x === parts.points[i].x && p.y === parts.points[i].y) {
					const c = getPointCirle(parts.svg, parts.points[i]);
					parts.points.splice(i, 1);
					removeElement(c);
					break;
				}
			}
		}

		parts.pointContainer.addEventListener('click', evt => {
			const t = evt.target as Element;
			if (t.tagName === 'circle' && t.getAttribute('lec-role') === 'point-marker') {
				const elecoord = { x: parseInt(t.getAttribute('cx') || "-1", 10), y: parseInt(t.getAttribute('cy') || "-1", 10) };
				// Fjern punktet. Der er nok kun eet...
				for (const p of parts.points) {
					if (dist(elecoord, p) < 1) {
						RemovePoint(p);
						break;
					}
				}
			}
			else {
				const clickedCoord = GetClickedCoordinates(parts.svg, evt);
				parts.points.push(clickedCoord);
				const circle = createPointCircle(clickedCoord);
				parts.svg.appendChild(circle);
			}

			SaveAnswerPoints();
		});

		$(parts.container).on('execHotspotEditorCommand', (event, command) => {
			switch (command) {
				case 'RemoveAllAnswerPoints':
					for (const p of parts.points.slice(0))
						RemovePoint(p);
					SaveAnswerPoints();
					break;
				default:
					throw new Error('Ukendt kommando "' + command + '".');
			}
		});

	}

	export function InitializeHotspotEditor(containerId: string): void {
		const parts = LocateEditorParts(containerId);

		for (const hotspot of parts.hotspots) {
			hotspot.id = getNewId();
		}

		for (const hotspot of parts.hotspots) {
			const poly = createPolylineDom(parts.svg, hotspot.id);
			updatePolylineDom(hotspot, poly.line, poly.linebg, true);
		}

		const painter: PolygonPainter = {
			hotspots: parts.hotspots,
			currentlyPainting: null,
			hidden: parts.hotspotHidden,
		};

		addClass(parts.container, 'ls-questionnaire-hotspots-editable');

		$(parts.container).on('execHotspotEditorCommand', (event, command) => {
			switch (command) {
				case 'DrawPolyline':
					BeginDrawPolyline(painter, parts.svg);
					break;
				case 'HitTest':
					HitTestPoly(parts.svg, parts.hotspots);
					break;
				case 'RemoveAllHotspots':
					RemoveAllHotspots(painter, parts.svg);
					break;
				default:
					throw new Error('Ukendt kommando "' + command + '".');
			}
		});
	}

	export function ExecHotspotCommand(elementInContainer: HTMLElement, command: string) {
		$(elementInContainer).trigger('execHotspotEditorCommand', [command]);
	}

	function HitTestPoly(svg: SVGElement, hotspots: HotspotPolygon[]) {
		let cnt = 0;
		svg.addEventListener('click', function click(evt) {
			cnt++;
			if (cnt >= 5) {
				svg.removeEventListener('click', click);
				LectioJSUtils.LogDebug('hit test: done');
				return;
			}

			const coord = GetClickedCoordinates(svg, evt);
			const polys: number[] = [];

			for (let i = 0; i < hotspots.length; i++) {
				if (isPointInsidePolyline(hotspots[i].points, coord.x, coord.y))
					polys.push(i);
			}
			LectioJSUtils.LogDebug('Polys hit:', polys.length);
		});
	}
}
