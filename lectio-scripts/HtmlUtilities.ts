import { LectioJSUtils } from './LectioJSUtils';


export namespace HtmlUtilities {
	export function Contains(ancestor: HTMLElement, descendant: HTMLElement) {
		// tslint:disable-next-line:no-bitwise
		return ancestor === descendant || Boolean(ancestor.compareDocumentPosition(descendant) & 16);
	}

	export function sortTable(e: Event | undefined) {
		function parseSize(val: string): number | undefined | null {
			if (val.indexOf(' B') > 0) {
				return parseInt(val.substring(0, val.indexOf(' B')), 10);
			}
			if (val.indexOf(' KB') > 0) {
				return parseInt(val.substring(0, val.indexOf(' KB')), 10) * 1024;
			}
			if (val.indexOf(' MB') > 0) {
				return parseInt(val.substring(0, val.indexOf(' MB')), 10) * 1048576;
			}
			if (val.indexOf(' GB') > 0) {
				return parseInt(val.substring(0, val.indexOf(' GB')), 10) * 1073741824;
			}

			return null;
		}

		function parseDate(valx: string) {
			//val = val.replace('-', ' ').replace('/', ' ').replace(':', ' ').replace(':', ' ');
			const val = valx.split(new RegExp("[^0-9]+")); //Splitter på alt muligt forskelligt
			let year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0;
			if (val.length >= 1) {
				day = parseInt(val[0], 10);
			}
			if (val.length >= 2) {
				month = parseInt(val[1], 10);
			}
			if (val.length >= 3) {
				year = parseInt(val[2], 10);
			}
			if (val.length >= 4) {
				hour = parseInt(val[3], 10);
			}
			if (val.length >= 5) {
				minute = parseInt(val[4], 10);
			}
			if (val.length >= 6) {
				second = parseInt(val[5], 10);
			}
			return new Date(year, month, day, hour, minute, second);
		}

		function elementValue(e2: Node) {
			let s = '';

			if (e2 instanceof HTMLElement) {
				const v2 = e2.getAttribute('sortKey');
				if (v2 !== null) {
					return v2;
				}

				if (e2 === null || e2.childNodes === null) {
					return s;
				}
				let i2: number;
				const c = e2.childNodes;
				for (i2 = 0; i2 < c.length; i2++) {
					s += elementValue(c[i2]);
				}
			} else if (e2.nodeType === 3) {
				s = (e2 as any).data;
			}

			return s;
		}

		function replaceStr(s: string, s1: string, s2: string) {
			let startpos = 0;
			let pos: number;

			// tslint:disable-next-line:no-conditional-assignment
			while ((pos = s.indexOf(s1, startpos)) >= 0) {
				s = s.substring(0, pos) + s2 + s.substring(pos + s1.length);
				startpos = pos + s2.length;
			}

			return s;
		}

		if (!e) {
			e = window.event;
		}
		let th = LectioJSUtils.GetAssertedType(e!.target, HTMLElement, 'htmlelement');
		if (!th)
			throw new Error('th er null?');
		if (th instanceof Text) {
			th = LectioJSUtils.GetAssertedType(th.parentNode, HTMLElement, 'element');
		}
		let i: number;
		for (i = 0; i < 2; i++) { // for instance a <b></b> tag
			if (!th || th.tagName !== 'TD' && th.tagName !== 'TH') {
				th = LectioJSUtils.GetAssertedType(th.parentNode, HTMLElement, 'parent');
			}
		}

		if (!th || th.tagName !== 'TD' && th.tagName !== 'TH') {
			return;
		}
		//TestLog('SortTable');
		let rows: HTMLCollectionOf<HTMLTableRowElement>;
		let sortColIdx: number;
		let rowContainer: HTMLElement;
		let startRow = 0;

		startRow = th.tagName === 'TH' ? 1 : 0;
		// Vi ønsker ikke at sortere headerlinien med. Grid har ikke thead-tag,
		// derfor denne metode. Burde også gælde for IE!
		// Bortset fra dette ville det være rimeligt at antage at man altid
		// havde klikket på en header celle og denne række derfor ikke skulle
		// sorteres!
		// Se https://macom016.macom.dk/lectio/52/test/javascripttest.aspx# for
		// test - her er header med både th og td
		if (th.parentNode == null || th.parentNode.parentElement == null ||
			th.parentNode.parentNode == null)
			throw new Error('p');

		const p2 = th.parentNode.parentNode;
		if (p2 instanceof HTMLTableElement) {
			rowContainer = p2;
			rows = p2.tBodies[0].rows;
			//TestLog('1rows: ' + rows.length);
		} else {
			// mozilla && netscape does not have tBodies according to w3schools
			if (!(p2.parentNode instanceof HTMLTableElement))
				throw new Error('p2');
			rowContainer = p2.parentNode.tBodies[0];
			rows = p2.parentNode.tBodies[0].rows;
			startRow = 0;
		}
		const sortStateElement = rowContainer; // a TABLE.
		sortColIdx = 0;
		for (let i = 0; i < th.parentNode.childNodes.length; i++) {
			const cell = th.parentNode.childNodes[i] as Node;
			if (cell.isSameNode(th)) {
				break;
			}
			if (cell.nodeType === 1) {
				sortColIdx++;
			}
		}

		const srows = new Array(rows.length);

		const compareType = (arguments.length > 1) ? arguments[1] : "s";

		// Get the sort values.
		for (let i = startRow; i < rows.length; i++) {
			const vs = elementValue(rows[i].cells[sortColIdx]);
			let v: any;
			switch (compareType) {
			case 'i':
				if (vs == null || vs === '')
					v = -1000000;
				else
					v = parseInt(replaceStr(vs, '.', ''), 10);
				break;
			case 'f':
				v = parseFloat(replaceStr(vs, ',', '.'));
				break;
			case 'filesize':
				v = parseSize(vs);
				break;
			case 'date':
				v = parseDate(vs);
				break;
			case 's':
				v = vs.toLocaleUpperCase();
				break;
			default:
				v = vs;
				break;
			}
			srows[i] = [v, rows[i]];
		}

		// Determine how to sort.
		const prevSortColIdx = Number(sortStateElement.getAttribute('previousSortColumnIndex'));
		const prevSortDir = Number(sortStateElement.getAttribute('previousSortDirection'));
		if (!(th instanceof HTMLTableCellElement))
			throw new Error('table');
		let newSortDir = 1;
		if (prevSortColIdx === th.cellIndex) {
			newSortDir = prevSortDir * -1;
		} else if (prevSortDir === null && prevSortColIdx === null && arguments.length > 2 && arguments[2] === '-') {
			newSortDir = -1;
		}

		sortStateElement.setAttribute('previousSortColumnIndex', th.cellIndex.toString());
		sortStateElement.setAttribute('previousSortDirection', newSortDir.toString());

		let compareFunc: (a: any, b: any) => number;
		if (compareType === "s") {
			compareFunc = (a, b) => a[0].localeCompare(b[0]) * newSortDir;
		}
		else {
			compareFunc = (a, b) => {
				if (a[0] === b[0])
					return 0;
				if (a[0] < b[0])
					return newSortDir;
				return -newSortDir;
			};
		}

		srows.sort(compareFunc);

		// Rebuild.
		for (let i = startRow; i < rows.length - startRow; i++) {
			rowContainer.appendChild(srows[i][1]);
		}
	}
}
