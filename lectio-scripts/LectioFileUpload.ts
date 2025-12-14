import { LectioJSUtils } from "./LectioJSUtils";
import { JSErrorHandling } from "./JSErrorHandling";

export class LectioFileUpload {
	public static InitializeDrop(documentchooser: HTMLElement, postbackFunc: (data: { serializedId: string }) => void) {
		const htmlElement = documentchooser;

		htmlElement.addEventListener('dragenter', e => {
			e.stopPropagation();
			e.preventDefault();
			$(e).addClass('dropHere');
		}, false);
		htmlElement.addEventListener('dragover', e => {
			e.stopPropagation();
			e.preventDefault();
		}, false);
		htmlElement.addEventListener('dragleave', e => {
			e.stopPropagation();
			e.preventDefault();
			$(e).removeClass('dropHere');
		}, false);

		function createDialog(infotext: string, title: string, content: JQuery | null, buttons: any[]) {
			const dialog = $("<div class=textCenter></div>").
				appendTo('body').
				append($("<p></p>", {
					text: infotext,
					"class": 'infoTextItalic'
				})).
				append(content || $()).
				dialog({ title: "Vent venligst", resizable: false, buttons: buttons });
			return dialog;
		}

		htmlElement.addEventListener('drop', (dragEvent: DragEvent) => {
			dragEvent.stopPropagation();
			dragEvent.preventDefault();


			const dt = dragEvent.dataTransfer;
			const files = dt!.files;
			LectioJSUtils.LogDebug('files:', files);
			if (files.length === 0) {
				// Ja, det kan åbenbart lade sig gøre.
				return;
			}

			upload(files[0]);

			function upload(file: File) {
				const xhr = new XMLHttpRequest();

				const progressbar = $("<div />").progressbar({ value: false });

				var dialog: JQuery | null = createDialog("Uploader " + file.name, "Vent venligst", progressbar, [
					{
						text: "Annuller",
						click: () => {
							if (dialog)
								dialog.dialog('destroy').remove();
							dialog = null;
							xhr.abort();
						}
					}]);

				xhr.upload.addEventListener('progress', (progressEvent: ProgressEvent) => {
					if (progressEvent.lengthComputable) {
						let percentage = Math.floor((progressEvent.loaded * 100) / progressEvent.total);
						if (percentage > 100 && percentage < 120)
							percentage = 100;

						progressbar.progressbar('value', percentage);

						LectioJSUtils.LogDebug('pct', percentage, progressEvent.loaded + " af " + progressEvent.total, progressEvent);
					} else {
						progressbar.progressbar('value', false);
						console.warn('progress !lengthComputable ??');
					}
				}, false);

				xhr.open('POST', LectioJSUtils.GetBaseSchoolURL() + "/dokumentupload.aspx");
				xhr.onreadystatechange = () => {
					if (xhr.readyState === XMLHttpRequest.DONE) {
						if (!dialog)
							return;
						dialog.dialog('destroy').remove();
						dialog = null;
						if (xhr.status === 200) {
							LectioJSUtils.LogDebug('upload done', xhr);
							const json = xhr.responseText;
							const data = JSON.parse(json);
							postbackFunc({ serializedId: data.serializedId });
						}
						else {
							console.warn('upload ikke 200', xhr);
							JSErrorHandling.reportJSError('Filupload vha. drag drop fejlede. Status: ' + xhr.status + ' ' + xhr.statusText);
							const errordialog = createDialog('Upload fejlede.', 'Fejl', null, [
								{
									text: "Ok",
									click: () => errordialog.dialog('destroy').remove()
								}
							]);
						}
					}
				};

				const fd = new FormData();
				fd.append('file', file);
				xhr.send(fd);
			}
		}, false);
	}

	public static ValidateTotalSize(sender: {id:string, controltovalidate:string}, args:any): boolean {

		const ctv: string = sender.controltovalidate;
		const el = document.getElementById(ctv);
		if (!(el instanceof HTMLInputElement))
			throw new Error('val total size: ikke input-element');

		if (!el.files)
			args.isValid = true;
		else if (el.files.length === 0) {
			// required evalueres pr. konvention separat.
			args.isValid = true;
		} else {
			let totalSize = 0;
			$.each(el.files, (idx, file) => { totalSize += file.size; });

			const v = $('#' + sender.id).attr('data-val-max-total-size');
			const maxTotalSize = parseInt(<string>v);
			args.isValid = totalSize < maxTotalSize;

			if (!args.isValid) {
				$(el).val('');
				alert('Den valgte fil er for stor. Lectio tillader ikke upload af filer større end 50mb');
				return false;
			}

		}
		return true;
	}
}