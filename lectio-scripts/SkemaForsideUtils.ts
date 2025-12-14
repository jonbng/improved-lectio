import { EventMods, LectioJSUtils, Writeable } from "./LectioJSUtils";

export namespace SkemaForsideUtils {

	let selectionevent_LastMouseDownCtrlBrikId: string | undefined;

	export function getContentAncestor(containerID: string): HTMLElement {
		const rv = document.getElementById(containerID);
		LectioJSUtils.AssertNotNullOrUndefined(rv, 'rv');
		return rv;
	}

	type ModulePredicate = Readonly<{
		row?: number;
		col?: number;
		weekday?: string;
		includeHolidays: boolean;
	}>;

	export function InitializeBrikIndividualSelection(
		containerIdX: string,
		skemaid: string
	): void {
		LectioJSUtils.AssertNotNullOrUndefined(containerIdX, 'containerIdX');
		const cc = document.getElementById(containerIdX);
		LectioJSUtils.AssertNotNullOrUndefined(cc, 'container');
		LectioJSUtils.AssertType(cc, HTMLElement);

		SetupBrikIndividualSelection(cc, skemaid, containerIdX);
	}

	export function SetupBrikIndividualSelection(
		contentDiv: HTMLElement,
		skemaid: string,
		containerID: string
	): void {
		$(contentDiv).on('mousedown', '.s2skemabrik:not(.s2ambient)',
			evt => selectionevent_BrikMouseDown(evt, skemaid, containerID));
		$(contentDiv).on('click', '.s2skemabrik:not(.s2ambient)',
			evt => selectionevent_BrikClick(evt, skemaid, containerID));
		$(contentDiv).on('click', '.s2ambient[data-day][data-module][data-holdelementid] span',
			evt => selectionevent_SkyggebrikClick(evt, skemaid, containerID));
	}

	export function DoPostback(skemaid: string | undefined, action: string, postbackArg: string): void {
		LectioJSUtils.AssertNotNullOrEmpty(skemaid, 'skemaIdForPostback');
		window.__doPostBack(skemaid, action + ' ' + postbackArg);
	}

	/*************************************************/
	/************* selection begin *******************/
	/*************************************************/

	export function selectionevent_BrikMouseDown(
		evt: JQuery.MouseDownEvent,
		skemaid: string | undefined,
		containerID: string
	): void {
		selectionevent_LastMouseDownCtrlBrikId = undefined;

		const brik = evt.currentTarget;
		LectioJSUtils.AssertType(brik, HTMLElement);

		const brikId = getLectioIdForBrikNullable(brik);
		if (!brikId)
			return;


		const mods = LectioJSUtils.GetEventModifiers(evt);
		if (!(mods === '' || mods === LectioJSUtils.GetCtrlKeyOSSpecific()))
			return;

		if (!skemaid) {
			// This condition is only here for Skemauge to work (should be
			// deleted when skemauge.ascx is removed).
			if (!brikId) throw new Error('mangler attribs');
			const cbs = $("input:checkbox[data-absenseid=" + brikId + "]");
			const yes = cbs.filter(':checked').length > 0;
			cbs.prop('checked', !yes).trigger('change');
			return;
		}

		/*
		 * Flg. er ca. oensket opfoersel:
		 *
		 * - ctrl ifbm. mousedown:
		 *   Eneste mulige effekt er tilvalg af brikken der trykkes paa.
		 *   Hvis ingen brikker i forvejen er valgte, tilfoejes der derfor blot
		 *   til det tomme saet.
		 *   Fravalg eller andet kan ikke ske i denne event, men i onclick.
		 *   Drag starter evt. et oejeblik senere.
		 * - Andre modifiers ifbm. mousedown:
		 *   Windows Explorer stejler ikke over saadanne, men der er maaske lidt
		 *   for eksotisk for os...
		 * - ctrl derefter, under drag:
		 *   Har kun betydning for dragdrop-varianten (flyt vs kopier), ikke
		 *   hvad der er valgt.
		 *
		 * Fravalg vha. ctrl:
		 * Sker i onclick (ikke mousedown), hvis der klikkes paa en brik der var
		 * valgt.
		 *
		 * Det giver os vel flg. tilfaelde for mousedown, hvis vi kun ser paa
		 * mods=ingen|ctrl (2*2*2=8 stk.):
		 *
		 * - Denne=ja|nej, andre=ja|nej, mods=ctrl:
		 *   => Tilfoej brikken (ref 1).
		 *
		 * - Denne=nej   , andre=ja|nej, mods=ingen:
		 *   => Afmarker de andre, og marker brikken. (ref 2)
		 *
		 * - Denne=ja    , andre=ja/nej, mods=ingen
		 *   => Markering aendres ikke. (ref 3)
		 *
		 * For alle disse er det muligt at drag starter et oejeblik senere.
		 */

		const skemaContainer = getContentAncestor(containerID);
		const thisIsSelected = brik.matches('.s2selected');
		let selectionChanged: boolean;

		if (mods == LectioJSUtils.GetCtrlKeyOSSpecific()) {
			// => Tilfoej brikken. (ref 1)
			if (!thisIsSelected) {
				selectionChanged = selection_change([brik], 'add', skemaContainer);
				selectionevent_LastMouseDownCtrlBrikId = brikId;
			}
			else
				selectionChanged = false;
		}
		else if (!thisIsSelected)
			selectionChanged = selection_change([brik], 'replace', skemaContainer); // => Afmarker de andre, og marker brikken. (ref 2)
		else
			return; // => Markering aendres ikke. (ref 3)

		if (selectionChanged)
			postValgteBrikkerOgModuler(skemaid, containerID);
	}

	export function selectionevent_BrikClick(
		evt: JQuery.ClickEvent,
		skemaid: string | undefined,
		containerID: string
	): void {

		if (!skemaid)
			return;

		const brik = evt.currentTarget;
		LectioJSUtils.AssertType(brik, HTMLElement);

		const brikId = getLectioIdForBrikNullable(brik);
		if (!brikId)
			return;

		const thisIsSelected = brik.matches('.s2selected');
		const mods = LectioJSUtils.GetEventModifiers(evt);
		const skemaContainer = getContentAncestor(containerID);

		if (mods === LectioJSUtils.GetCtrlKeyOSSpecific()) {
			if (!thisIsSelected)
				return;

			// Vil ikke fravaelge her under onclick, hvis vi lige har tilvalgt i
			// denne events tilhoerende mousedown.
			if (selectionevent_LastMouseDownCtrlBrikId === brikId)
				return;

			if (selection_change([brik], 'remove', skemaContainer))
				postValgteBrikkerOgModuler(skemaid, containerID);
		} else if (mods === '') {
			if (selection_change([brik], 'replace', skemaContainer))
				postValgteBrikkerOgModuler(skemaid, containerID);
		}
	}

	export function selectionevent_SkyggebrikClick(
		evt: JQuery.ClickEvent,
		skemaid: string | undefined,
		containerID: string
	): void {
		if (!skemaid)
			return;

		const brik = evt.currentTarget.closest("a.s2ambient[data-day][data-module][data-holdelementid]");
		LectioJSUtils.AssertType(brik, HTMLElement);

		const mods = LectioJSUtils.GetEventModifiers(evt);

		if (mods === '') {
			LectioJSUtils.AssertNotNullOrEmpty(brik.dataset.holdelementid, "holdelementId tomt");
			LectioJSUtils.AssertNotNullOrEmpty(brik.dataset.day, "day tomt");
			LectioJSUtils.AssertNotNullOrEmpty(brik.dataset.module, "module tomt");

			const holdelementId = parseInt(brik.dataset.holdelementid);
			const day = brik.dataset.day;
			const module = parseInt(brik.dataset.module);

			postVælgSkyggebrik(holdelementId, day, module, skemaid);
		}
	}

	export function selectionevent_SpaceDown(
		evt: JQuery.KeyDownEvent,
		skemaid: string | undefined,
		containerID: string
	): void {
		if (!skemaid)
			return;

		const brik = evt.currentTarget;
		LectioJSUtils.AssertType(brik, HTMLElement);

		const brikId = getLectioIdForBrikNullable(brik);

		if (brikId) {
			const skemaContainer = getContentAncestor(containerID);

			if (selection_change([brik], 'replace', skemaContainer))
				postValgteBrikkerOgModuler(skemaid, containerID);
		}
		else {
			if (brikIsSkyggebrik(brik)) {
				LectioJSUtils.AssertNotNullOrEmpty(brik.dataset.holdelementid, "holdelementId tomt");
				LectioJSUtils.AssertNotNullOrEmpty(brik.dataset.day, "day tomt");
				LectioJSUtils.AssertNotNullOrEmpty(brik.dataset.module, "module tomt");

				const holdelementId = parseInt(brik.dataset.holdelementid);
				const day = brik.dataset.day;
				const module = parseInt(brik.dataset.module);

				postVælgSkyggebrik(holdelementId, day, module, skemaid);
			}
		}
	}

	export function selection_change_ex(
		brik: HTMLElement,
		skemaContainer: HTMLElement,
		mod: EventMods | undefined
	): boolean {
		const mods = mod ? LectioJSUtils.GetEventModifiers(mod) : null;
		if (!mods) {
			selection_change([brik], 'replace', skemaContainer);
			return true;
		}
		if (mods === LectioJSUtils.GetCtrlKeyOSSpecific()) {
			selection_change([brik], brik.matches('.s2selected') ? 'remove' : 'add', skemaContainer);
			return true;
		}
		return false;
	}

	export function selection_change(
		brikker: ReadonlyArray<Element> | NodeListOf<Element>,
		operation: 'add' | 'remove' | 'replace',
		skemaContainer: HTMLElement
	): boolean {
		function impl(
			selectSelector: (lectioid: string) => boolean | null
		): boolean {
			const brikker = skemaContainer.querySelectorAll('.s2skemabrik');
			let changedSelection = false;
			for (const brik of brikker) {
				const lectioid = getLectioIdForBrikNullable(brik);
				if (!lectioid)
					continue;

				const select = selectSelector(lectioid);
				if (select === null)
					continue;

				const pre = brik.classList.contains('s2selected');
				changedSelection ||= select !== pre;
				brik.classList.toggle('s2selected', select);
			}
			return changedSelection;
		}

		const changeset = new Set(brikker.map(b => getLectioIdForBrikNullable(b)));

		switch (operation) {
			case 'add':
				return impl(lectioid => changeset.has(lectioid) ? true : null);
			case 'remove':
				return impl(lectioid => changeset.has(lectioid) ? false : null);
			case 'replace':
				return impl(lectioid => changeset.has(lectioid) ? true : false);
			default:
				LectioJSUtils.AssertNever(operation, 'operation');
		}
	}

	export function getLectioIdForBrikNullable(brik: Element): string | null {
		// sker fx. for proever.
		const brikId = brik.getAttribute('data-brikid');
		if (!brikId)
			return null;

		const match = brikId.match(/^([A-Z]+)[0-9]+$/);
		if (!match)
			return null;

		if (match[1] == "ABS" || match[1] == "SCB")
			return brikId;

		return null
	}

	export function getLectioIdForBrik(brik: Element) {
		const id = getLectioIdForBrikNullable(brik);
		LectioJSUtils.AssertNotNullOrEmpty(id, 'absid');
		return id;
	}

	export function GetSelectedBrikIds(container: HTMLElement): string[] {
		const brikker = container.querySelectorAll(`:scope .s2skemabrik`);
		const ids = brikker
			.filter(brik => brik.matches('.s2selected'))
			.mapNotNull(brik => getLectioIdForBrikNullable(brik));
		return ids;
	}

	export function postValgteBrikkerOgModuler(skemaId: string, containerID: string): void {
		const newsel = GetSelectedBrikIds(getContentAncestor(containerID));
		DoPostback(skemaId, 'select_brik', newsel.join(','));
	}

	export function postVælgSkyggebrik(holdelementId: number, day: string, module: number, skemaId: string): void {
		DoPostback(skemaId, 'create_from_skyggebrik', JSON.stringify({ holdelementId: holdelementId, day: day, module: module }));
	}

	export function get_select_operation(
		ctrl_pressed: boolean = false,
		target_is_single_checkbox: boolean = false,
		anyOtherChecked: boolean = false,
		allChecked: boolean = false,
	): 'add' | 'remove' | 'replace' {
		if (target_is_single_checkbox) {
			if (ctrl_pressed) {
				if (allChecked)
					return 'add';	// Reversed, since the target is a checkbox, which is automatically checked before this code runs.
				return 'remove';	// Reversed, since the target is a checkbox, which is automatically checked before this code runs.
			}
			else {
				if (anyOtherChecked)
					return 'replace';
				if (allChecked)
					return 'add';	// Reversed, since the target is a checkbox, which is automatically checked before this code runs.
				return 'remove';	// Reversed, since the target is a checkbox, which is automatically checked before this code runs.
			}
		}
		else {
			if (ctrl_pressed) {
				if (allChecked)
					return 'remove';
				return 'add';
			}
			else {
				if (anyOtherChecked)
					return 'replace';
				if (allChecked)
					return 'remove';
				return 'add';
			}
		}
	}
	export function brikIsSkyggebrik(brik: HTMLElement) {
		return brik.classList.contains("s2ambient"); // Fokuserer ikke på skyggebrikker
	}
}