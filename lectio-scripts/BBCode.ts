import { LectioJSUtils } from "./LectioJSUtils";

export class BBCode {
	private static lastBBCodeHelp: JQuery | null = null;
	private static lastBBPreview: JQuery | null = null;
	private static lastBBPreviewdiv: JQuery | null = null;

	public static ShowBBCodeHelp() {
		if (BBCode.lastBBCodeHelp !== null) {
			BBCode.lastBBCodeHelp.dialog('destroy').remove();
			BBCode.lastBBCodeHelp = null;
		}

		const $dialogdiv = $('<div><span class=\'loadingContextCard\'>Henter info...</span></div>').appendTo('body');
		const $dialog = $dialogdiv.dialog({
			autoOpen: true,
			closeOnEscape: true,
			title: 'BB Code Hjælp',
			width: 430,
			//maxheight: 240,
			resizable: false,
			draggable: true,
			//position: { my: 'center', at:'center', of:window}
		});

		BBCode.lastBBCodeHelp = $dialog;

		$.get(LectioJSUtils.GetBaseSchoolURL() + '/BBCode/BBCodeHelp.aspx', {},
			(responseText, textStatus, XMLHttpRequest) => {
				//$(".ui-dialog-title").html($(responseText)[0].value);
				$dialogdiv.html(responseText);
			}, "html"
		);
	}

	public static ShowBBCodePreview(textboxid: string) {
		if (BBCode.lastBBPreview !== null) {
			if (BBCode.lastBBPreview.dialog('isOpen') !== true) {
				BBCode.lastBBPreview = null;
				BBCode.lastBBPreviewdiv = null;
			}
		}
		if (BBCode.lastBBPreview == null || BBCode.lastBBPreviewdiv == null) {
			const $dialogdiv = $('<div><span class=\'loadingContextCard\'>Henter info...</span></div>').appendTo('body');
			const $dialog = $dialogdiv.dialog({
				autoOpen: true,
				closeOnEscape: true,
				title: 'Preview',
				width: 360,
				//maxheight: 240,
				resizable: false,
				draggable: true,
				//position: { at: 'center'}
			});

			BBCode.lastBBPreview = $dialog;
			BBCode.lastBBPreviewdiv = $dialogdiv;
		}

		const last = BBCode.lastBBPreviewdiv;
		$.post(LectioJSUtils.GetBaseSchoolURL() + '/BBCode/BBCodePreview.aspx', { BBCode: $('#' + textboxid).val() },
			(responseText, textStatus, XMLHttpRequest) => {
				last.html(responseText);
			}, "html"
		);
	}
}
