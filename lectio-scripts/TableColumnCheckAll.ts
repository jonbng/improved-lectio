import { HtmlUtilities } from "./HtmlUtilities";
import { LectioJSUtils } from "./LectioJSUtils";

export class TableColumnCheckAll {

	public static MarkColumn(box: HTMLInputElement, columnReference: string, tableName: string, findByCheckBoxName: boolean = false) {
		let parentCell;
		let columnIndex;
		const checkState = box.checked;

		if (!findByCheckBoxName) {
			TableColumnCheckAll.CheckboxColumnSetByHeader(checkState, columnReference); //$(box)
		} else {
			$('#' + tableName + ' [name=' + columnReference + '] input:checkbox').prop('checked', checkState);
		}

		//if (findByCheckBoxName === 'false')
		//{
		//	parentCell = document.getElementById(columnReference);
		//	columnIndex = parentCell.cellIndex;
		//}
		//var parentTable = document.getElementById(tableName);
		//var rows = parentTable.rows;


		//for (var i = 0; i < rows.length; i++) {
		//	var children;
		//	if (findByCheckBoxName === 'true') {
		//		if (document.getElementsByName(columnReference).length > i)
		//			children = document.getElementsByName(columnReference)[i].childNodes;
		//		else
		//			children = [0];
		//	}
		//	else
		//		children = rows[i].cells[columnIndex].childNodes;

		//	for (var j = 0; j < children.length; j++) {
		//		if (children[j].type === "checkbox" && !children[j].disabled) { children[j].checked = checkState; }
		//	}
		//}
	}

	public static CheckboxColumnSetByHeader(isChecked: boolean, headerCellName: string) {
		const clickedCell = $("#" + headerCellName);

		const row = clickedCell.closest('tr');
		const table = clickedCell.closest('table');
		const colToGet = row.children().index(clickedCell);
		const rowspans: (number | undefined)[] = new Array(1000);

		const tab = table.get(0) as HTMLTableElement;
		let rowidx = -1;
		const cblist: HTMLInputElement[] = [];
		for (const tr of tab.rows) {
			rowidx++;

			// hvis første række er brugt til paginering skipper vi den, ligeledes hvis sidste rækker er.
			if (tr.classList.contains("paging") && (rowidx == 0 || rowidx == tab.rows.length-1) ) {
				continue;
			}

			let prevele: HTMLTableCellElement | null = null;
			for (let colidx = 0; colidx <= colToGet; colidx++) {
				const rowspanskipUntil = rowspans[colidx];
				const isspanned = rowspanskipUntil && rowidx <= rowspanskipUntil;
				if (isspanned)
					continue;

				const cell: Element | null = prevele
					? prevele.nextElementSibling
					: tr.firstElementChild;

				if (!(cell instanceof HTMLTableCellElement))
					throw new Error('ikke cell');

				prevele = cell;

				if (cell.nodeName === 'TH')
					break;
				if (cell.nodeName !== 'TD')
					throw new Error('ikke td');

				const rowspan = cell.rowSpan;
				rowspans[colidx] = rowidx + (rowspan - 1);

				if (colidx < colToGet) {
					continue;
				}
				else if (colidx > colToGet) {
					throw new Error('huh, col idx ' + colToGet + ' blev ikke fundet.');
				}

				const cb = cell.querySelectorAll('input[type=checkbox]')
					.map(cb2 => LectioJSUtils.GetAssertedType(cb2, HTMLInputElement, 'input'))
					.filter(cb2 => !cb2.disabled)
					.singleOrDefault();
				if (cb)
					cblist.push(cb);
			}
		}
		// kun synlige, saa tabelsoening kan bruges i samspil.
		for (const cb of $(cblist).filter(':visible').toArray()) {
			cb.checked = isChecked;
		}
	}

	// Alternativt en selector funktion, så man kan vælge ud på ID.

	/* New LectioCheckAll Ctrl : */
	public static ToggleCheckBox(box: HTMLInputElement, xState: boolean) {
		const b = $(box);

		if (!(b.data("OrgVal") === true || b.data("OrgVal") === false)) {
			b.data("OrgVal", box.checked);
		}

		const td = b.parent("td");
		td.css("background-image", "");
		box.checked = xState;

		if (b.data("OrgVal") != box.checked) {
			td.css("background", "#fffbcc");
		}
	}

	public static CheckboxColumnSetById(xState: boolean, id: string, mark: boolean) {
		$("input[type=checkbox][id*=" + id + "]")
			.filter((a, e) => !LectioJSUtils.GetAssertedType(e, HTMLInputElement, 'input').disabled)
			.each(
				(a, e) => {
					if (!(e instanceof HTMLInputElement))
						throw new Error();
					if (mark) {
						if (e.checked !== xState) {
							TableColumnCheckAll.ToggleCheckBox(e, xState);
						}
					} else
						e.checked = xState;
				});
	}


	public static CheckboxColumnSetByIdAtTable(xState: boolean, tableId: string, id: string, mark: boolean) {
		$("table#" + tableId + " input[type=checkbox][id*=" + id + "]")
			.filter((a, e) => !LectioJSUtils.GetAssertedType(e, HTMLInputElement, 'input').disabled)
			.each(
				(a, e) => {
					if (!(e instanceof HTMLInputElement))
						throw new Error();
					if (mark) {
						if (e.checked !== xState) {
							TableColumnCheckAll.ToggleCheckBox(e, xState);
						}
					} else
						e.checked = xState;
				});
	}
}