import { LectioDate } from "./LectioDate";
import { LectioTimeSpan } from "./LectioTimeSpan";
import DatepickerOptions = JQueryUI.DatepickerOptions;
import { LectioJSUtils, LectioKeyCode } from "./lectiolib";

export namespace LectioControls {
	export function InitializeDatePickers() {
		const textBoxes = $('input[data-role="datepicker"]');
		textBoxes.each((_, elem) => InitializeDatePicker($(elem)));

		jQuery(($: JQueryStatic) => {

			if (!$.datepicker) {
				// Vil gerne kunne bruge lectio.js på sider uden jquery ui...
				return;
			}

			SetDatepickerDefaults();
			RegisterEventHandlers();
		});
	}
}

function DatePicker_DateChanged(tb: JQuery, dateText: string) {

	const input = tb.val() as string;
	const afterDate = LectioDate.TryParseUserInputCreative(input);
	if (afterDate === null || afterDate === undefined) {
		return;
	}

	const v = afterDate.ToLectioDateString();
	tb.val(v);

	// bare en gemmer
	const other = $("input[type=text][data-altfield='" + tb.attr('id') + "']");

	//ok, hvis vi har et altfield, så syncer vi mod target-feltets to-date
	if (tb.data("altfield") !== undefined) {
		const otb = $("#" + tb.data("altfield"));
		const otherDate = LectioDate.TryParseUserInput(otb.val() as string);
		if (otherDate !== null && otherDate !== undefined) {
			if (otherDate.IsLessThan(afterDate)) {
				otb.val(v);
			}
		} else {
			otb.val(v);
		}
		otb.datepicker("option", "defaultDate", afterDate.GetJSDate());
		otb.datepicker("option", "dateFormat", LectioDate.jqueryDateFormat);
	}
	// omvendt, hvis denne er target for et altfield
	else if (other.length === 1) {
		const otb = other.eq(0);
		const otherdate = LectioDate.TryParseUserInput(otb.val() as string);
		if (otherdate !== null && otherdate !== undefined && afterDate.IsLessThan(otherdate)) {
			otb.val(v);
		}
	}

	if (tb.is("[lectio-behavior~=autopostback]")) {
		window.__doPostBack(tb[0].id, '');
	}
	else {
		const next = tb.data("nextfocuselement");
		if (next != null) {
			const nextElement: JQuery = $('#' + next);

			nextElement.datepicker("option", "defaultDate", afterDate.GetJSDate());

			if (nextElement.length > 0) {
				setTimeout(() => nextElement.focus(), 50);
			}
		}
	}
}

function InitializeDatePicker(tb: JQuery) {
	tb.on('change', ((dateText: string) => DatePicker_DateChanged(tb, dateText)) as any);
	tb.datepicker({
		onSelect: (dateText) => DatePicker_DateChanged(tb, dateText),
		defaultDate: tb.data("defaultdate"),

		onClose(dateText, inst) {
			const tb2 = tb[0];
			LectioJSUtils.AssertType(tb2, HTMLInputElement);
			tb2.defaultValue = dateText;
		},
	});
}

function RegisterEventHandlers() {
	if (LectioJSUtils.HasBeenHere(document.body, 'registerDatePickerEventHandlers'))	// STM 45868: Sikrer at event-handlers kun registreres én gang
		return;

	// musehjul på jQuery UI datepicker.
	$('.ui-datepicker').on('mousewheel', function (e) {
		e.preventDefault(); 
		const p = $(this);
		const cssclass = (e.originalEvent as WheelEvent).deltaY > 0 ? 'ui-datepicker-prev' : 'ui-datepicker-next';
		p.datepicker('widget').find('.' + cssclass).click();
		e.originalEvent!.returnValue = false;
		return false;
	});


	//  Datovælger: Korrektion af format på tidsdel.
	$(document.body).on('change', 'input[type=text][lectio-behavior~="dctime"]', function () {
		const p = $(this);
		const ts = LectioTimeSpan.TryParseUserInput(p.val() as string);
		if (ts === null) {
			return false;
		}
		p.val(ts.ToLectioTimeSpanString());
		return true;
	});

	//  Datovælger: musehjul på tidsdel.
	$('input[type=text][lectio-behavior~="dctime"]').on('mousewheel keydown', function (event) {
		const p = $(this);
		if (!p.is(':enabled') || p.attr('readonly')) {
			return false;
		}
		const incrementSize: number = parseInt((event.target as HTMLElement).getAttribute("lectio-dctime-increment-minutes") ?? "15");
		let diff: number;
		if (event.type === "mousewheel") {
			{
				const delta = (event.originalEvent as WheelEvent).deltaY;
				diff = delta > 0 ? -incrementSize : incrementSize;
			}
		} else if (event.type === "keydown") {
			if (event.keyCode === $.ui.keyCode.DOWN) {
				diff = -incrementSize;
			} else if (event.keyCode === $.ui.keyCode.UP) {
				diff = incrementSize;
			} else {
				return true;
			}
		} else {
			throw new Error("??");
		}

		const ts = LectioTimeSpan.TryParseUserInput(p.val() as string);
		if (ts === null) {
			return false;
		}

		function clampTimeSpan(tsToClamp: LectioTimeSpan) {
			const totMin = tsToClamp.GetTotalMinutes();
			let ts3: LectioTimeSpan;
			if (totMin < 0) {
				ts3 = LectioTimeSpan.Create(0, 0);
			} else if (totMin >= 24 * 60) {
				ts3 = LectioTimeSpan.Create(23, 59);
			} else {
				// Rund af til hele kvarterer.
				const minutes1 = tsToClamp.GetMinutes();
				let minutes2: number;
				if (minutes1 < 15) {
					minutes2 = 0;
				} else if (minutes1 < 30) {
					minutes2 = 15;
				} else if (minutes1 < 45) {
					minutes2 = 30;
				} else {
					minutes2 = 45;
				}
				ts3 = LectioTimeSpan.Create(tsToClamp.GetHours(), minutes2);
			}
			return ts3;
		}

		const ts2 = clampTimeSpan(ts.AddMinutes(diff));
		p.val(ts2.ToLectioTimeSpanString());

		// Skub også til en eventuel tilknyttet tekstboks.
		const otherId = p.attr('lectio-tc-other');
		if (otherId) {
			const other = $('#' + otherId);
			if (other.length === 0) {
				LectioJSUtils.LogDebug('DatePicker, time: Kan ikke se anden kontrol.');
				return false;
			}
			const otherTs = LectioTimeSpan.TryParseUserInput(other.val() as string);
			if (otherTs === null) {
				return false;
			}
			const otherTs2 = clampTimeSpan(otherTs.AddMinutes(diff));
			other.val(otherTs2.ToLectioTimeSpanString());
		}

		return false;
	});
}

function SetDatepickerDefaults() {
	/* Danish initialisation for the jQuery UI date picker plugin. */
	/* Written by Jan Christensen ( deletestuff@gmail.com). */
	// Taget fra jquery ui 1.8.2 og tilpasset lidt.

	$.datepicker.regional.da = {
		closeText: 'Luk',
		prevText: '&#x3c;Forrige',
		nextText: 'Næste&#x3e;',
		currentText: 'Idag',
		monthNames: [
			'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
			'Juli', 'August', 'September', 'Oktober', 'November', 'December'
		],
		monthNamesShort: [
			'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
			'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
		],
		dayNames: ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'],
		dayNamesShort: ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'],
		dayNamesMin: ['Sø', 'Ma', 'Ti', 'On', 'To', 'Fr', 'Lø'],
		weekHeader: 'Uge',
		dateFormat: 'd/m-yy',
		firstDay: 1,
		isRTL: false,
		showMonthAfterYear: false,
		yearSuffix: '',
		constrainInput: false,
		showWeek: true
	};
	$.datepicker.setDefaults($.datepicker.regional.da as DatepickerOptions);

	const pd = $.datepicker.parseDate;
	$.datepicker.parseDate = (format, value, settings) => {
		const ld = LectioDate.TryParseUserInput(value);
		if (ld !== null) {
			return ld.GetJSDate();
		}
		return pd(format, value, settings);
	};
}

export function openDatepicker(selector: string) {
	const enddateElem: JQuery<HTMLInputElement> | null = $(selector + "__date_tb") as JQuery<HTMLInputElement>;

	enddateElem?.datepicker("show");
}