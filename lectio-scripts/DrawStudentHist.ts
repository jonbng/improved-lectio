import { LectioJSUtils } from "./LectioJSUtils";
import { LectioGantt } from "./LectioGantt";

import Raphael from "raphael";

type StamdataDrawStudentHistRowInterval = {
	start: number; end: number; startDate: string; endDate: string; isActive: boolean;
}
type StamdataDrawStudentHistMark = {
	pos: number; title: string; date: Date;
}
type StamdataDrawStudentHistRow = {
	start: number; end: number; startDate: string; endDate: string;
	title: string; description: string; intervals: StamdataDrawStudentHistRowInterval[];
}

export class DrawStudentHist {
	public static DrawStudentHist(elementId: string, data: { rows: StamdataDrawStudentHistRow[], marks: StamdataDrawStudentHistMark[] }) {

		const paper = Raphael(elementId, 800, 200);

		const physDrawRange = { start: 130.0, end: 760.0 };
		const virtDrawRange = { start: 0.0, end: 1000.0 };

		const virtToPhys = (virt: number) => {
			LectioJSUtils.AssertArgument(virt >= virtDrawRange.start, "virt < virtDrawRange.start");
			LectioJSUtils.AssertArgument(virt <= virtDrawRange.end, "virt <= virtDrawRange.end");

			const pct = (virt - virtDrawRange.start) / (virtDrawRange.end - virtDrawRange.start);
			return pct * (physDrawRange.end - physDrawRange.start) + physDrawRange.start;
		};

		// Forloebslinier.
		let rowNum = 0;
		const heightPerRow = 50;
		$.each(data.rows, (_, row) => {
			const vertOffset = 60 + (rowNum * heightPerRow);
			rowNum++;

			// Hele tidslinien.
			//		paper.path(['M' + physDrawRange.start + ',' + vertOffset, 'l' + physDrawRange.end + ',' + '0']).
			//			attr({
			//				'stroke-dasharray': '-'
			//			});

			// Forloebets periode.
			paper.path(['M' + virtToPhys(row.start) + ',' + (vertOffset + 3), 'L' + virtToPhys(row.end) + ',' + (vertOffset + 3)]).
				attr({
					'stroke': 'gray',
					'stroke-width': '2',
					'title': row.startDate + ' - ' + row.endDate
				});

			const forloebRowTitle = row.title + "\r\n" + row.description;
			paper.text(0, vertOffset, forloebRowTitle).attr({ 'text-anchor': 'start' });

			// Intervaller.
			$.each(row.intervals, (_, interval) => {
				const physStart = virtToPhys(interval.start);
				let physEnd = virtToPhys(interval.end);

				// Vil undgaa at korte perioder forsvinder helt.
				const minPctWidth = 0.01;
				if ((physEnd - physStart) / (physDrawRange.end - physDrawRange.start) < minPctWidth) {
					physEnd = physStart + (physDrawRange.end - physDrawRange.start) * minPctWidth;
				}

				paper.path(['M' + physStart + "," + (vertOffset - 4), 'L' + physEnd + "," + (vertOffset - 4)]).
					attr({
						'title': interval.startDate + ' - ' + interval.endDate + (interval.isActive ? '' : '\r\nIkke aktiv'),
						'stroke-width': interval.isActive ? '4' : '2',
						'stroke': 'green',
						'stroke-dasharray': interval.isActive ? '' : '-'
					});
			});
		});
		const usedHeight = (rowNum + 1) * heightPerRow;
		let lastPos = -51;

		// indmeldelsesdato mv.
		$.each(data.marks, (_, mark) => {
			const markVertOffset = Math.floor(heightPerRow * 0.7);
			const nextpos = virtToPhys(mark.pos);
			let textoffset = 15;
			if (nextpos - lastPos < 50) {
				textoffset += 10;
			} else {
				textoffset = 15;
			}

			const diff = (usedHeight - markVertOffset);
			paper.path(['M' + nextpos + ',' + (markVertOffset), 'l' + '0' + ',' + (diff - 15)]).
				attr({
					'stroke-dasharray': '-'
				});
			paper.text(virtToPhys(mark.pos), mark.title.indexOf("Indmeld") == 0 ? usedHeight : textoffset, mark.title + "\r\n" + mark.date);
			lastPos = virtToPhys(mark.pos);
		});

		paper.setSize(800, usedHeight + 15);
	}

	public static DrawStudentSU(elementId: string, data: {
		months: { start: number, end: number, suMonth: boolean, title: string }[],
		periods: { start: number, end: number, suMonth: boolean, title: string }[],
		rows: { start: number, end: number, suMonth: boolean, title: string }[];
	}) {
		const paper = Raphael(elementId, 985, 15);

		let rows: LectioGantt.IGanttChartRow[] = [];

		//Months
		rows.push({
			intervals: data.months.map(month => <LectioGantt.IGanttChartInterval>{
				start: month.start,
				length: month.end - month.start,
				backgroundColor: month.suMonth ? LectioGantt.GanttChartBackgroundColor.Green : LectioGantt.GanttChartBackgroundColor.Red,
				title: month.title
			}),
			textAlign: "center"
		});

		//Periods
		rows.push({
			intervals: data.periods.map(period => <LectioGantt.IGanttChartInterval>{
				start: period.start,
				length: period.end - period.start,
				backgroundColor: LectioGantt.GanttChartBackgroundColor.LightGray,
				title: period.title
			}),
			textAlign: "center"
		});

		// Forloebslinier.
		const forloebrows = data.rows.map(row => {
			const interval = <LectioGantt.IGanttChartInterval>{
				start: row.start,
				length: row.end - row.start,
				backgroundColor: LectioGantt.GanttChartBackgroundColor.Yellow,
				title: row.title
			};

			return <LectioGantt.IGanttChartRow>{
				intervals: [interval],
				textAlign: "left"
			};
		});

		rows = rows.concat(forloebrows);

		LectioGantt.Draw(rows, paper);
	}
}