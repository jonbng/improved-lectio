import * as d3 from "d3";
import { LectioJSUtils } from "./LectioJSUtils";

interface IChartData {
	minDate: Date;
	maxDate: Date;
	lanes: ILane[];
	data: IRectData[][];
	marks: IMark[];
	pauses: IPause[];
}

interface ILane {
	id: number;
	name: string;
	rows: number;
}

interface IMark {
	date: Date;
	laneNumber: number;
	textAbove: string;
	textBelow: string;
}

interface IPause {
	displayName: string;
	toolTip: string;
	periode: Date[];
	startLane: number;
	endLane: number;
}

interface IRectData {
	id: number;
	laneid: number;
	numRows: number;
	rowsAbove: number;
	offset: number;
	displayName: string;
	tooltip: string;
	periode: Date[];
	bottomLinePeriode?: Date[];
	afgangsaarsag: string;
	isLectioControlled: boolean;
	hasInnerPeriod: boolean;
	isTransparent: boolean;

}

enum ViewStyleEnum {
	Full,
	Compact
	//TimeLineOnly
}

type RectFromServer = Pick<
	IRectData,
	"numRows" | "tooltip" | "afgangsaarsag" | "isLectioControlled" | "hasInnerPeriod" | "isTransparent"
> & { offSet: number; display: string; periode: string[], bottomLinePeriode: string[] };

type Lane = {
	data: RectFromServer[],
	title: string,
	numRows: number,
};

type Mark = {
	date: Date;
	laneNumber: number;
	textAbove: string;
	textBelow: string;
}

type Pause = {
	displayName: string,
	toolTip: string,
	periode: Date[],
	startLane: number,
	endLane: number,
}


type DataFromServer = {
	minDate: string;
	maxDate: string;
	lanes: Lane[];
	marks: Mark[];
	pauses: Pause[];
};

class HistorikVisualizer {
	private element: JQuery;
	private dataElement: JQuery;
	private chartElement: JQuery;
	private laneSizes: number[];

	constructor(element: JQuery, dataElement: JQuery, chartElement: JQuery) {
		this.element = element;
		this.dataElement = dataElement;
		this.chartElement = chartElement;
		this.laneSizes = [];
	}

	public static Initialize(
		outerElementId: string,
		view: number,
		widthExp: number,
		allowEnableZoom: boolean
	): void {
		LectioJSUtils.LogDebug("Historik, initializing element: " + outerElementId);

		const outer = $("#" + outerElementId);
		const historik = new HistorikVisualizer(
			outer,
			$("input[type=hidden]", outer).eq(0),
			$("div", outer).eq(0)
		);

		outer.data("hist", historik);
		historik.createSvg(view, widthExp, allowEnableZoom);
	}

	private getIRectData(
		laneid: number,
		rowsAbove: number,
		data: RectFromServer
	): IRectData {
		const d: Partial<IRectData> = {};
		d.id = Math.floor(Math.random() * 1000000);
		d.displayName = data.display;
		d.periode = data.periode.map(s => new Date(s));
		d.bottomLinePeriode = data.bottomLinePeriode ? data.bottomLinePeriode.map(s => new Date(s)) : undefined;
		return {
			id: d.id,
			offset: data.offSet,
			laneid: laneid,
			numRows: data.numRows,
			rowsAbove: rowsAbove,
			displayName: data.display,
			tooltip: data.tooltip,
			periode: d.periode,
			bottomLinePeriode: d.bottomLinePeriode,
			afgangsaarsag: data.afgangsaarsag,
			isLectioControlled: data.isLectioControlled,
			hasInnerPeriod: data.hasInnerPeriod,
			isTransparent: data.isTransparent,
		};
	}

	private readData(): IChartData {
		const chartData: DataFromServer = JSON.parse(this.dataElement.val() as string);
		this.laneSizes = this.calculateRowsAbove(chartData.lanes);
		return {
			lanes: chartData.lanes.map((l, i) => { return { id: i, name: l.title, rows: l.numRows } }),

			minDate: new Date(chartData.minDate as string),
			maxDate: new Date(chartData.maxDate as string),

			data: chartData.lanes.map((l, i) => l.data.map(u => this.getIRectData(i, this.laneSizes[i], u))),
			marks: chartData.marks,
			pauses: chartData.pauses
		};
	}


	private readDataCompact(): IChartData {
		const chartData: DataFromServer = JSON.parse(
			this.dataElement.val() as string
		);

		const positions = this.calculateRowsAboveCompact(chartData.lanes);
		return {
			lanes: chartData.lanes.map(
				(l, i) => { return { id: i, name: "", rows: l.data[0] ? l.data[0].numRows : 0 } }),

			minDate: new Date(chartData.minDate as string),
			maxDate: new Date(chartData.maxDate as string),

			data: chartData.lanes.map((l, i) => l.data.map(u => this.getIRectData(i, positions[i], u))),
			marks: chartData.marks,
			pauses: chartData.pauses
		};
	}


	// Calculates the lanes offset from the top. The first should be zero.
	// For cases where the waterfall fix collisions has been used.
	private calculateRowsAbove(lanes: Lane[]) {
		const zero = [0];
		const laneRowNumbers = zero.concat(lanes.map(l => l.numRows ? l.numRows : 0));
		let offset = 0;
		const positions = laneRowNumbers.map(elem => offset = offset + elem);
		return positions;
	}

	// Calculates the lanes offset from the top. The first should be zero.
	// For cases where compact collision fixing has been used.
	private calculateRowsAboveCompact(lanes: Lane[]) {
		const zero = [0];
		const laneRowNumbers = zero.concat(lanes.map(l => l.data[0] ? l.data[0].numRows : 0));
		let offset = 0;
		const positions = laneRowNumbers.map(elem => offset = (offset || 0) + elem);
		return positions;
	}


	private createSvg(
		view: number,
		widthExp: number,
		allowEnableZoom: boolean
	): void {

		let chartData = this.readData();
		if (view === ViewStyleEnum.Compact) chartData = this.readDataCompact();
		let zoombrush = false;
		const laneSizes = this.laneSizes;

		const tooltip = d3
			.select("body")
			.append("div")
			.attr("class", "toolTip");

		let sumRows = 0;
		for (let i = 0; i < chartData.lanes.length; i++)
			sumRows += chartData.lanes[i].rows;


		if (sumRows === 0) sumRows = 1; //Ellers bliver en tom oversigt meget lille

		// initielt zoom

		const margin =
			view === ViewStyleEnum.Compact
				? { top: 5, right: 15, bottom: 35, left: 15 }
				: { top: 20, right: 15, bottom: 50, left: 15 },
			width = widthExp - margin.left - margin.right,
			sideMarginSize = 100, // used to make room for text such as "indmeldelsesdato" when they are the first or last shown element.
			boxHeight = 21.333 + 4,
			boxMinWidth = 5,
			boxyoffset = 8,
			rowHeight = boxHeight + boxyoffset,
			height = sumRows * rowHeight,
			mainHeight = height,
			svgHeight = height + margin.top + margin.bottom + 20;

		// scales
		const x = d3
			.scaleTime()
			.domain([chartData.minDate, chartData.maxDate])
			.range([0, width]);
		const xFull = x.copy();

		const y = d3
			.scaleLinear()
			.domain([0, sumRows])
			.range([0, mainHeight]);

		const enableZoom: boolean =
			allowEnableZoom;

		let realSvgHeight: number;
		if (enableZoom && view === ViewStyleEnum.Full)
			realSvgHeight = svgHeight + 50;
		else if (enableZoom && view === ViewStyleEnum.Compact) {
			realSvgHeight = svgHeight + 20;
			margin.top += 20;
		} else if (!enableZoom && view === ViewStyleEnum.Compact) {
			realSvgHeight = svgHeight - 20;
		} else {
			realSvgHeight = svgHeight;
		}

		const ele = this.chartElement!.get(0);
		if (!ele)
			return;

		const svg = d3
			.select(ele)
			.append("svg:svg")
			.attr("width", width + margin.right + margin.left)
			.attr("height", realSvgHeight)
			.attr("tabindex", 0)
			.attr("class", "chart");

		const main = svg
			.append("g")
			.attr(
				"transform",
				"translate(" + margin.left + "," + margin.top + ")"
			)
			.attr("width", width)
			.attr("class", "main");

		const brush = d3
			.brushX()
			.extent([[0, 30], [width, 55]])
			.on("brush", brushed);

		const classes = [
			"udd",
			"aftale",
			"skoleforloeb",
			"skolePraktik",
			"xprselevtype",
			"pause",
			"udd",
			"aftale",
			"skoleforloeb",
			"skolePraktik",
			"xprselevtype",
			"pause",
		];
		const domain = ["0", "1", "2", "3", "4", "5", "6"];

		//if (view == ViewStyleEnum.Compact) {
		//	const classes = ['udd', 'aftale', 'skoleforloeb', 'skolePraktik'];
		//	const domain = ['1', '2', '3', '4'];
		//}

		const classscale = d3
			.scaleOrdinal()
			.range(classes)
			.domain(domain);

		const months = [
			"jan",
			"feb",
			"mar",
			"apr",
			"maj",
			"jun",
			"jul",
			"aug",
			"sep",
			"okt",
			"nov",
			"dec",
		];

		const customMonths = (date: Date) => {
			return months[date.getMonth()];
		};

		const boxWidth = (data: IRectData) => {
			const width = x(data.periode[1]) - x(data.periode[0]);
			if (width <= boxMinWidth) return boxMinWidth;
			return width;
		};

		// mousetrap
		main
			.append("rect")
			.attr("x", 0)
			.attr("y", 0)
			.attr("class", "zoom")
			.attr("width", width)
			.attr("height", mainHeight);

		const dat: IRectData[] = ([] as IRectData[]).concat(...chartData.data);
		const ddmmyyyy = d3.timeFormat("%d/%m-%Y");

		

		main
			.append("defs")
			.append("clipPath")
			.attr("id", "clip")
			.append("rect")
			.attr("width", width)
			.attr("height", svgHeight);


		// ----- Herunder tegnes alt det der kan ses ----- \\

		if (view === ViewStyleEnum.Full) {
			drawLaneParters(); // rækker
			drawLaneLabels(); // række labels
		}

		drawAssets();

		const zoom = d3
		.zoom()
		.scaleExtent([0.75, 10])
		.translateExtent([[-sideMarginSize, 0], [width + sideMarginSize, height]])
		.extent([[0, 0], [width, height]])
		.on("zoom", zoomed)
		// stm 45105: kun zoombar hvis svg'en har fokus 
		.filter(event => document.activeElement === svg.node()); 

		if (enableZoom) {
			main.call(zoom as any);	
			createZoomButtons();
			if (view === ViewStyleEnum.Full)
				createZoomSliderAxis();
		}

		// mere end 4 år så zoomer vi ind tl de seneste fire år.
		if (xFull.domain()[1].valueOf() - xFull.domain()[0].valueOf() >
			1000 * 3600 * 24 * 365 * 4) {
			defaultZoom(4);
		} else {
			fullZoom();
		}

		// ----- Kun funktioner herunder ----- \\

		function createZoomSliderAxis() {
			const overview = svg
				.append("g")
				.attr(
					"transform",
					"translate(" +
					margin.left +
					"," +
					(margin.top + height + 20) +
					")"
				)
				.attr("width", width)
				.attr("height", 40)
				.attr("class", "overview");

			const xYearAxis = d3
				.axisBottom(xFull)
				.ticks(d3.timeYear)
				.tickFormat(d3.timeFormat("%Y") as any)
				.tickSize(3);

			// add the x-axis
			overview
				.append("g")
				.attr("transform", "translate(0," + 40 + ")")
				.call(xYearAxis);

			// en draggable slider
			overview
				.append("g")
				.attr("class", "brush")
				.call(brush)
				.call(brush.move, x.range() as any);

			drawTodayLineOnZoomSlider(); // Today Line, men ovenpå zoom slideren.

			// og endelig en indikation af, hvor der er data
			overview
				.append("g")
				.selectAll("rect")
				.data(dat)
				.enter()
				.append("rect")
				.attr("x", d => xFull(d.periode[0]))
				.attr("y", 37)
				.attr("height", 3)
				.attr("width", d => xFull(d.periode[1]) - xFull(d.periode[0]));
		}

		function createZoomButtons() {
			const zoomOne = svg
				.append("g")
				.attr("transform", "translate(" + (width - 180) + ",0)")
				.on("click", (event: any) => {
					event.stopPropagation();
					defaultZoom(1);
				});
			zoomOne
				.append("text")
				.attr("dx", 5)
				.attr("dy", 13)
				.text("Vis 1 år");
			zoomOne
				.append("rect")
				.attr("class", "btn")
				.attr("width", 55)
				.attr("height", 20);

			const zoomFour = svg
				.append("g")
				.attr("transform", "translate(" + (width - 120) + ",0) ")
				.on("click", (event: any) => {
					event.stopPropagation();
					defaultZoom(4);
				});
			zoomFour
				.append("text")
				.attr("dx", 5)
				.attr("dy", 13)
				.text("Vis 4 år");
			zoomFour
				.append("rect")
				.attr("class", "btn")
				.attr("width", 55)
				.attr("height", 20);

			const zoomOut = svg
				.append("g")
				.attr("transform", "translate(" + (width - 60) + ",0)")
				.on("click", (event: any) => {
					event.stopPropagation();
					fullZoom();
				});
			zoomOut
				.append("text")
				.attr("dx", 5)
				.attr("dy", 13)
				.text("Vis alt");
			zoomOut
				.append("rect")
				.attr("class", "btn")
				.attr("width", 55)
				.attr("height", 20);
		}

		function drawLaneParters() {
			main
				.append("g")
				.selectAll(".lanelines")
				.data(chartData.lanes)
				.enter()
				.append("line")
				.attr("x1", -0)
				.attr("y1", d => d3.format("d")(y(laneSizes[d.id] ?? 1)))
				.attr("x2", width)
				.attr("y2", d => d3.format("d")(y(laneSizes[d.id] ?? 1)))
				.attr("stroke", "lightgray");

		}
		function drawLaneLabels() {
			main
				.append("g")
				.selectAll(".labeltext")
				.data(chartData.lanes)
				.enter()
				.append("text")
				.attr("class", "labeltext")
				.attr("y", d => d3.format("d")(y((laneSizes[d.id]) ?? 1) + 6))
				.attr("dy", 14)
				.attr("text-anchor", "start")
				.attr("letter-spacing", "0.25pt")
				.text(d => d.name);
		}

		function drawTodayLineOnZoomSlider() {
			main
				.append("line")
				.attr("x1", x(new Date()))
				.attr("y1", mainHeight + rowHeight + 17)
				.attr("x2", x(new Date()))
				.attr("y2", mainHeight + rowHeight + 42)
				.attr("class", "todayLineZoom");
		}

		function addMarks(marksData: IMark[]) {
			main
				.append("g")
				.attr("id", "theMarks")
				.selectAll("g")
				.data(marksData)
				.enter()
				.append("line")
				.attr("x1", d => x(Date.parse(d.date.toString())))
				.attr("y1", d => calcRowsAboveByLaneNumber(d.laneNumber) * rowHeight + rowHeight)
				.attr("x2", d => x(Date.parse(d.date.toString())))
				.attr("y2", d => calcRowsAboveByLaneNumber(d.laneNumber + 1) * (rowHeight))
				.attr("stroke", "gray")
				.attr("stroke-width", 2)
				.style("stroke-dasharray", "3,3");

			const markertexts = main
				.append("g")
				.attr("id", "markerTexts")
				.attr("text-anchor", "middle")
				.selectAll("g")
				.data(marksData)
				.enter();

			markertexts
				.append("text")
				.attr("x", d => x(Date.parse(d.date.toString())) - 50)
				.attr("y", d => calcRowsAboveByLaneNumber(d.laneNumber) * rowHeight + rowHeight * 1.5 - boxyoffset)
				.text(d => d.textAbove);
			markertexts.append("text")
				.attr("x", d => x(Date.parse(d.date.toString())) - 50)
				.attr("y", d => calcRowsAboveByLaneNumber(d.laneNumber) * rowHeight + rowHeight * 1.5 + boxyoffset / 2)
				.text(d => d.textAbove !== "" ? ddmmyyyy(new Date(d.date)) : "");

			markertexts
				.append("text")
				.attr("x", d => x(Date.parse(d.date.toString())) + 50)
				.attr("y", d => calcRowsAboveByLaneNumber(d.laneNumber + 1) * rowHeight - rowHeight + boxyoffset)
				.text(d => d.textBelow);
			markertexts.append("text")
				.attr("x", d => x(Date.parse(d.date.toString())) + 50)
				.attr("y", d => calcRowsAboveByLaneNumber(d.laneNumber + 1) * rowHeight - rowHeight + boxyoffset * 2.5)
				.text(d => d.textBelow !== "" ? ddmmyyyy(new Date(d.date)) : "");
		}

		function calcRowsAboveByLaneNumber(input: number) {
			let res = 0;
			for (let j = 0; j < input; j++) {
				res += chartData.lanes[j].rows;
			}
			return res;
		}

		function addBoxes(boxData: IRectData[], heightOfBox: number) {
			const rects = main
				.append("g")
				.attr("id", "theBoxes")
				.selectAll("g")
				.data(boxData)
				.enter()
				.append("g")
				.attr("class", "box")
				.attr(
					"transform",
					d =>
						"translate(" +
						x(d.periode[0]) +
						", " +
						(y(d.rowsAbove + d.offset) + boxyoffset) +
						")"
				)
				.on("mouseover", (ev, dv) => {
					const ex = ev as any as { pageX: number, pageY: number };
					const d = dv as any as IRectData;
					if (!d.isTransparent) {
						tooltip
							.style("left", ex.pageX - 50 + "px")
							.style("top", ex.pageY + 10 + "px")
							.style("display", "inline-block")
							.style("text-align", "left")
							.html(ddmmyyyy(d.periode[0]) + " - " + ddmmyyyy(d.periode[1]) + "<br>" + d.tooltip + (d.afgangsaarsag !== "" ? ("<br>" + "<br>" + d.afgangsaarsag) : "")
							);
					}
				})
				.on("mouseout", () => tooltip.style("display", "none"));

			rects
				.append("rect")
				.attr("class", (d: any): any => classscale((d.laneid.toString()).toString()) + (d.isLectioControlled ? " lectioControlled" : " nonLectioControlled") + (d.hasInnerPeriod ? " isNotInSchool" : " isInSchool") + (d.isTransparent ? " isTransparent" : ""))
				.attr("height", heightOfBox - 3)
				.attr("width", d => boxWidth(d));

			rects
				.append("clipPath")
				.attr("id", d => "clip" + d.id)
				.append("rect")
				.attr("width", d => boxWidth(d))
				.attr("height", heightOfBox - 3)
				.attr("x", 0)
				.attr("y", 0);

			rects
				.append("text")
				.text(d => d.displayName)
				.attr("clip-path", d => "url(#clip" + d.id + ")")
				.attr("x", 4)
				.attr("y", boxHeight / 1.5)
				.attr("class", (d: any): any => (d.isTransparent ? "nonClickable" : ""));

			return rects;
		}

		function AddBoxesBottomLines(boxData: IRectData[], heightOfBox: number) {
			const rects = main
				.append("g")
				.attr("id", "theBottomLines")
				.selectAll("g")
				.data(boxData)
				.enter()
				.append("g")
				.attr("class", "box")
				.attr(
					"transform",
					d =>
						"translate(" +
						x(d.bottomLinePeriode ? d.bottomLinePeriode[0] : 0) +
						", " +
						(y(d.rowsAbove + d.offset) + boxHeight + (boxyoffset - boxyoffset / 3)) +
						")"
				).on("mouseover", (ev, dv) => {
					const ex = ev as any as { pageX: number, pageY: number };
					const d = dv as any as IRectData;

					tooltip
						.style("left", ex.pageX - 50 + "px")
						.style("top", ex.pageY + 10 + "px")
						.style("display", "inline-block")
						.html(
							"Forløb tilhørende: <br>" + d.displayName +
							"<br> Forløbs periode: <br>" +
							(d.bottomLinePeriode ? ddmmyyyy(d.bottomLinePeriode[0]) : "") +
							" - " +
							(d.bottomLinePeriode ? ddmmyyyy(d.bottomLinePeriode[1]) : "")
						);
				})
				.on("mouseout", () => tooltip.style("display", "none"));

			rects
				.append("line")
				.attr("stroke", "gray")
				.attr("stroke-width", boxyoffset / 3)
				.attr("x1", 0)
				.attr("x2", d => d.bottomLinePeriode ? x(d.bottomLinePeriode[1]) - x(d.bottomLinePeriode[0]) : 0);

			return rects;
		}

		function drawAxis() {

			const dom = x.domain();
			const monthInterval = Math.ceil(
				(dom[1].valueOf() - dom[0].valueOf()) /
				(1000 * 3600 * 24 * 365 * 1.5)
			);

			const xDateAxis1 = d3
				.axisBottom(x)
				.ticks(d3.timeYear)
				.tickFormat(d3.timeFormat("%Y") as any)
				.tickSize(5);

			const xDateAxis2 = d3
				.axisBottom(x)
				.tickValues(d3.timeMonths(dom[0], dom[1], monthInterval))
				.tickFormat(customMonths as any)
				.tickSize(-5);

			const xAxis = main
				.append("g")
				.attr("class", "xAxis")
				.attr(
					"transform",
					"translate(0," + (mainHeight + boxyoffset * 4) + ")"
				);

			const x1 = xAxis
				.append("g")
				.attr("class", "axis year")
				.call(xDateAxis1);
			const x2 = xAxis
				.append("g")
				.attr("class", "axis month")
				.call(xDateAxis2);

			xAxis
				.selectAll("g.axis.month .tick")
				.selectAll("text")
				.attr("y", -15);
		}

		// todayLine
		function drawTodayLine() {
			const now = new Date();
			//			if (chartData.minDate < now /*&& chartData.maxDate > now*/)
			main.select(".todayLine").remove();

			main
				.append("line")
				.attr("x1", x(now))
				.attr("y1", 0)
				.attr("x2", x(now))
				.attr("y2", mainHeight + boxyoffset)
				.attr("class", "todayLine");
		}

		function drawAssets() {
			clearAssets();
			AddBoxesAcrossLanes(chartData.pauses);
			drawAxis();
			addBoxes(dat, boxHeight);
			AddBoxesBottomLines(dat, boxHeight);
			addMarks(chartData.marks);
			drawTodayLine();
		}

		function AddBoxesAcrossLanes(data: IPause[]) {
			const dataAsRect = data.map(p => makepauserect(p));
			for (let i = 0; i < data.length; i++) {
				const rowsAboveStartLane = calcRowsAboveByLaneNumber(data[i].startLane);
				const rowsAboveEndLane = calcRowsAboveByLaneNumber(data[i].endLane + 1);
				addBoxes(dataAsRect[i], ((rowsAboveEndLane - rowsAboveStartLane) * rowHeight) - boxyoffset)
			};
		}

		function makepauserect(pause: IPause): IRectData[] {
			return [
				{
					id: Math.floor(Math.random() * 1000000),
					offset: 0,
					laneid: pause.startLane,
					numRows: 0,
					rowsAbove: calcRowsAboveByLaneNumber(pause.startLane),
					displayName: pause.displayName,
					tooltip: pause.toolTip,
					afgangsaarsag: "",
					periode: pause.periode.map(s => new Date(s)),
					bottomLinePeriode: undefined,
					isLectioControlled: false,
					hasInnerPeriod: false,
					isTransparent: false,
				}
			];
		}

		function clearAssets() {
			main.select(".xAxis").remove();
			main.selectAll("#theBoxes").remove();
			main.selectAll("#theBottomLines").remove();
			main.selectAll("#theMarks").remove();
			main.selectAll("#markerTexts").remove();
		}

		function brushed(event: any) {
			if (!event)
				return;
			if (zoombrush)
				return;
			zoombrush = true;
			const s = event.selection || xFull.range();
			x.domain(s.map(xFull.invert, xFull));
			drawAssets();
			svg
				.select(".main")
				.call(
					zoom.transform as any,
					d3.zoomIdentity
						.scale(width / (s[1] - s[0] + 200))
						.translate(-s[0] + sideMarginSize, -sideMarginSize)
				);
			zoombrush = false;
		}

		function zoomed(event: any) {
			if (!event)
				return;
			if (zoombrush)
				return;

			zoombrush = true;
			const t = event.transform;
			x.domain(t.rescaleX(xFull).domain());
			drawAssets();

			if (view === ViewStyleEnum.Full)
				svg
					.select(".overview")
					.select(".brush")
					.call(brush.move as any, x.range().map(t.invertX, t));
			zoombrush = false;
		}

		function defaultZoom(zoomYear: number) {
			// Lidt intelligent udvalg af zoom-perioden
			// tag 5 år tilbage i tid, og spol fremad indtil første data som starter før
			const lastDate = xFull.domain()[1];
			lastDate.setFullYear(lastDate.getFullYear() - zoomYear);
			lastDate.setMonth(lastDate.getMonth() - 1);

			const s = xFull.range();
			x.domain(s.map(xFull.invert, xFull));
			svg
				.select(".main")
				.call(
					zoom.transform as any,
					d3.zoomIdentity
						.scale((width) / (s[1] - xFull(lastDate) + 200))
						.translate(-xFull(lastDate) + sideMarginSize, -sideMarginSize)
				);
		}
		function fullZoom() {
			const s = xFull.range();
			x.domain(s.map(xFull.invert, xFull));
			svg
				.select(".main")
				.call(
					zoom.transform as any,
					d3.zoomIdentity
						.scale((width) / (s[1] - s[0] + 200))
						.translate(-s[0] + sideMarginSize, -sideMarginSize)
				);
		}


	}
}

// Allow .aspx to find the class
(window as any)["HistorikVisualizer"] = HistorikVisualizer;
