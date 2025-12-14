import { options } from "knockout";
import { LectioJSUtils } from "./LectioJSUtils";

interface ModalDialogAsyncSettings {
	title: string;
	buttons: (JQueryUI.DialogButtonOptions & { accesskey: string | undefined })[];
	height: number;
	width: number;
	cancelPostBack: () => void;
	resizable?: boolean;
}

export class ModalDialogAsync {
	static EnsureDialogOpen(containerId: string, settings: ModalDialogAsyncSettings): (() => void) {
		const contentDiv = $('#' + containerId);

		{
			const isDialogxx = contentDiv.is(':data(dialog)') || contentDiv.is(':data(uiDialog)');
			if (isDialogxx && contentDiv.dialog('isOpen'))
				contentDiv.dialog('destroy').remove();
		}
		const isDialog = contentDiv.is(':data(dialog)') || contentDiv.is(':data(uiDialog)');

		if (!isDialog) {
			const bodypos = (() => {
				// STM 31919
				// Detect ios 11_0_x, 11_1 affected (ser heller ikke ud til at fejlen er rettet i 11.2 beta)
				const ua = navigator.userAgent,
					iOS = /iPad|iPhone|iPod/.test(ua),
					iOS11 = /OS 11_0_1|OS 11_0_2|OS 11_0_3|OS 11_1|OS 11_2/.test(ua); // NEED TO BE UPDATED if new versions are affected

				if (iOS && iOS11) {
					return { open: 'fixed', closed: 'absolute' };
				}
				return undefined;
			})();

			let disabledAccessKeys: { ele: HTMLInputElement, accesskey: string }[] = [];

			const ops: JQueryUI.DialogOptions = {
				title: settings.title,
				modal: true,
				appendTo: '#aspnetForm',
				buttons: settings.buttons,
				close: () => {
					const aks = disabledAccessKeys;
					disabledAccessKeys = [];
					for (const r of aks) {
						r.ele.accessKey = r.accesskey;
					}

					if (bodypos)
						$("body").css("position", bodypos.closed);

					settings.cancelPostBack();
				},
				open: (event, ui) => {

					// JCJ, 210921: stm-39189. Firefox håndtere accesskeys anderledes end de øvrige browsere.
					// Når genvejstasten til en button bliver brugt ønsker vi der faktisk "trykkes" på knappen. 
					// I tilfælde af mere end ét element med samme accesskey kan det give problemer.
					// De øvrige browsere vælger et af elementerne ud, ud sættter fokus til, det og trykker på det,
					// hvilket har virket fint indtil nu (men nok heller ikke kan forventes at have korrekt opførsel
					// i alle tænkelige situationer).
					// Firefox skifter/cykler fokus, hvis der findes mere end ét element med samme accesskey, men 
					// trykker ikke på det.
					// Nu sørger vi for, at når vi åbner et dialog vindue er det altid dets elemeneter som 
					// genvejstaster henviser til i tilfælde hvor der er flere med samme accesskey, som dialogen bruger. 
					const buf = [];
					for (const b of settings.buttons) {
						if (!b.accesskey)
							continue;
						const thisdiag = (event.target as Element).parentElement;
						if (!thisdiag)
							throw new Error("wtf?");

						const withThisAccesskey = [...(document.querySelectorAll('[accesskey=' + b.accesskey + ']') as unknown as Element[])];
						const others = withThisAccesskey
							.filter(ele => !thisdiag.contains(ele) && ele instanceof HTMLInputElement && !ele.disabled
								? ele : null).map(o => o as HTMLInputElement);
						buf.push(...others);
					}

					disabledAccessKeys = [];
					for (const b of buf) {
						const key = b.accessKey;
						b.accessKey = '';
						disabledAccessKeys.push({ ele: b, accesskey: key });
					}

					contentDiv.removeClass('hidden');

					if (bodypos)
						$("body").css("position", bodypos.open);

					$(contentDiv).trigger('modalDialogAsyncOpen');
				}
			};
			if (settings.height)
				ops.height = settings.height;
			if (settings.width)
				ops.width = settings.width;
			if (settings.resizable != null) {
				ops.resizable = settings.resizable;
			}

			contentDiv.dialog(ops);
		}

		return () => {

		};
	}

	static CloseDialog(containerId: string) {
		const contentDiv = $('#' + containerId);
		const isDialog = contentDiv.is(':data(dialog)') || contentDiv.is(':data(uiDialog)');
		if (isDialog === true) {
			contentDiv.dialog('destroy').remove();

			//STM 31919
			//ios 11_0_x, 11_1 (ser heller ikke ud til at fejlen er rettet i 11.2 beta)
			const ua = navigator.userAgent,
				iOS = /iPad|iPhone|iPod/.test(ua),
				iOS11 = /OS 11_0_1|OS 11_0_2|OS 11_0_3|OS 11_1|OS 11_2/.test(ua); // NEED TO BE UPDATED if new versions are affected

			if (iOS && iOS11) {
				$("body").css("position", "absolute");
			}
			//$('body').css('overflow', 'scroll'); // Reenable scrolling
		}
	}
}
