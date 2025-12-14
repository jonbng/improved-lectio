import {LectioJSUtils} from "./LectioJSUtils";

export namespace LectioDialog {
	interface IFrameExt {
		LectioGemOgLuk?: (val: any) => void;
		align: string;
	}

	function AsIframeExt(iframe: Element): IFrameExt {
		if (!(iframe.nodeName === 'IFRAME'))
			throw new Error('er ikke iframe');
		// kan ikke tjekke instanceof, fordi iframen og htmliframeelement i et af kaldene kommer fra forskellige vinduer.
		return iframe as HTMLIFrameElement;
	}

	export function ShowLectioPopupDialog(popupurl: string, postbackFunc: (val: any) => void, dialogTitle: string) {
		const dialogWidth = 600; //px
		const dialogHeight = 350; //px

		const srcurl = LectioJSUtils.GetBaseSchoolURL() + "/" + popupurl;

		const iframe = $('<iframe id="iframedocchooser" frameBorder="0"  src="' + srcurl + '" />');

		AsIframeExt(iframe[0]).LectioGemOgLuk = returnval => {
			postbackFunc(returnval);
			setTimeout(() => { iframe.remove(); }, 50);
		};

		iframe.dialog({
			modal: true,
			dialogClass: 'documentchooserDialog',
			title: dialogTitle,
			height: dialogHeight,
			width: dialogWidth,
			closeOnEscape: true,
			resizable: false,
			buttons:
			{
				'Gem': () => {
					type GF = {
						GemFunc: () => void
					};
					const win: {
						parentWindow?: GF;
						defaultView?: GF;
						accessKey: string;
					} = iframe.contents()[0] as any;
					(win.parentWindow ? win.parentWindow : win.defaultView)!.GemFunc();
				},
				'Annuller': () => {
					setTimeout(() => { iframe.remove(); }, 50);
				}
			}
		});

		//Fix for weird inline styles specified by dialog()
		iframe.removeAttr('style');
		iframe.css('width', dialogWidth - 20 + 'px');
		iframe.css('height', dialogHeight - 20 + 'px');
	}

	export function PostDialogResult(data: any) {
		const fe = window.frameElement;
		if (!fe)
			throw new Error('window.frameElement er ikke sat.');

		const iframe = $(fe)[0];
		const postbackfunc = AsIframeExt(iframe).LectioGemOgLuk;
		if (postbackfunc == null)
			throw new Error('lectiogemogluk er ikke sat.');
		postbackfunc(data);
	}
}
