export class LectioCKEditor {
	public static Initialize() {

		/*
		 * Denne kode er tilføjet for at CKEditor kan åbne f.eks. højreklik-menuer i JQUery UI modal-dialoger.
		 */
		$.widget("ui.dialog", $.ui.dialog, {
			/*! jQuery UI - v1.11.4 - 2015-06-05
			 *  http://bugs.jqueryui.com/ticket/9087#comment:27 - bugfix
			 *  http://bugs.jqueryui.com/ticket/4727#comment:23 - bugfix
			 *  allowInteraction fix to accommodate windowed editors
			 */
			_allowInteraction: function (this: { _super: any, document: any }, event: Event) {
				if (this._super(event)) {
					return true;
				}

				if (!event.target)
					throw new Error('e.target mangler.');

				// address interaction issues with general iframes with the dialog
				if ((event.target as any).ownerDocument !== this.document[0]) {
					return true;
				}

				// address interaction issues with dialog window
				if ($(event.target).closest(".cke_dialog").length) {
					return true;
				}

				// address interaction issues with iframe based drop downs in IE
				if ($(event.target).closest(".cke").length) {
					return true;
				}

				return false;
			}
		});
	}
}
