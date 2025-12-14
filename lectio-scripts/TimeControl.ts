export class TimeControl {
	private static getTimeFromStr(s: string) {
		let i = 0, time = 9 * 60;
		while (i < s.length && "\t ".indexOf(s.substr(i, 1)) !== -1) {
			i++;
		}
		let j = i;
		while (j < s.length && "0123456789".indexOf(s.substr(j, 1)) !== -1) {
			j++;
		}
		if (j > i) {
			const hour = s.substr(i, j - i);

			i = j;
			while (i < s.length && "\t -/_:.,;".indexOf(s.substr(i, 1)) !== -1) {
				i++;
			}
			j = i;
			while (j < s.length && "0123456789".indexOf(s.substr(j, 1)) !== -1) {
				j++;
			}
			if (j > i) {
				const minute = s.substr(i, j - i);
				time = parseInt(hour, 10) * 60 + parseInt(minute, 10);
			}
		}
		return time;
	}

	private static changeTime(timeInput: JQuery, val : string) : void
	{
		timeInput.val(val);
		timeInput.change();

		timeInput.focus();
		timeInput.trigger('keyup');
	}

	public static buildAndShowTime(timeInput: JQuery, arrow: HTMLElement, useSpecialFlyout: boolean) {
		let html = '<select class="ls-timebox" style="z-index:100; overscroll-behavior: contain;" size=\'8\'>';
		for (let i = 0; i < 24; i++) {
			html += '<option value="' + i + ':00">' + i + ':00<option value="' + i + ':30">' + i + ':30';
		}
		html += '</select>';

		const selx = useSpecialFlyout ? $(html).insertAfter(timeInput).show('fast').focus().click() : $(html);
		const sel = selx[0];
		if (!(sel instanceof HTMLSelectElement))
			throw new Error('se');

		// Get time
		const time = TimeControl.getTimeFromStr(timeInput.val() as string);

		// Set selected
		for (let i = 0; i < sel.options.length; i++) {
			if (TimeControl.getTimeFromStr(sel.options[i].value) >= time) {
				sel.options.selectedIndex = i;
				break;
			}
		}

		const $sel = $(sel);
		if (useSpecialFlyout) {
			const arrowCtrl = $(arrow);
			arrowCtrl.hide();

			$sel.on("blur", () => {
				$sel.remove();
				timeInput.show('fast');
				arrowCtrl.show('fast');
			}).on("change", () => {
				this.changeTime(timeInput, $sel.val() as string);
				$sel.remove();
				timeInput.show('fast');
				arrowCtrl.show('fast');
				
			});
		} else {
			$sel.on("blur", () => {
				$sel.remove();
			}).on("change", () => {
				this.changeTime(timeInput, $sel.val() as string);
				$sel.remove();
			}).click(() => {
				// Der kommer enten change eller click på det element der allerede er valgt.
				// IE vil ikke sige hvilken option der klikkes på, men når vi ikke har fået en change, må det være det oprindelige element.
				this.changeTime(timeInput, $sel.val() as string);
				$sel.remove();
			});
		}

		if (!useSpecialFlyout) {
			$sel.css('position', 'absolute')
				.appendTo('body')
				.position({ my: 'left top', at: 'left bottom', of: timeInput });

			window.setTimeout(() => {
				const o = $(":selected", $sel);
				sel.options.selectedIndex = o.index();
				sel.focus();
			}, 100);
		} else {
			timeInput.hide('fast');
		}

		return;

	}

}
