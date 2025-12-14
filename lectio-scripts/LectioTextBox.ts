import { LectioJSUtils } from "./LectioJSUtils";

export namespace LectioTextBox {
	function LTB_CheckMand(source: Element) {
		const mandobjid = source.id + "_mand";
		let mandobj = document.getElementById(mandobjid);
		LectioJSUtils.AssertType(mandobj, HTMLInputElement);

		if (mandobj.value.trim() === "") {
			if (!mandobj) {
				mandobj = document.createElement("DIV");
				mandobj.id = mandobjid;
				mandobj.style.position = "relative";
				mandobj.innerHTML = "<div style=\"position:absolute;z-index:10;padding:0.3em;\" class=\"attention\">*</div>";

				source.parentNode!.insertBefore(mandobj, source);
			}
			mandobj.style.visibility = "visible";
		} else {
			if (mandobj) {
				mandobj.parentNode!.removeChild(mandobj);
			}
		}
	}

	// For handling CPRno in the textbox
	// textbox is pointer to the textbox, where the CPR-nr is typed.
	export function AutoCPRstreg(e: KeyboardEvent, textbox: HTMLInputElement) {
		const key = e.key;

		// Only accept numbers for the first six chars:
		const digitCheck = (str: string) => str.length === 1 && str >= '0' && str <= '9';
		if (!digitCheck(key) && textbox.value.length < 6)
			return false;

		if (textbox.value.length == 6 && key != '-')
			textbox.value = textbox.value + '-';

		return true;
	}

	export function Initialize(): void {
		$(document.body).on('change keyup', 'input[lectio-behavior~="required"], select[lectio-behavior~="required"]',
			evt => LTB_CheckMand(evt.target));
		$(() => {
			$(document.body)
				.find('input[lectio-behavior~="required"]')
				.each(function () {
					LTB_CheckMand($(this)[0]);
				});
			$(document.body)
				.find('select[lectio-behavior~="required"]')
				.each(function () {
					LTB_CheckMand($(this)[0]);
				});

			autoResizeText(4000);
		});
	}

	//Autoresize textbox
	function fitToContent(text: JQuery<Element>, maxHeight: number) {
		let adjustedHeight = <number>text.height();
		const relativeError = parseInt(<string>text.attr('relative_error'), 10);

		if (!maxHeight || maxHeight > adjustedHeight) {
			adjustedHeight = Math.max(text[0].scrollHeight, adjustedHeight);
			if (maxHeight)
				adjustedHeight = Math.min(maxHeight, adjustedHeight);
			if (!text.data('original-height')) {
				const height = text.height() as number;
				text.data('original-height', height);
			}
			const idealHeight = adjustedHeight - relativeError;
			let didAdjustments = false;

			if (idealHeight > <number>text.height()) {
				text.css('height', idealHeight + "px");
				didAdjustments = true;
			} else if (idealHeight < <number>text.height()) {
				const originalHeight = text.data('original-height');
				if (idealHeight >= originalHeight) {
					didAdjustments = true;
				}
			}

			// chrome fix
			if (didAdjustments && text[0].scrollHeight !== adjustedHeight) {
				const relative = text[0].scrollHeight - adjustedHeight;
				if (relativeError !== relative)
					text.attr('relative_error', relative + relativeError);
			}
		}
	}

	function autoResizeText(maxHeight: number) {
		const textboxes = $('textarea[lectio-behavior~="autoresize"]');
		const resize = (tb: Element) => {
			// Optimering for sider, hvor der er mange tomme tekstbokse, eller hvor der er så lidt indhold i, 
			// at der ikke er behov for at tilpasse dem (øge højden).
			const val = <string>$(tb).val();
			if (!val || (!val.match(/\n/) && val.length < 15))
				return;

			const ele = $(tb);

			fitToContent(ele, maxHeight);
		};
		textboxes.attr('relative_error', 0);
		textboxes.each((ix, tb) => resize(tb));
		textboxes.on('keyup', e => resize(e.target)).on('keydown', e => resize(e.target));
	}
}