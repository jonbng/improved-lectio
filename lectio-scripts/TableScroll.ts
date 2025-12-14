import { HTML } from "mermaid/dist/diagram-api/types.js";
import { CssUtil } from "./CssUtil";

export class TableScroll {
	public static InitializeTableScrolling() {
		const tables = $('*[lectio-behavior~=scroll-fix-header]');
		for (const tableOrGridDom of tables) {
			const tableOrGrid = $(tableOrGridDom);
			let cells;
			if (tableOrGridDom.nodeName === 'TABLE') {
				// KVI: Please just put everything you want scrolling inside THEAD...
				const hasHead = tableOrGrid.find('> thead').length !== 0;
				if (hasHead) {
					const ths = tableOrGrid.find('> thead > tr > th');
					const tds = tableOrGrid.find('> thead > tr > td');
					cells = ths.add(tds);
				}
				else {
					const usesTh = tableOrGrid.find('> tbody > tr:eq(0) > th').length !== 0;
					const firstRowCells = tableOrGrid.find('> tbody > tr:eq(0) > ' + (usesTh ? 'th' : 'td'));
					const secondRowCells = tableOrGrid.find('> tbody > tr:eq(1) > th');
					cells = firstRowCells.add(secondRowCells);
				}
			}
			else if (tableOrGridDom.nodeName === 'DIV') {
				// antag css grid.
				const grid = tableOrGridDom;
				const headerRows = $(grid).find('gahry');
				cells = headerRows.children();

			} else throw new Error('Kender ikke elemente til scroll fix.');
			TableScroll.FixRows(cells);
		}
	}

	private static fixedElementRuleCounter = 0;
	private static tableElement: HTMLElement | null;
	public static FixRows(cells: JQuery) {
		if (cells.length === 0)
			return;

		const cellRepr = cells[0];
		if (cellRepr.id.search('HoldHeadCell') || cellRepr.nodeName === 'TD') {
			TableScroll.tableElement = cellRepr.parentElement!.parentElement!.parentElement!;
		} else {
			TableScroll.tableElement = cellRepr.parentElement!.parentElement!;
		}

		const tableElement = TableScroll.tableElement;

		const headerRowElementName = cells[0].parentElement!.nodeName;
		const fixit = () => {
			// position.top tager translationen med.
			// IE 9 kan ikke transform/translate på thead eller tr.
			const tableBR = tableElement.getBoundingClientRect();
			if (tableBR.top < 0 && tableBR.bottom > 0) {
				cells.css('transform', 'translate(0px, ' + Math.floor(tableBR.top * -1) + 'px)');
				cells.closest(headerRowElementName).addClass('fixedTableHeaderRow');
			} else {
				cells.css('transform', '');
				cells.closest(headerRowElementName).removeClass('fixedTableHeaderRow');
			}
		}
		$(window).on('scroll', fixit);
		$(fixit);
	}

	public static FixColumn(cells: JQuery) {
		if (cells.length === 0)
			return;

		const headPosX = cells.first().position().left;
		const updateTranslate = () => {
			if (window.pageXOffset > headPosX) {
				const offsetX = window.pageXOffset - headPosX;
				cells.css('transform', 'translate(' + Math.floor(offsetX) + 'px, 0px)');
			} else {
				cells.css('transform', '');
			}
		};
		$(window).on('scroll', updateTranslate);
		$(window).on('beforeprint', () => {
			cells.css('transform', '');
		});
		$(window).on('afterprint', () => {
			updateTranslate();
		});
	}

	public static FixColumnRight(cells: JQuery) {
		if (cells.length === 0)
			return;

		let headPosX = 1000;
		const setup = () => {
			cells.css('transform', '');

			const rights = $.map(cells, (c) => {
				const $c = $(c as any);
				const pos = $c.position();
				return Math.ceil(pos.left + <number>$c.width());
			});
			headPosX = Math.max.apply(null, rights);
		};

		setup();
		const updateTranslate = (e: JQuery.Event | null) => {
			setup();
			const offsetX = headPosX - window.pageXOffset - document.body.clientWidth;
			if (offsetX > 0)
				cells.css('transform', 'translate(-' + Math.floor(offsetX) + 'px, 0px)');
			else
				cells.css('transform', '');
		};
		$(window).on('scroll', e => updateTranslate(e));
		$(window).on('beforeprint', () => {
			cells.css('transform', '');
		});
		$(window).on('afterprint', e => {
			updateTranslate(e);
		});
		$(window).on('resize', e => updateTranslate(e));
		// and call once
		updateTranslate(null);
	}

	// AHM 2025/08
	public static InitializeFixHeaderAndCol() {
		$(window).on('resize', e => TableScroll.temp());
		TableScroll.temp();
	}

	// AHM 2025/08
	private static temp() {
		// Fixes header row. Hvis der er en superheader bliver header rækken under sat, så top passer
		let tables = $('table:has(tr.ls-scroll-fix-header)');
		for (const tableOrGridDom of tables) {
			const tableOrGrid = $(tableOrGridDom);
			let cells;
			if (tableOrGridDom.nodeName === 'TABLE') {
				// KVI: Please just put everything you want scrolling inside THEAD...

				const headerRows = tableOrGrid.find('> tbody > tr.ls-scroll-fix-header');
				if (headerRows.length > 1) {
					const underHeaderRows = headerRows.slice(1);
					let top = headerRows.first().get(0)!.getBoundingClientRect().height + parseInt(window.getComputedStyle(headerRows.first().get(0) as Element).top.slice(0, -2));
					if (!top)
						continue;

					for (const hr of underHeaderRows) {
						hr.style.top = top + 'px';
						top += hr.getBoundingClientRect().height;
					}
				}
			}
		}

		// Hvis superheader er i første række og man fixer har ScrollFixFirstColumn=True løser den alle søjler superheader spanner
		tables = $('table:has(tr.ls-second-header-row-superheader-in-first-col)');
		for (const tableOrGridDom of tables) {
			const tableOrGrid = $(tableOrGridDom);
			let cells;
			if (tableOrGridDom.nodeName === 'TABLE') {

				const headerRows = tableOrGrid.find('> tbody > tr');
				const colSpan = parseInt(headerRows.first().get(0)!.children.first().getAttribute("colspan") ?? "1");
				const colWidth = new Array<number | undefined>(headerRows.length); // Gemmer brede for performance
				colWidth[0] = headerRows[1].children[0].getBoundingClientRect().width + parseInt(window.getComputedStyle(headerRows[1].children[0]).left.slice(0, -2));
				for (const hr of headerRows.slice(1)) {

					// Sætter left for alle td, der har inder superheaderen.
					for (let i = 1; i < colSpan; i++) {
						const child = hr.children[i] as HTMLElement;
						if (!colWidth[i]) {
							colWidth[i] = colWidth[i - 1]! + child.getBoundingClientRect().width;
						}

						child.style.left = colWidth[i - 1] + 'px';
						child.style.position = 'sticky';
					}
				}
			}
		}
	}
}
