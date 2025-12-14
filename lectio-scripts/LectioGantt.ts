import {LectioJSUtils} from "./LectioJSUtils";
import "raphael";

export namespace LectioGantt {
	export enum GanttChartBackgroundColor {
		Green,
		Red,
		LightGray,
		Yellow,
		LightBlue,
	}

	export interface IGanttChartRow {
		intervals: IGanttChartInterval[];
		textAlign: string;
	}
	export interface IGanttChartInterval {
		start: number;
		length: number;
		backgroundColor: GanttChartBackgroundColor;
		title: string;
	}

	export function Draw(rows: IGanttChartRow[], paper: RaphaelPaper) {
		const physDrawRange = { start: 10.0, end: 990.0 };
		const virtDrawRange = { start: 0.0, end: 1000.0 };

		const virtToPhys = (virt: number) => {
			LectioJSUtils.AssertArgument(virt >= virtDrawRange.start, "virt < virtDrawRange.start");
			LectioJSUtils.AssertArgument(virt <= virtDrawRange.end, "virt <= virtDrawRange.end");

			const pct = (virt - virtDrawRange.start) / (virtDrawRange.end - virtDrawRange.start);
			return pct * (physDrawRange.end - physDrawRange.start) + physDrawRange.start;
		};
		// Tegn dem.
		let rowNum = -1;
		let usedHeight = 0;
		rows.forEach(row => {
			rowNum++;
			const rowHeight = rowNum === 0 ? 25 : 30;
			const vertOffset = usedHeight;
			usedHeight += rowHeight;
			const cornerRadius = rowNum === 0 ? 4 : 5;
			const vertMargin = rowNum === 0 ? 0 : 2.5;
			const boxHeight1 = rowNum === 0 ? 25 : 15;
			const boxHeight2 = rowNum === 0 ? null : 20;
			const fontFamily = rowNum === 0 ? "verdana" : "arial";
			const strokeWidth = rowNum === 0 ? "2" : "0.2";
			const stroke = rowNum === 0 ? 'white' : '#666';

			row.intervals.forEach(interval => {
				let fontColor: string;
				let fill: string;
				if (interval.backgroundColor === GanttChartBackgroundColor.Red) {
					fill = "90-#B80000-#ff0000";
					fontColor = "white";
				}
				else if (interval.backgroundColor === GanttChartBackgroundColor.Green) {
					fill = "90-#339900-#ccff66";
					fontColor = "white";
				}
				else if (interval.backgroundColor === GanttChartBackgroundColor.LightGray) {
					fill = '90-#fafafa:#f7f7f7';
					fontColor = "";
				}
				else if (interval.backgroundColor === GanttChartBackgroundColor.Yellow) {
					fill = "90-#E8B611-#ffdf0d";
					fontColor = "";
				}
				else if (interval.backgroundColor === GanttChartBackgroundColor.LightBlue) {
					fill = "90-#008099-#66e6ff";
					fontColor = "white";
				}
				else
					throw new Error("ukendt farve:" + interval.backgroundColor);

				const boxattribs: { [n: string]: string | number } = {
					'stroke': stroke,
					'stroke-width': strokeWidth,
					'fill': fill,
					'title': interval.title,
				};
				if (boxHeight2 != null) {
					boxattribs.height = boxHeight2;
				}
				const box = paper.rect(virtToPhys(interval.start), (vertOffset + vertMargin), virtToPhys(interval.start + interval.length) - virtToPhys(interval.start), boxHeight1, cornerRadius)
					.attr(boxattribs);

				const fontattribs: { [n: string]: any } = { "font-family": fontFamily, "font-size": 11 };
				if (fontColor)
					fontattribs.fill = fontColor;
				if (row.textAlign === "left") {
					fontattribs['text-anchor'] = 'start';
					paper.text(virtToPhys(interval.start) + 2, box.attr("y") + box.attr("height") / 2, interval.title).
						attr(fontattribs);
				}
				else if (row.textAlign === "center")
					paper.text(virtToPhys(interval.start) + (virtToPhys(interval.start + interval.length) - virtToPhys(interval.start)) / 2, box.attr("y") + box.attr("height") / 2, interval.title).
						attr(fontattribs);
				else
					throw new Error('ukendt align');
			});
		});

		paper.setSize(1000, usedHeight);
	}
}
