import { EventMods, LectioJSUtils, Writeable } from "./LectioJSUtils";
import { SkemaForsideUtils } from "./SkemaForsideUtils"

export namespace SkemaUge {

	let chbType: string;
	let containerID: string;
	let firstCol: number;
	let lastCol: number;
	let firstRow: number;
	let lastRow: number;
	let selectionevent_LastMouseDownCtrlBrikId: string | undefined;

	export function Initialize(containerId: string, skemaUgeIdSkemaForside = ""): void {
		containerID = containerId;
		const contentDiv = document.getElementById(containerId);
		if (!contentDiv)
			return;
		if (LectioJSUtils.HasBeenHere(contentDiv, 'skemauge'))
			return;

		chbType = "module";
		firstCol = 1;
		firstRow = 2;
		lastCol = Number(contentDiv.getAttribute('data-maxCol'));
		lastRow = Number(contentDiv.getAttribute('data-maxRow'));

		/* ***************************/
		/* ********** expansion ******/
		/* ***************************/

		$(contentDiv).on('mousedown', '.skemaweekWeek',
			evt => expansionevent_HandleEverything(
				mkpred({ dims: ['col'], includeHolidays: true }, evt.target),
				evt));

		$(contentDiv).on('mousedown', '.skemaweekWeekDay',
			evt => expansionevent_HandleEverything(
				mkpred({ dims: ['col', 'weekday'], includeHolidays: true }, evt.target),
				evt));

		$(contentDiv).on('mousedown', '.skemaweekWeekDayAlle',
			evt => expansionevent_HandleEverything(
				mkpred({ dims: ['weekday'], includeHolidays: true }, evt.target),
				evt));

		$(contentDiv).on('mousedown', '.skemaweekModuleContainer[data-rowcol~=c1] > span',
			evt => expansionevent_HandleEverything(
				mkpred({ dims: ['row'], includeHolidays: true }, evt.target.parentElement),
				evt));

		/* ********************** */
		/* ****** selection ***** */
		/* ********************** */

		$(contentDiv).on('click', '.skemaweekWeek',
			evt => select_HandleEverything(
				mkpred({ dims: ['col'], includeHolidays: false }, evt.target),
				evt, skemaUgeIdSkemaForside));

		$(contentDiv).on('click', '.skemaweekWeekDay',
			evt => select_HandleEverything(
				mkpred({ dims: ['col', 'weekday'], includeHolidays: true }, evt.target),
				evt, skemaUgeIdSkemaForside));

		$(contentDiv).on('click', '.skemaweekWeekDayAlle',
			evt => select_HandleEverything(
				mkpred({ dims: ['weekday'], includeHolidays: true }, evt.target),
				evt, skemaUgeIdSkemaForside));

		$(contentDiv).on('click', '.skemaweekModuleContainer[data-rowcol~=c1] > span',
			evt => select_HandleEverything(
				mkpred({ dims: ['row'], includeHolidays: false }, evt.target.parentElement),
				evt, skemaUgeIdSkemaForside));

		$(contentDiv).on('click', '.skemaweekModuleContainer > input[type~=checkbox]',
			evt => {
				select_HandleEverything(
					mkpred({ dims: ['single'], includeHolidays: false }, evt.target.parentElement),
					evt, skemaUgeIdSkemaForside);
			});

		SkemaForsideUtils.SetupBrikIndividualSelection(contentDiv, skemaUgeIdSkemaForside, containerID);
		$(contentDiv).on('keydown', '.s2skemabrik',
			evt => keyboardDown(evt, skemaUgeIdSkemaForside));

		$(contentDiv).on('click', '.skemaweekModuleContainer > input',
			() => {
				if (skemaUgeIdSkemaForside)
					SkemaForsideUtils.postValgteBrikkerOgModuler(skemaUgeIdSkemaForside, containerID);
			});


		/* ***************************/
		/* ********** hover **********/
		/* ***************************/

		$(contentDiv).on('mouseover mouseout', '.skemaweekWeek',
			evt => highlightingevent_HandleEverything(
				mkpred({ dims: ['col'], includeHolidays: false }, evt.target),
				evt.type === 'mouseover'));

		$(contentDiv).on('mouseover mouseout', '.skemaweekWeekDay',
			evt => highlightingevent_HandleEverything(
				mkpred({ dims: ['col', 'weekday'], includeHolidays: true }, evt.target),
				evt.type === 'mouseover'));

		$(contentDiv).on('mouseover mouseout', '.skemaweekWeekDayAlle',
			evt => highlightingevent_HandleEverything(
				mkpred({ dims: ['weekday'], includeHolidays: true }, evt.target),
				evt.type === 'mouseover'));

		$(contentDiv).on('mouseover mouseout', '.skemaweekModuleContainer[data-rowcol~=c1] > span',
			evt => highlightingevent_HandleEverything(
				mkpred({ dims: ['row'], includeHolidays: true }, evt.target.parentElement),
				evt.type === 'mouseover'));

		/* ***************************/
		/* ********** checkbox *******/
		/* ***************************/

		$(contentDiv).on('focusin focusout', 'input:checkbox[data-type=sb]',
			evt => highlightSkemabrik(
				LectioJSUtils.GetAssertedType(evt.target, HTMLInputElement),
				evt.type === 'focusin'));


		/* ****************************/
		/* **** Keyboard Navigation ***/
		/* ****************************/
		$(contentDiv).on('keydown', '.skemaweekModuleContainer > input[type~=checkbox]', 
			evt => keyboardDown(evt, skemaUgeIdSkemaForside));

	}

	type ModulePredicate = Readonly<{
		row?: number;
		col?: number;
		weekday?: string;
		includeHolidays: boolean;
	}>;

	/*************************************************/
	/************* shared helpers begin **************/
	/*************************************************/

	function mkpred(input: { dims: ('col' | 'weekday' | 'row' | 'single')[], includeHolidays: boolean }, ele: any): ModulePredicate {
		LectioJSUtils.AssertType(ele, HTMLElement);

		const pred: Writeable<ModulePredicate> = {
			includeHolidays: input.includeHolidays
		};
		for (const dim of input.dims) {
			switch (dim) {
			case 'single':
				pred['row'] = getRow(ele);
				pred['col'] = getCol(ele);
				break;
			case 'row':
				pred[dim] = getRow(ele);
				break;
			case 'col':
				pred[dim] = getCol(ele);
				break;
			case 'weekday':
				pred[dim] = getWeekDay(ele);
				break;
			default:
				LectioJSUtils.AssertNever(dim, 'n');
			}
		}            
		return pred;
	}

	function getRow(ele: HTMLElement): number {
		let mm = ele.getAttribute('data-rowcol')?.match(/\br([0-9]+)\b/);
		if (!mm)
			mm = ele.parentElement?.getAttribute('data-rowcol')?.match(/\br([0-9]+)\b/);
		if(!mm)
			throw new Error('mangler row');
		return parseInt(mm[1]);
	}

	function getColNullable(ele: HTMLElement): number | null {
		let mm = ele.getAttribute('data-rowcol')?.match(/\bc([0-9]+)\b/);
		if (!mm)
			mm = ele.parentElement?.getAttribute('data-rowcol')?.match(/\bc([0-9]+)\b/);
		if (!mm)
			return null;
		return parseInt(mm[1]);
	}

	function getCol(ele: HTMLElement): number {
		const col = getColNullable(ele);
		if (!col)
			throw new Error('mangler col');
		return col;
	}

	function getWeekDay(ele: HTMLElement): string {
		const day = ele.getAttribute('data-day');
		if (!day) throw new Error('mangler data-day');
		return day;
	}


	function CreateCssPredicates(predicate: ModulePredicate): string {
		const preds: string[] = [];
		if (predicate.row)
			preds.push(`[data-rowcol~=r${predicate.row}]`);
		if (predicate.col)
			preds.push(`[data-rowcol~=c${predicate.col}]`);
		if (predicate.weekday)
			preds.push(`[data-day~=${predicate.weekday}]`);
		if (!predicate.includeHolidays)
			preds.push(`:not(.holiday)`);
		return preds.join('');
	}

	function CreateCssPredicatesForUncheckingOthers(predicate: ModulePredicate): string[] {
		const preds: string[] = [];
		if (predicate.row)
			preds.push(`:not([data-rowcol~=r${predicate.row}])`);
		if (predicate.col)
			preds.push(`:not([data-rowcol~=c${predicate.col}])`);
		if (predicate.weekday)
			preds.push(`:not([data-day~=${predicate.weekday}])`);
		return preds;
	}

	export function DoPostback(skemaid: string | undefined, action: string, postbackArg: string): void {
		LectioJSUtils.AssertNotNullOrEmpty(skemaid, 'skemaIdForPostback');
		window.__doPostBack(skemaid, action + ' ' + postbackArg);
	}

	/*************************************************/
	/************* expansion begin *******************/
	/*************************************************/

	export function expandAll(): void {
		expansionevent_HandleEverything(
			{ includeHolidays: true },
			{ altKey: false, ctrlKey: false, shiftKey: false, metaKey: false, button: 2 });
	}

	function expansionevent_HandleEverything(predicate: ModulePredicate, evt: EventMods): void {
		if (!(evt.button === 2 && LectioJSUtils.GetEventModifiers(evt) === ''))  // right click
			return;

		const preds = CreateCssPredicates(predicate);
		const buttonSelector = `:scope > *${preds} a.lc-expander-link`;
		const buttons = SkemaForsideUtils.getContentAncestor(containerID).querySelectorAll(buttonSelector);

		const allExpanded = buttons.filter(b => b.matches('[data-state=expanded]')).length === buttons.length;
		const themstate = allExpanded ? 'expanded' : 'collapsed';
		const toToggle = buttons.filter(b => b.matches(`[data-state=${themstate}]`));
		$(toToggle).trigger('click');
	}

	function select_HandleEverything(predicate: ModulePredicate, mods: EventMods, skemaId: string | undefined): void {
		const lecMods = LectioJSUtils.GetEventModifiers(mods);
		const ctrl_pressed = lecMods === LectioJSUtils.GetCtrlKeyOSSpecific();
		if (!(mods.button === 0 && (lecMods === '' || ctrl_pressed)))
			return;

		const target_is_single_checkbox: boolean = !(typeof predicate['row'] === 'undefined' || typeof predicate['col'] === 'undefined');

		// checkboxes.
		const preds = CreateCssPredicates(predicate);
		const cbSelector = `:scope > *${preds} input[type=checkbox]`;
		const cbs = SkemaForsideUtils.getContentAncestor(containerID).querySelectorAll(cbSelector);
		const cbAllChecked = $(cbs).filter(':checked').length === cbs.length;

		const allCbSelector = `:scope > * input[type=checkbox]`;
		const allCbs = SkemaForsideUtils.getContentAncestor(containerID).querySelectorAll(allCbSelector);
		const otherCbsChecked = $(allCbs).filter(':checked').length > $(cbs).filter(':checked').length;

		let allChecked: boolean;

		let operation: 'add' | 'remove' | 'replace';

		// Valgte brikker.
		if (skemaId) {
			const brikSelector = `:scope > *${preds} .s2skemabrik`;
			const brikker = SkemaForsideUtils.getContentAncestor(containerID).querySelectorAll(brikSelector).filter(brik => brikIsFocusable(brik as HTMLElement));
			//const brikkerAllChecked = brikker.filter(brik => brik.matches('.s2selected')).length === brikker.length;
			allChecked = cbAllChecked;

			operation = SkemaForsideUtils.get_select_operation(ctrl_pressed, target_is_single_checkbox, otherCbsChecked, allChecked);

			SkemaForsideUtils.selection_change(brikker, operation, SkemaForsideUtils.getContentAncestor(containerID));
		}
		else
			allChecked = cbAllChecked;
			operation = SkemaForsideUtils.get_select_operation(ctrl_pressed, target_is_single_checkbox, otherCbsChecked, allChecked);

		switch (operation) {
			case 'add': {
				$(cbs).prop('checked', true).trigger('change');
				break;
			}
			case 'remove': {
				$(cbs).prop('checked', false).trigger('change');
				break;
			}
			case 'replace': {
				const predsToUncheck = CreateCssPredicatesForUncheckingOthers(predicate);
				for (const pred of predsToUncheck) {
					const cbSelectorToUncheck = `:scope > *${pred} input[type=checkbox]`;
					const cbsToUncheck = SkemaForsideUtils.getContentAncestor(containerID).querySelectorAll(cbSelectorToUncheck);
					$(cbsToUncheck).prop('checked', false).trigger('change');
				}
				$(cbs).prop('checked', true).trigger('change');
				break;
			}
		}
		if (skemaId)
			SkemaForsideUtils.postValgteBrikkerOgModuler(skemaId, containerID);
	}

	/*************************************************/
	/************* highlighting begin ****************/
	/*************************************************/

	function highlightingevent_HandleEverything(predicate: ModulePredicate, enable: boolean): void {
		const preds = CreateCssPredicates(predicate);
		const cellSelector = `:scope > *${preds}`;
		const cells = SkemaForsideUtils.getContentAncestor(containerID).querySelectorAll(cellSelector);
		$(cells).toggleClass('highlightSelection', enable);
	}

	// Highlight skemabrik when focused
	function highlightSkemabrik(chb: HTMLInputElement, enable: boolean): void {
		const xx = chb.closest('[data-rowcol]');
		LectioJSUtils.AssertArgument(xx instanceof HTMLElement);
		const absenseID = $(chb).attr('data-absenseID');
		const rowNum = getRow(xx);
		const colNum = getColNullable(xx);
		if (!absenseID) throw new Error('mangler attribs');
		const skemabrik = $(`.skemaweekSkemabrik[data-absenseID=${absenseID}][data-rowcol~=r${rowNum}][data-rowcol~=c${colNum}]`);
		skemabrik.toggleClass('highlightSelectionSkemabrik', enable);
	}

	/*************************************************/
	/************* wtf begin *************************/
	/*************************************************/

	function keyboardDown(e: JQuery.KeyDownEvent, skemaid?: string, ): void {
		const is_target_checkbox = (e.target as HTMLElement)?.getAttribute('type') == 'checkbox';
		const target_modul = skemaid
			? (e.target as HTMLElement)?.closest("#" + skemaid?.replace(/\$/g, "_") + "_contentDiv")
			: (e.target as HTMLElement)?.closest("#m_Content_skemaUge_contentDiv");

		if (!target_modul)
			return;

		// Brik nummer, hvis det fokuserede er en brik
		const parent = e.target.parentNode as HTMLElement;
		const idxNum = Array.prototype.indexOf.call(parent.children, e.target);

		const movedata = getMoveData(is_target_checkbox);
		if (!movedata)
			return;
		const {colNum, rowNum} = movedata;

		switch (e.key) {
			case "ArrowLeft":
				moveLeftFrom(colNum, rowNum, idxNum, is_target_checkbox);
				break;
			case "ArrowUp":
				moveUpFrom(colNum, rowNum, idxNum, is_target_checkbox);
				break;
			case "ArrowRight":
				moveRightFrom(colNum, rowNum, idxNum, is_target_checkbox);
				break;
			case "ArrowDown":
				moveDownFrom(colNum, rowNum, idxNum, is_target_checkbox);
				break;
			case "Tab":
				changeCheckboxType(colNum, rowNum, is_target_checkbox);
				break;
			case "%":
				toggleExpandCell(colNum, rowNum);
				break;
			case " ": //Space skal bare håndteres samme sted som når vi gør det for checkbox, ingen grund til at gøre det særskilt her.
				if (is_target_checkbox) {
					(e.target as HTMLInputElement).checked = !(e.target as HTMLInputElement).checked;

					const mods = {
						ctrlKey: true,
						altKey: false,
						shiftKey: false,
						metaKey: false,
						button: 0,
					}

					select_HandleEverything(
						mkpred({ dims: ['single'], includeHolidays: false }, e.target.parentElement),
						mods, skemaid
					);
				}
				else {
					SkemaForsideUtils.selectionevent_SpaceDown(e, skemaid, containerID);
				}
					
				break;
			default:
				return;
		}
		e.preventDefault(); //Prevent the default action (scroll / move caret)
	}

	function changeCheckboxType(colNum: number, rowNum: number, is_currently_in_checkbox: boolean): void {
		if (is_currently_in_checkbox)
		{
			const newElement = document.querySelector(`div.skemaweekSkemabrikContainer[data-rowcol='r${rowNum} c${colNum}']`)?.querySelector('a');
			if (newElement) {
				newElement.focus();
			}
		}
		else
			moveToCheckboxAtIndex(colNum, rowNum)
	}

	function getCellFromCR(colNum: number, rowNum: number): HTMLElement | null {
		// Finder HTML-elementet for en celle ud fra kolonne og rækkenummer
		return document.querySelector(`div.skemaweekSkemabrikContainer[data-rowcol='r${rowNum} c${colNum}']`);
	}

	function focusBrik(brik: HTMLElement): void {
		LectioJSUtils.AssertType(brik, HTMLElement);

		brik.focus();
	}

	function cellHasFocusableBrikAtIdx(colNum: number, rowNum: number, idxNum: number): boolean {
		// Checker om en celle har mindst idxNum brikker i sig. Checker ikke om disse er synlige, i.e. om cellen er udvidet eller ej. Brug cellIsExpanded til dette.
		const thisCell: HTMLElement | null = getCellFromCR(colNum, rowNum);

		const brikkerInCell = (thisCell as HTMLElement).querySelectorAll('a.s2skemabrik');

		return brikkerInCell.length > idxNum && brikIsFocusable(brikkerInCell[idxNum] as HTMLElement);
	}

	function getCellExpansionElement(colNum: number, rowNum: number): HTMLElement | null {
		// Checker om en celle på en given position er udvidet eller ej
		const thisCell: HTMLElement = getCellFromCR(colNum, rowNum) as HTMLElement;

		// Find knappen der skal trykkes på for at udvide cellen
		return thisCell.querySelector('a.lc-expander-link');
	}

	function cellIsExpanded(colNum: number, rowNum: number): boolean {
		// Find knappen der skal trykkes på for at udvide cellen
		const expansionElem: HTMLElement | null = getCellExpansionElement(colNum, rowNum);

		// Check om knappen blev fundet
		if (expansionElem) {
			// Knappen blev fundet. Check om den viser at cellen er udvidet
			return (expansionElem as HTMLElement).dataset.state == 'expanded';
		}

		return false;
	}

	function cellHasFocusableBrikker(colNum: number, rowNum: number) {
		const thisCell = getCellFromCR(colNum, rowNum) as HTMLElement;

		const brikker: NodeListOf<HTMLElement> = thisCell.querySelectorAll('a.s2skemabrik');

		if (!brikker)
			return false;

		for (let i = 0; i < brikker.length; i++) {
			if (brikIsFocusable(brikker[i])) {
				return true;
			}
		}

		return false;
	}
	function brikIsFocusable(brik: HTMLElement) {
		return true; // Alle brikker kan fokuseres
	}

	function toggleExpandCell(colNum: number, rowNum: number): void {
		// Find knappen der skal trykkes på for at udvide cellen
		const expansionElem: HTMLElement | null = getCellExpansionElement(colNum, rowNum);

		if (expansionElem) {
			// Check om cellen har brikker i sig, og bliver foldet sammen.
			if (cellIsExpanded(colNum, rowNum) && cellHasFocusableBrikker(colNum, rowNum)) {
				// Vælg også første brik i cellen
				selectFirstBrikInCell(colNum, rowNum);
			}

			// Knappen blev fundet. Click på elementet
			expansionElem.click();
		}

		function selectFirstBrikInCell(colNum: number, rowNum: number): void {
			// Fokuser den første brik i den valgte celle
			// Antager at dette element existerer

			// Få den aktuelle celle
			const cell = getCellFromCR(colNum, rowNum) as HTMLElement;

			// Find første brik i cellen
			const brikker: NodeListOf<HTMLElement> = cell.querySelectorAll('a.s2skemabrik');

			for (let i = 0; i < brikker.length; i++) {
				if (brikIsFocusable(brikker[i])) {
					focusBrik(brikker[i]);
					return;
				}
			}

			return;
		}
	}

	function moveLeftFrom(colNum: number, rowNum: number, idxNum: number, isCheckbox: boolean): void {
		// Flytter fokus til et element til venstre for det aktuelt fokuserede

		if (isCheckbox)
			// Det valgte element er en checkbox. Der altid er præcis 1 checkbox i hver celle, så gå til den til venstre.
			moveToCheckboxAtIndex(colNum - 1, rowNum);
		else {
			// Det valgte element er en brik

			// Check om cellen er udvidet
			if (cellIsExpanded(colNum, rowNum)) {
				// Vælg brik til venstre for denne, i samme række, men anden kolonne
				moveLeftToPreviousColumnFrom(colNum, rowNum, idxNum);
			}
			else {
				// Vælg brik til venstre for denne, i første række, men anden kolonne
				moveLeftToPreviousColumnFrom(colNum, rowNum, 0);
			}
		}

		function moveLeftToPreviousColumnFrom(colNum: number, rowNum: number, idxNum: number) {
			// Flytter fokus til den første brik til venstre for den markerede, i samme højde hvis muligt

			// Start i kolonnen til venstre, og fortsæt til venstre indtil der ikke er flere kolonner
			for (let c = colNum - 1; c >= firstCol; c--) {
				// Få den aktuelle celle
				const nextCell = getCellFromCR(c, rowNum) as HTMLElement;

				// Check om der blev fundet en celle med brikker
				if (nextCell && cellHasFocusableBrikker(c, rowNum)) {
					const brikker: NodeListOf<HTMLElement> = nextCell.querySelectorAll('a.s2skemabrik');

					// Check om den valgte celle er foldet ud eller ej og der ønskes en celle længere nede end den første
					if (idxNum > 0 && cellIsExpanded(c, rowNum)) {
						// Hvis den valgte celle har en brik i samme højde, vælg den, ellers gå opad indtil første brik findes
						for (let i = idxNum; i >= 0; i--) {
							if (cellHasFocusableBrikAtIdx(c, rowNum, i)) {
								focusBrik(brikker[i]);
								return;
							}
						}
					}
					// Check om den valgte celle har en brik overhovedet
					else if (cellHasFocusableBrikAtIdx(c, rowNum, 0)) {
						focusBrik(brikker[0]);
						return;
					}
				}
			}
		}
	}

	function moveRightFrom(colNum: number, rowNum: number, idxNum: number, isCheckbox: boolean): void {
	// Flytter fokus til et element til højre for det aktuelt fokuserede

		if (isCheckbox)
		// Det valgte element er en checkbox. Der altid er præcis 1 checkbox i hver celle, så gå til den til højre.
			moveToCheckboxAtIndex(colNum + 1, rowNum);
		else
		{
			// Det valgte element er en brik

			// Check om cellen er udvidet
			if (cellIsExpanded(colNum, rowNum)) {
				// Vælg brik til højre for denne, i samme række, men anden kolonne
				moveRightToNextColumnFrom(colNum, rowNum, idxNum);
			}
			else {
				// Vælg brik til højre for denne, i første række, men anden kolonne
				moveRightToNextColumnFrom(colNum, rowNum, 0);
			}
		}

		function moveRightToNextColumnFrom(colNum: number, rowNum: number, idxNum: number) {
		// Flytter fokus til den første brik til højre for den markerede, i samme højde hvis muligt

			// Start i kolonnen til venstre, og fortsæt til højre indtil der ikke er flere kolonner
			for (let c = colNum + 1; c <= lastCol; c++) {
				// Få den aktuelle celle
				const nextCell: HTMLElement | null = getCellFromCR(c, rowNum);

				// Check om der blev fundet en celle med brikker
				if (nextCell && cellHasFocusableBrikker(c, rowNum)) {
					const brikker: NodeListOf<HTMLElement> = nextCell.querySelectorAll('a.s2skemabrik');

					// Check om den valgte celle er foldet ud eller ej
					if (idxNum > 0 && cellIsExpanded(c, rowNum)) {
						// Hvis den valgte celle har en brik i samme højde, vælg den, ellers gå opad
						for (let i = idxNum; i >= 0; i--) {
							if (cellHasFocusableBrikAtIdx(c, rowNum, i)) {
								focusBrik(brikker[i]);
								return;
							}
						}
					}
					// Check om den valgte celle har en brik overhovedet
					else if (cellHasFocusableBrikAtIdx(c, rowNum, 0)) {
						focusBrik(brikker[0]);
						return;
					}
				}
			} 
		}
	}

	function moveUpFrom(colNum: number, rowNum: number, idxNum: number, isCheckbox: boolean): void {
		// Flytter fokus til et element over det aktuelt fokuserede

		if (isCheckbox)
		{
			// Det valgte element er en checkbox. Der altid er præcis 1 checkbox i hver celle, så gå til den nedenunder.

			const newElement = document.querySelector(`div[data-rowcol='r${rowNum - 1} c${colNum}']`) as HTMLInputElement;

			// Springer elementerne der skiller uge ad over når vi går op/ned.
			if (newElement.classList.contains('skemaweekWeekDay') || newElement.classList.contains('skemaweekWeekDayAlle'))
				moveToCheckboxAtIndex(colNum, rowNum - 2);
			else
				moveToCheckboxAtIndex(colNum, rowNum - 1);
		}
		else
		{
			// Dette er en brik

			// Check om cellen er udvidet
			if (cellIsExpanded(colNum, rowNum)) {
				// Check om der eksisterer en brik i samme celle, oven over den valgte
				if (focusableBrikExistsAboveThisInSameCell(colNum, rowNum, idxNum)) {
					// Vælg brik over denne, i samme række og kolonne
					moveUpInsideCellFrom(colNum, rowNum, idxNum);
				}
				else {
					// Vælg brik over denne, i samme kolonne, men anden række
					moveUpToRowAboveFrom(colNum, rowNum);
				}
			}
			else {
				// Vælg brik over denne, i samme kolonne, men anden række
				moveUpToRowAboveFrom(colNum, rowNum);
			}
		}

		function focusableBrikExistsAboveThisInSameCell(colNum: number, rowNum: number, idxNum: number): boolean {
			// Der existerer en brik oven over denne, hvis denne ikke er den første brik
			if (idxNum == 0)
				return false;

			const cell = getCellFromCR(colNum, rowNum) as HTMLElement;

			const skemaBrikker: NodeListOf<HTMLElement> = cell.querySelectorAll('a.s2skemabrik') // Medtager også skygge-brikker her

			if (!skemaBrikker)
				return false;

			// Start i rækken ovenover, og fortsæt op indtil der ikke er flere rækker
			for (let c = idxNum - 1; c >= 0; c--) {
				// Check om der blev fundet en celle med brikker
				if (brikIsFocusable(skemaBrikker[c]))
					return true;
			}

			return false;
		}

		function moveUpToRowAboveFrom(colNum: number, rowNum: number) : void {
			// Fokuser en brik i den første række over den valgte med en brik

			// Start i rækken ovenover, og fortsæt op indtil der ikke er flere rækker
			for (let r = rowNum - 1; r >= firstRow; r--) {
				// Få den aktuelle celle
				const nextCell: HTMLElement | null = getCellFromCR(colNum, r);

				// Check om der blev fundet en celle med brikker
				if (nextCell && cellHasFocusableBrikker(colNum, r)) {
					// Check om den valgte celle er foldet ud eller ej
					if (cellIsExpanded(colNum, r)) {
						// Vælg sidste element i cellen
						const brikker: NodeListOf<HTMLElement> = nextCell.querySelectorAll('a.s2skemabrik');
						for (let i = brikker.length - 1; i >= 0; i--) {
							if (brikIsFocusable(brikker[i]))
							{
								focusBrik(brikker[i]);
								return;
							}
						}
						
					}
					else {
						// Vælg første element i cellen
						const brikker: NodeListOf<HTMLElement> = nextCell.querySelectorAll('a.s2skemabrik');
						for (let i = 0; i < brikker.length; i++) {
							if (brikIsFocusable(brikker[i])) {
								focusBrik(brikker[i]);
								return;
							}
						}
					}
				}
			}
		}

		function moveUpInsideCellFrom(colNum: number, rowNum: number, idxNum: number): void {
			// Fokuser en brik i den samme række over den valgte en brik
			// Antager at dette element existerer

			// Få den aktuelle celle
			const thisCell: HTMLElement = getCellFromCR(colNum, rowNum) as HTMLElement;

			const brikker: NodeListOf<HTMLElement> = thisCell.querySelectorAll('a.s2skemabrik');

			// Find elementet oven over det nuværende
			for (let i = idxNum - 1; i >= 0; i--) {
				if (brikIsFocusable(brikker[i])) {
					focusBrik(brikker[i]);

					return;
				}
			}
		}
	}

	function moveDownFrom(colNum: number, rowNum: number, idxNum: number, isCheckbox: boolean): void {
		// Flytter fokus til et element under det aktuelt fokuserede

		if (isCheckbox)
		{
			// Det valgte element er en checkbox. Der altid er præcis 1 checkbox i hver celle, så gå til den nedenunder.

			const newElement: HTMLElement = document.querySelector(`div[data-rowcol='r${rowNum + 1} c${colNum}']`) as HTMLInputElement;

			// Springer elementerne der skiller uge ad over når vi går op/ned.
			if (newElement.classList.contains('skemaweekWeekDay') ||newElement.classList.contains('skemaweekWeekDayAlle'))
				moveToCheckboxAtIndex(colNum, rowNum + 2);
			else
				moveToCheckboxAtIndex(colNum, rowNum + 1);
		}
		else
		{
			// Dette er en brik

			// Check om cellen er udvidet
			if (cellIsExpanded(colNum, rowNum)) {
				// Check om der eksisterer en brik i samme celle, under den valgte
				if (focusableBrikExistsBelowThisInSameRow(colNum, rowNum, idxNum)) {
					// Vælg brik under denne, i samme række og kolonne
					moveDownInsideCellFrom(colNum, rowNum, idxNum);
				}
				else {
					// Vælg brik under denne, i samme kolonne, men anden række
					moveDownToRowBelowFrom(colNum, rowNum);
				}
			}
			else {
				// Vælg brik under denne, i samme kolonne, men anden række
				moveDownToRowBelowFrom(colNum, rowNum);
			}
		}

		function focusableBrikExistsBelowThisInSameRow(colNum: number, rowNum: number, idxNum: number): boolean {
			// Der existerer en brik oven over denne, hvis denne ikke er den sidste brik
			const cell: HTMLElement = getCellFromCR(colNum, rowNum) as HTMLElement;

			const skemaBrikker: NodeListOf<HTMLElement> = cell?.querySelectorAll('a.s2skemabrik') // Medtager også skygge-brikker her

			if (!skemaBrikker)
				return false;

			// Start i rækken under, og fortsæt ned indtil der ikke er flere brikker
			for (let i = idxNum + 1; i < skemaBrikker.length; i++) {
				// Check om der blev fundet en celle med brikker
				if (brikIsFocusable(skemaBrikker[i]))
					return true;
			}

			return false;
		}

		function moveDownToRowBelowFrom(colNum: number, rowNum: number): void {
			// Fokuser en brik i den første række under den valgte med en brik

			// Start i rækken nedenunder, og fortsæt ned indtil der ikke er flere rækker
			for (let r = rowNum + 1; r <= lastRow; r++) {
				// Få den aktuelle celle
				const nextCell: HTMLElement | null = getCellFromCR(colNum, r);

				// Check om der blev fundet en celle med brikker
				if (nextCell && cellHasFocusableBrikker(colNum, r)) {
					// Vælg første element i cellen
					const brikker: NodeListOf<HTMLElement> = nextCell.querySelectorAll('a.s2skemabrik');
					for (let i = 0; i < brikker.length; i++) {
						if (brikIsFocusable(brikker[i])) {
							focusBrik(brikker[i]);
							return;
						}
					}
				}
			}
		}

		function moveDownInsideCellFrom(colNum: number, rowNum: number, idxNum: number): void {
			// Fokuser en brik i den samme række under den valgte en brik
			// Antager at dette element existerer

			// Få den aktuelle celle
			const thisCell: HTMLElement = getCellFromCR(colNum, rowNum) as HTMLElement;

			const skemaBrikker: NodeListOf<HTMLElement> = thisCell.querySelectorAll('a.s2skemabrik'); // Medtager også skyggebrikker her

			// Find elementet under over det nuværende
			for (let i = idxNum + 1; i <= skemaBrikker.length; i++) {
				// Check om der blev fundet en celle med brikker
				if (brikIsFocusable(skemaBrikker[i])) {
					focusBrik(skemaBrikker[i]);
					return;
				}
			}

			return;
		}
	}

	function moveToCheckboxAtIndex(colNum: number, rowNum: number){
		const newElement: HTMLElement | null = document.querySelector(`div[data-rowcol='r${rowNum} c${colNum}'] input`) as HTMLInputElement;

		newElement?.focus();
	}

	function getMoveData( is_target_checkbox: boolean) {
		let element = document.activeElement as HTMLElement;
		
		if (!is_target_checkbox)
			element = document?.activeElement?.parentElement as HTMLElement;
		
		if (!element)
			throw new Error("getMoveData fandt intet element?")

		const rowNum = getRow(element);
		const colNum = getCol(element);

		return { element, rowNum, colNum };
	}

}