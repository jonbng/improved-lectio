import { LectioJSUtils } from "./LectioJSUtils";

export class LectioCollapsiblePanel {
	public static LectioCollapsiblePanel_Toggle(ctrlid: string, collapsedText: string, expandedText: string) {
		const ctrl = document.getElementById(ctrlid);
		const ctrlhp = document.getElementById(ctrlid + '_hp');

		LectioJSUtils.AssertNotNullOrUndefined(ctrl, 'ctrl');
		LectioJSUtils.AssertNotNullOrUndefined(ctrlhp, 'ctrlhp');

		const makeShown = $(ctrl).css("display") === "none";
		if (makeShown) {
			$(ctrl).css("display", "");
			$(ctrlhp).html(expandedText);
		} else {
			$(ctrl).css("display", "none");
			$(ctrlhp).html(collapsedText);
		}
		ctrlhp.setAttribute('data-state', makeShown ? 'expanded' : 'collapsed');

		const input = ctrl.querySelector('input[type=hidden]');
		LectioJSUtils.AssertType(input, HTMLInputElement);

		input.value = makeShown ? '1' : '0';
	}

	public static LectioCollapsiblePanel_ToggleIcon(ctrlid: string, expandIcon: string, collapseIcon: string) {
		const ctrl = document.getElementById(ctrlid);
		const ctrlhp = document.getElementById(ctrlid + '_hp');

		LectioJSUtils.AssertNotNullOrUndefined(ctrl, 'ctrl');
		LectioJSUtils.AssertNotNullOrUndefined(ctrlhp, 'ctrlhp');

		const makeShown = $(ctrl).css("display") === "none";
		if (makeShown) {
			$(ctrl).css("display", "");
			$(ctrlhp).html('<img src="' + collapseIcon + '">');
		} else {
			$(ctrl).css("display", "none");
			$(ctrlhp).html('<img src="' + expandIcon + '">');
		}
		ctrlhp.setAttribute('data-state', makeShown ? 'expanded' : 'collapsed');

		const input = ctrl.querySelector('input[type=hidden]');
		LectioJSUtils.AssertType(input, HTMLInputElement);

		input.value = makeShown ? '1' : '0';
	}
}