import { LectioJSUtils } from "./lectiolib";

export namespace LectioConfirmBox {

	export function RegisterConfirm(title: string, questionHtml: string, postbackYes: () => void, postbackNo: () => void) {
		// Skal først vise efter WebForm_RestoreScrollPosition, der kører onload.
		const startIt = () => {
			setTimeout(() => {
				ShowConfirmImpl(title, questionHtml).then(res => {
					if (res === true)
						postbackYes();
					else if (res === false)
						postbackNo();
					else
						throw new Error('huh? RegisterConfirm ' + res);
				});
			}, 10);
		};
		// flg. aht. updatepanel
		if (document.readyState === "complete")
			startIt();
		else
			$(window).ready(startIt);
	}

	export function ShowConfirm(title: string, questionHtml: string): Promise<boolean> {
		return ShowConfirmImpl(title, questionHtml);
	}

	type CurrentConfirmationData = {
		title: string,
		questionHtml: string,
		resolve: (result: boolean) => void,
	};

	export function Test_TryGetCurrentlyShowDialogQuestionHtmlAsync(): Promise<string> {
		const def = LectioJSUtils.CreateDeferred<string>();

		// Denne funktion as async, for det er ikke givet at serveren har stillet sit spm.
		// endnu naar testen kalder denne funktion.
		if (testCurrrentlyShownDialogData) {
			def.resolve(testCurrrentlyShownDialogData.questionHtml);
		}
		else {
			testWaitingForDialog = () => {
				if (!testCurrrentlyShownDialogData)
					throw new Error('Hvorfor vaekkede du mig?');
				def.resolve(testCurrrentlyShownDialogData.questionHtml);
			};
		}

		return def.promise();
	}

	export function Test_SetCurrentlyShowDialogResult(ok: boolean): void {
		if (!testCurrrentlyShownDialogData)
			throw new Error('Der bliver ikke vist en dialog.');
		testCurrrentlyShownDialogData.resolve(ok);
	}

	let testCurrrentlyShownDialogData: CurrentConfirmationData | undefined;
	let testWaitingForDialog: (() => void) | undefined;

	function ShowConfirmImpl(title: string, questionHtml: string): Promise<boolean> {
		const testWaiting = testWaitingForDialog;
		testWaitingForDialog = undefined;

		const dialogElement = $("<div>" + questionHtml + "</div>").appendTo("body");
		const def = LectioJSUtils.CreateDeferred<boolean>();

		function endTheDialogue(ok: boolean) {
			dialogElement.dialog('destroy').remove();
			testCurrrentlyShownDialogData = undefined;
			def.resolve(ok);
		}

		dialogElement.css({
			'text-align': 'left',
			'max-width': '15cm',
			'min-width': '9cm',
		});
		dialogElement.dialog({
			title: title,
			modal: true,
			width: 'auto',
			height: 'auto',
			buttons: {
				"Ja": () => endTheDialogue(true),
				"Nej": () => endTheDialogue(false),
			},
			close: () => endTheDialogue(false)
		});

		testCurrrentlyShownDialogData = {
			title, questionHtml,
			resolve: ok => endTheDialogue(ok),
		};
		if (testWaiting)
			testWaiting();

		return def.promise();
	}
}
