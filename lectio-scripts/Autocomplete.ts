/// <reference types="jquery"/>

import { LectioDeferred, LectioJSUtils, LectioKeyCode } from "./LectioJSUtils";
import { fuzzyMatch } from "./fts_fuzzy_match";

export type InputDropdownDataItem = Readonly<[
	title: string,
	key: string,
	flags: string,
	group: string,
	cssClass: string,
	_que: null,
	isContextCard: boolean,
	shortName: string | null,
	longName: string | null
]>;

type DropdownDataItem = {
	title: string,
	key: string,
	flags: string,
	group: string,
	cssClass: string,
	isContextCard: boolean,
	shortName: string | null,
	longName: string | null,
	searchValues: AutocompleteSearchValues | null
};

type AutocompleteSearchValues = {
	plaintextSearchString: string,
	exactMatchStrings: string[]
};

interface ResultTempItem {
	key: string;
	title: string;
	cssClass: string;
	groupNumber: number;
	subScore: number;
	internalGroupNumber: number;
	isInactive: boolean;
	isSupplementary: boolean;
	isContextCardEntity: boolean;
}
type ResultItemCommand = 'ShowSupplementary' | 'Separator' | 'Label' | 'SearchNonReducedDataSet';
type ResultItem = {
	key: string;
	title: string;
	isSupplementary?: boolean;
	cssClass?: string;
	isInactive?: boolean;
	isContextCardEntity?: boolean;
} | {
	isSupplementary?: boolean;
	title: string;
	command: ResultItemCommand;
};

export type UnknownValueHandling = 'cvr' | 'pnr' | 'keyEqualsText';

type UnknownValueHandler = {
	getEm: (text: string) => ResultItem[];
}

/**
 * Siger lidt om gui: hvilke modifiers, der blev holdt nede.
 */
type ItemSelectionModifiers = {
	ctrlKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
	metaKey: boolean;
};

function mkmodsEmpty(): ItemSelectionModifiers {
	return {
		shiftKey: false,
		metaKey: false,
		ctrlKey: false,
		altKey: false,
	};
}

function mkmods(e: ItemSelectionModifiers): ItemSelectionModifiers {
	return {
		shiftKey: e.shiftKey,
		metaKey: e.metaKey,
		ctrlKey: e.ctrlKey,
		altKey: e.altKey,
	};
}

interface AutocompleteOptions {
	dataVariables: string[];
	favoriteVariable: string | null;
	data: DropdownDataItem[] | null;
	isReducedDataSet: boolean;
	favorites?: any[][] | null;
	unknownValueHandling?: UnknownValueHandling;
	targetValue: string;
	maxItemsToShow: number;
	groupSeparatorNumber: number;
	select: ((arg: {
		key: string,
		text: string,
		modifiers: ItemSelectionModifiers,
	}) => 'done' | 'clear' | { type: 'navigate', url: string }) | null;
	selectedOverriddenBefore: true | null;
	autoPostBackId: string | null;

	delay?: number;
	emptyText: string;
	additionalTooltip: string;
	inputClass: string;
	resultsClass: string;
	resultsWidth: number;
	selectFirst: boolean;
	selectOnly: boolean;
	matchSubset: boolean;
	autoFill: boolean;
	minChars: number;
	textDestinationControl: string;
	useFuzzySearch: boolean;
	// todo lav om til normal funktion
	reloadWithNonReducedDataSetsAsync: () => Promise<void>;
}

const titleIndex = 0;
const keyIndex = 1;
const flagsIndex = 2;
const groupIndex = 3;
const cssClassIndex = 4;
const isContextCardIndex = 6;
const shortNameIndex = 7;
const longNameIndex = 8;

interface HTMLInputElementAutocomplete extends HTMLInputElement {
	lastSelected: string;
	$resultsDiv: JQuery<HTMLElement> | null;
	resultsDiv: HTMLElement | null;
	options: AutocompleteOptions | null;
	readyDeferred: LectioDeferred<void> | undefined;
	isLoading: boolean;
	$loadingDiv: JQuery<HTMLElement> | null;
}

function GetUnknownValueHandler(
	ling: Exclude<UnknownValueHandling, 'keyEqualsText'>
): UnknownValueHandler {
	switch (ling) {
	case 'cvr':
		return {
			getEm: text => {
				if (text.match(/^[0-9]{8}$/))
					return [{ title: 'Nyt/ukendt cvr-nummer: ' + text, key: text }];
				else
					return [{ title: '(Indtast 8-cifret cvr-nummer)', command: 'Label' }];
			}
		}
	case 'pnr':
		return {
			getEm: text => {
				if (text.match(/^[0-9]{10}$/))
					return [{ title: 'Nyt/ukendt p-nummer: ' + text, key: text }];
				else
					return [{ title: '(Indtast 10-cifret p-nummer)', command: 'Label' }];
			}
		}
	default:
		LectioJSUtils.AssertNever(ling, 'ling');
	}
}

export namespace Autocomplete {
	const keyIndex = 1;
	interface DataSetJson {
		items: InputDropdownDataItem[];
		isReducedDataSet: boolean;
	}

	const dataSetUrls: {
		[key: string]: {
			promise: Promise<DataSetJson>,
			url: string,
			getDownloadedData: () => Promise<DataSetJson> | undefined;
		} | undefined
	} = {};

	export function GetX() { return dataSetUrls; }

	export function registerDataSetUrl(key: string, url: string): void {
		const existing = dataSetUrls[key];
		if (existing) {
			// Ikke noedvendigvis et problem, hvis det sker..
			LectioJSUtils.AssertArgument(existing.url === url);
			return;
		}

		if (!changeUrl_disallowReducedDataSet(url))
			throw new Error('Registrering af url der ikke tillader reducerede dataset?');

		let done = false;
		const p = getDataSetAsync(url, true).finally(() => done = true);
		dataSetUrls[key] = {
			promise: p,
			url: url,
			getDownloadedData: () => done ? p : undefined,
		};
	}

	async function getDataSetAsync(url: string, backgroundPriority: boolean): Promise<DataSetJson> {
		const p = await fetch(url, { priority: backgroundPriority ? 'low' : undefined });
		const json = await p.json();
		const obj = json as DataSetJson;
		return obj;
	}

	function changeUrl_disallowReducedDataSet(url: string): string | null {
		if (url.indexOf('&reduced=0') !== -1)
			return null;
		return url + '&reduced=0';
	}

	async function getDataSetsAsync(
		dataSetKeys: readonly string[],
		allowReducedDataSets: boolean,
		backgroundPriority: boolean): Promise<Readonly<{
			items: InputDropdownDataItem[][];
			isReducedDataSet: boolean;
		}>> {
		const promises = dataSetKeys.map(async key => {
			const r = dataSetUrls[key];
			if (!r) {
				const scriptEle = document.querySelector('script[data-dd-id=' + key + ']');
				if (!scriptEle)
					throw new Error('Ukendt ds key: ' + key);
				const text = scriptEle.textContent;
				const data = JSON.parse(text!.trim()) as DataSetJson;
				LectioJSUtils.AssertArgument('items' in data && typeof (data.items) === 'object');
				return data;
			}
			if (allowReducedDataSets)
				return r.promise;

			// Hent ikke ureduceret dataset, hvis vi har et dataset der siger at vi ikke mangler noget.
			const possiblyReducedDataSet = await r.promise;
			if (!possiblyReducedDataSet.isReducedDataSet)
				return possiblyReducedDataSet;

			const url = changeUrl_disallowReducedDataSet(r.url);
			LectioJSUtils.AssertNotNullOrEmpty(url, 'url');
			return getDataSetAsync(url, backgroundPriority);
		});

		const v = await Promise.all(promises);
		const v2 = v as any as DataSetJson[];

		const items = v2.map(r => r.items);
		const isReducedDataSet = v2.some(r => r.isReducedDataSet);
		return { items: items, isReducedDataSet: isReducedDataSet };
	}

	function HideIsLoading(
		input: HTMLInputElementAutocomplete
	): void {
		if (!input.$loadingDiv)
			return;
		input.$loadingDiv?.remove();
		input.$loadingDiv = null;
		setTimeout(() => input.focus(), 0);
		// input.focus();
	}

	function initDomAndEvents(
		input: HTMLInputElementAutocomplete,
		options: Readonly<AutocompleteOptions>
	): void {
		if (!input)
			return;

		input.options = options;

		// Create jQuery object for input element
		const $textbox = $(input);

		// Create jQuery object for input value element
		const $hiddenKeyInput = $('#' + options.targetValue) as JQuery<HTMLInputElement>;

		$textbox.attr("autocomplete", "off");

		input.lastSelected = $textbox.val() as string;

		// Apply inputClass if necessary
		if (options.inputClass) {
			$textbox.addClass(options.inputClass);
		}

		let timeout: number | null = null;
		let prev: string = "";
		let active = -1;
		let hasFocus = ($textbox.is(":focus"));
		let keepFocus = false;
		let lastKeyPressCode: number | undefined;

		if (options.emptyText) {
			$textbox.attr("placeholder", options.emptyText);
		}

		$textbox.off();
		if (input.$resultsDiv) {
			input.$resultsDiv.remove();
			input.resultsDiv = null;
		}

		$textbox
			.on('input', () => {
				active = -1;
				if (timeout)
					window.clearTimeout(timeout);

				timeout = window.setTimeout(() => onTextBoxChange(), options.delay);
			})
			.on('keydown', e => {
				if (input.isLoading) {
					ShowIsLoading();
					return;
				}
				// track last key pressed
				lastKeyPressCode = e.keyCode;
				switch (e.keyCode) {
				case LectioKeyCode.UP:
					// Kalder stopPropagation for at keyboard-navigering ikke også reagerer på tasterne.
					e.preventDefault();
					if (moveSelect(-1))
						e.stopPropagation();
					break;
				case LectioKeyCode.PAGE_UP:
					e.preventDefault();
					if (moveSelect(-5))
						e.stopPropagation();
					break;
				case LectioKeyCode.PAGE_DOWN:
					e.preventDefault();
					if (moveSelect(5))
						e.stopPropagation();
					break;
				case LectioKeyCode.DOWN:
					{
						e.preventDefault();
						ensureResultListDomInitialized();

						if (!isResultsVisible()) {
							if (e.altKey) {
								openList();
								e.stopPropagation();
							}
						} else {
							if (moveSelect(1))
								e.stopPropagation();
						}
					}
					break;
				case LectioKeyCode.ENTER: {
					if (timeout)
						window.clearTimeout(timeout);

					const didSelect = selectCurrent(mkmods(e));
					// Lidt tricky her, pas fx. på at "Udvid" spiller sammen med KeyboardNav ved enter.
					if (didSelect || isResultsVisible()) {
						e.preventDefault();
						e.stopPropagation();
					}
					if (didSelect) {
						$textbox.focus();
					}
					break;
				}
				case LectioKeyCode.TAB: {
					const didSelect2 = selectCurrent(mkmods(e));
					if (didSelect2) {
						e.stopPropagation();
					}
					if (didSelect2) {
						// make sure to blur off the current field
						$textbox.get(0)?.blur();
						$textbox.focus();
					}
					break;
				}
				}
			})
			.on('focus', () => { //Some pages set focus for typing on page load. We buy some time by only showing the loading-box visual when they start typing values in the field.
				if (input.isLoading && input.value.trim().length > 0) {
					ShowIsLoading();
					return;
				}
				// track whether the field has focus, we shouldn't process any results if the field no longer has focus
				hasFocus = true;
				if ($textbox.val() === '') {
					$textbox.val('');
				}
				else {
					$textbox.select();
				}
			})
			.on('blur', () => {
				if (input.isLoading) {
					ShowIsLoading();
					return;
				}

				// track whether the field has focus
				hasFocus = false;
				LectioJSUtils.LogDebug('AutoComplete: blur event');
				if (!keepFocus) {
					if (isResultsVisible()) {
						hideResults();
					}
					selectItemByText($textbox.val() as string);
				}
				else {
					$textbox.focus();
				}
				keepFocus = false;
			})
			.on('click', () => {
				if (input.isLoading) {
					ShowIsLoading();
					return;
				}
				// Checks for mobile
				if (LectioJSUtils.IsMobile()) {
					$textbox[0].scrollIntoView({ behavior: "auto", block: "start", inline: "start" });
				}
				// Det er problematisk at folde den ud, når der er valgt noget i forvejen, for så søger den på den nuværende tekst,
				// og så bliver bliver der ofte kun vist det valgte element, så brugeren kan tro at der ikke er andre elementer.
				if (!isResultsVisible()) {
					openList();
				}
			});

		const resetBtn = input.parentElement!.querySelector('.ac_reset_btn');
		if (resetBtn) {
			LectioJSUtils.AssertType(resetBtn, HTMLElement);
			resetBtn.addEventListener('click', evt => {
				selectAcceptedItem(null, mkmods(evt));
			});
			if (!input.lastSelected)
				$(resetBtn).hide();
			else
				$(resetBtn).show();
		}

		return;

		// Late initialization
		function ensureResultListDomInitialized(): HTMLElement {
			if (!input.resultsDiv) {
				// Create results
				input.resultsDiv = document.createElement("div");
				input.$resultsDiv = $(input.resultsDiv);
				input.$resultsDiv.hide().
					addClass(options.resultsClass).
					addClass("ac_supplementary_hidden").
					addClass("ac_results2").
					css("position", "absolute").
					css("overscroll-behavior", "contain");

				input.$resultsDiv.mousedown(() => {
					keepFocus = true;
				});

				// Add to DOM
				$textbox.after(input.$resultsDiv);
			}
			return input.resultsDiv;
		}


		// Late initialization
		function ensureLoadingDivListDomInitialized(): JQuery<HTMLElement> {
			if (!input.$loadingDiv) {
				// Create results
				const loadingDiv = document.createElement("div");

				input.$loadingDiv = $(loadingDiv);
				input.$loadingDiv.hide().
					addClass(options.resultsClass).
					css("position", "absolute").
					css("overflow", "hidden").
					css("margin-left", "1em").
					css("padding", "1em").
					css("font-weight", "bold").
					width("150px");

				// Add to DOM
				$textbox.after(input.$loadingDiv);
			}
			return input.$loadingDiv;
		}

		function ShowIsLoading(): void {
			const div = ensureLoadingDivListDomInitialized();
			div.show();

			let dots = 1;
			function UpdateHenterDataMsg() {
				let dotString = "";
				for (let i = 0; i < dots; i++)
					dotString += ".";

				div.text("Henter data" + dotString);
				dots++;
				if (dots > 3)
					dots = 1;
			}

			UpdateHenterDataMsg();
			const interval = window.setInterval(() => {
				UpdateHenterDataMsg();
			}, 300);

			window.setTimeout(() => {
				HideIsLoading(input);
				window.clearInterval(interval);
			}, 30 * 1000); // 202507 chrome med emulering af "fast 4g" netvaerk kan tage 25 sek. for stor skole.

			input.blur();
		}

		function openList(): void {
			DoSearch('', options.data);
		}

		function onTextBoxChange(forceSearchAgain?: true): void {
			ensureResultListDomInitialized();
			// ignore if the following keys are pressed: [del] [shift] [capslock]
			if (!forceSearchAgain &&
				options.unknownValueHandling !== 'keyEqualsText' &&
				lastKeyPressCode !== undefined &&
				((lastKeyPressCode > LectioKeyCode.BACKSPACE && lastKeyPressCode < LectioKeyCode.SPACE))) {
				hideResultsNow();
				return;
			}

			const v = $textbox.val() as string;
			if (v === prev && !forceSearchAgain)
				return;

			prev = v;
			if (v.length >= options.minChars) {
				DoSearch(v, options.data);
			}
			else
				hideResultsNow('preserveTextBoxContents');
		}

		function moveSelect(step: number): boolean {
			const resdiv = ensureResultListDomInitialized();
			const lis = $("li", resdiv);
			if (!lis || (lis.length === 0))
				return false;

			let newActive: number | null = null;
			const delta = step > 0 ? 1 : -1;
			for (let offset = delta, stepsPerformed = 0, iterations = 0; ; offset += delta, iterations++) {
				const candIdx = active + offset;
				if (candIdx < 0) {
					offset = lis.length - active;
					continue;
				} else if (candIdx >= lis.length) {
					offset = -(active + 1);
					continue;
				}

				const lisCandidate = $(lis[candIdx]);
				if (lisCandidate.is(':visible')) {
					stepsPerformed++;

					if (stepsPerformed === Math.abs(step)) {
						newActive = candIdx;
						break;
					}
				}

				if (candIdx === active) {
					// Vi har kørt en runde uden at finde noget.
					return true;
				}

				if (iterations > lis.length + 2)
					throw new Error('Urealistisk mange iterationer uden at finde element.');
			}

			active = newActive;

			lis.removeClass("ac_over");

			const lisactive = $(lis[active]);
			lisactive.addClass("ac_over");

			if (!input.$resultsDiv)
				throw new Error('$results');
			// scroll item into view
			const scrollTop = input.$resultsDiv.scrollTop() as number;
			const ypos = lisactive.position().top + scrollTop;
			const divheight = input.$resultsDiv.innerHeight() as number;
			const elemHeight = lisactive.outerHeight() as number;
			if (ypos < scrollTop)
				input.$resultsDiv.scrollTop(ypos);
			else if (ypos > scrollTop + divheight - elemHeight)
				input.$resultsDiv.scrollTop(ypos - divheight + elemHeight);

			return true;
		}

		function selectCurrent(mods: ItemSelectionModifiers): boolean {
			ensureResultListDomInitialized();
			if (!input.resultsDiv)
				throw new Error('results');
			let li = $("li.ac_over", input.resultsDiv)[0] as HTMLLIElement | undefined;
			if (!li) {
				const $li = $("li", input.resultsDiv);
				if (options.selectOnly) {
					if ($li.length === 1)
						li = $li[0] as HTMLLIElement;
				} else if (options.selectFirst)
					li = $li[0] as HTMLLIElement;
			}

			return !!li && selectItemByLI(li, mods);
		}


		function tryGetAcceptedItemFromDataSetForTitle(text: string): AcceptedItem | null {
			if (options.data == null)
				return null;

			for (const row of options.data) {
				const rowText = row.title.trim();
				if (rowText === text)
					return { title: row.title, key: row.key, shortName: row.shortName, longName: row.longName };
			}
			return null;
		}

		function tryGetAcceptedItemFromDataSetForKey(key: string): AcceptedItem | null {
			if (options.data == null)
				return null;

			for (const row of options.data) {
				if (row.key === key)
					return { title: row.title, key: row.key, shortName: row.shortName, longName: row.longName };
			}
			return null;
		}

		/** Denne funktion kan returnere et element der ikke findes i datasaettet. */
		function tryGetAcceptedItem(text: string): AcceptedItem | null {
			const fromds = tryGetAcceptedItemFromDataSetForTitle(text);
			if (fromds)
				return fromds;
			if (options.unknownValueHandling && options.unknownValueHandling === 'keyEqualsText')
				return { title: text, key: text, shortName: text, longName: text };

			const fromds_bykey = tryGetAcceptedItemFromDataSetForKey(text);
			if (fromds_bykey)
				return fromds_bykey;

			if (!options.unknownValueHandling)
				return null;
			const theone = GetUnknownValueHandler(options.unknownValueHandling)
				.getEm(text)
				.filter(ri => 'key' in ri)[0];
			// Bruger kun key og ikke title, for ellers ender vi med fritekst i
			// feltet, som ikke findes i data.
			// Det er simplere at der kun staar et cvrnr/pnr eller anden vaerdi
			// der er 'key'.
			return theone && 'key' in theone ? { title: theone.key, key: theone.key, shortName: null, longName: null } : null;
		}

		/**
		 * Repraesenterer noegle og vaerdi der er godkendt fordi de findes i
		 * datasaettet, eller fordi der fx er indtastet nogle der ligner et (ukendt)
		 * cvr-nummer, og som vaelgeren derfor har besluttet sig for at godkende.
		 */
		type AcceptedItem = Readonly<{ title: string, key: string, shortName: string | null, longName: string | null }>;

		function selectItemByText(textRaw: string | undefined) {
			const text = (textRaw || '').trim().replace(/\s+/g, ' ');
			if (text === "") {
				selectAcceptedItem(null, mkmodsEmpty());
				return;
			}

			let item = tryGetAcceptedItem(text);
			if (!item) {
				// Vi falder tilbage paa den hidtidige vaerdi.
				const prevKey = $hiddenKeyInput.val() as string;
				if (prevKey) {
					item = tryGetAcceptedItem(prevKey);
					if (!item)
						throw new Error("selectItemByText: Kan ikke. prevkey: " + prevKey + '. Er der dobbelte mellemrum i titlen i datasaettet?');
				} else
					item = null;
			}
			selectAcceptedItem(item, mkmodsEmpty());
		}

		function selectAcceptedItem(item: AcceptedItem | null, mods: ItemSelectionModifiers) {
			// Passer på ikke at udløse validering ifbm. kald af change() med
			// mindre der reelt er en ny værdi.
			// Tab igennem feltet skal nemlig ikke udløse validering, for det
			// gør andre felter ikke.
			const oldval = $hiddenKeyInput.val();
			const newValue = item ? item.key : '';
			const valueChanged = oldval !== newValue;

			const useShortName = item ? item.shortName != null : false;

			const newContent = item ? (useShortName ? item.shortName ?? '' : item.title) : '';
			const newTooltip = item ? (useShortName ? item.longName : null) : null;

			if (valueChanged)
				$hiddenKeyInput.val(newValue).change();

			$textbox.val(newContent);
			if (newTooltip !== null)
				$textbox.attr('data-tooltip', newTooltip);

			LectioJSUtils.LogDebug('selectAcceptedItem', { item: item, valueChanged: valueChanged });
			if (item && valueChanged && options.select) {
				const rv = options.select({
					key: item.key,
					text: item.title,
					modifiers: mods,
				});

				if (typeof rv !== 'string') {
					switch (rv.type) {
					case 'navigate':
						$textbox.val('');
						$hiddenKeyInput.val('');
						if (mods.altKey || mods.shiftKey || mods.metaKey)
							throw new Error('hvorfor nu det...');

						if (mods.ctrlKey)
							window.open(rv.url);
						else
							location.href = rv.url;
						return;
					default:
						LectioJSUtils.AssertNever(rv.type, rv);
					}
				}
				else {
					switch (rv) {
					case 'clear':
						$textbox.val('');
						$hiddenKeyInput.val('');
						break;
					case 'done':
						break;
					default:
						LectioJSUtils.AssertNever(rv, rv);
					}
				}
			}
			// burde nok lave dette om til at tjekke paa aendring af key samt
			// evt title isf blot title.
			if (newContent !== input.lastSelected && options.autoPostBackId && valueChanged) {
				// vi giver et id med her. Pt. (201903) bruges det ikke af kontrollen,
				// men givets blot for at der ikke lave fuld postback i updatepanels.
				const pbid = options.autoPostBackId;
				window.setTimeout(() => window.__doPostBack(pbid, ''), 20);
			}
			input.lastSelected = newContent;

			prev = newContent;
			if (input.resultsDiv !== null) {
				// vi vil ikke kaldes rekursivt.
				hideResultsNow('avoidSelect');
			}

			if (options.textDestinationControl) {
				const tb = $('#' + options.textDestinationControl);
				if (!tb.length && window.console)
					console.error('autocomplete: kontrol "' + options.textDestinationControl + '" blev ikke fundet.');
				tb.val(newContent);
			}

			if (resetBtn) {
				LectioJSUtils.AssertType(resetBtn, HTMLElement);
				if (item)
					$(resetBtn).hide();
				else
					$(resetBtn).show();
			}
		}

		function selectItemByLI(li: HTMLLIElement, mods: ItemSelectionModifiers): boolean {
			LectioJSUtils.LogDebug('selectItemByLI');
			if (!input.$resultsDiv)
				throw new Error('$results');

			const cmd = $(li).attr("ac-command") as ResultItemCommand | undefined;
			if (cmd) {
				switch (cmd) {
				case "Separator":
				case "Label":
					break;
				case "ShowSupplementary":
					if (input.$resultsDiv.is(".ac_supplementary_hidden")) {
						input.$resultsDiv.removeClass("ac_supplementary_hidden");
					}
						break;
				case 'SearchNonReducedDataSet':
					input.isLoading = true;
					hideResultsNow('preserveTextBoxContents');
					ShowIsLoading();
					options.reloadWithNonReducedDataSetsAsync()
						.then(() => {
							input.isLoading = false;
							HideIsLoading(input);
							$textbox.focus();
							onTextBoxChange(true);
							LectioJSUtils.DispatchBrowserTestEvent('autocomplete_reloadedwithnonreduced');
						});
					break;
				default:
					LectioJSUtils.AssertNever(cmd, 'cmd');
				}
				return false;
			} else {
				const listkey = $(li).attr('selectValue');
				if (!listkey)
					throw new Error('Fandt ikke item li-key.');
				let item = tryGetAcceptedItemFromDataSetForKey(listkey);
				if (!item && options.unknownValueHandling)
					item = tryGetAcceptedItem(listkey);
				if (!item)
					throw new Error('Fandt ikke item i data for li-key "' + listkey + '".');
				selectAcceptedItem(item, mods);
				return true;
			}
		}

		/**  selects a portion of the input string */
		function createSelection(start: number, end: number): void {
			// get a reference to the input element
			const field = $textbox.get(0) as any;
			if (field.createTextRange) {
				const selRange = field.createTextRange();
				selRange.collapse(true);
				selRange.moveStart("character", start);
				selRange.moveEnd("character", end);
				selRange.select();
			} else if (field.setSelectionRange) {
				field.setSelectionRange(start, end);
			} else {
				if (field.selectionStart) {
					field.selectionStart = start;
					field.selectionEnd = end;
				}
			}
			field.focus();
		}

		function showResultsBox(selectFirstElement: boolean): void {
			ensureResultListDomInitialized();

			// get the position of the input field right now (in case the DOM is shifted)
			let iWidth = options.resultsWidth;
			if (iWidth <= 0) {
				const width = $textbox.width();
				if (!width) {
					iWidth = 20;
				} else {
					iWidth = parseInt(width.toString(), 10) * 1.75;
				}
			}
			// reposition
			if (!input.$resultsDiv)
				throw new Error('$results');

			//Make the result div fit the viewport.
			if (LectioJSUtils.IsMobile()) {
				input.$resultsDiv.css({
					maxwidth: 90 + "dvw",
					left: 0 + "px"
				}).show();
				input.$resultsDiv.position({ my: "left top", at: "left bottom", of: input, collision: "fit" });
			}
			else {
				input.$resultsDiv.css({
					width: iWidth + "px",
					maxWidth: 90 + "vw"
				}).show();
				input.$resultsDiv.position({ my: "left top", at: "left bottom", of: input });
			}
			if (selectFirstElement)
				moveSelect(1);
		}

		function isResultsVisible(): boolean {
			const d = ensureResultListDomInitialized();
			return $(d).is(":visible");
		}

		function hideResults(): void {
			if (timeout) {
				window.clearTimeout(timeout);
			}
			timeout = window.setTimeout(hideResultsNow, 400);
		}

		function hideResultsNow(
			behavior?: 'preserveTextBoxContents' | 'avoidSelect'
		): void {
			if (timeout) {
				window.clearTimeout(timeout);
			}
			const resdiv = ensureResultListDomInitialized();
			if (isResultsVisible()) {
				$(resdiv).hide();
				$(resdiv).addClass("ac_supplementary_hidden");
			}

			if (!behavior) {
				const v = $textbox.val();
				if (v !== input.lastSelected)
					selectAcceptedItem(null, mkmodsEmpty());
			}

			$(resdiv).html("");
		}

		function dataToDom(data: ResultItem[]) {
			const ul = document.createElement("ul");
			let num = data.length;

			// limited results to a max number
			if ((options.maxItemsToShow > 0) && (options.maxItemsToShow < num)) {
				num = options.maxItemsToShow;
			}

			// Vi vil undgå at sidste tegn bliver skjult under scrollbaren -
			// derfor nbsp til sidst på linien.
			const nbsp = String.fromCharCode(160);
			const spacePad = nbsp + nbsp + nbsp + nbsp + nbsp + nbsp + nbsp + nbsp + nbsp + nbsp;

			for (let i = 0; i < num; i++) {
				const row = data[i];
				const li = $(document.createElement("li"));

				let cssClass = '';
				if (row.isSupplementary)
					cssClass += " ac_supplementary";

				if (!('command' in row)) {
					cssClass = row.cssClass || "";
					if (row.isInactive)
						cssClass += " ac_inactive";

					li.text(row.title + spacePad);
					li.attr('selectValue', row.key as string);

					if (row.isContextCardEntity)
						li.attr("data-lectioContextCard", row.key as string);
				}
				else {
					switch (row.command) {
					case "ShowSupplementary":
						li.attr("ac-command", row.command);
						li.text(row.title);
						break;
					case "Separator":
					case "Label":
					case "SearchNonReducedDataSet":
						li.attr("ac-command", row.command);
						li.text(row.title || String.fromCharCode(160));
						break;
					default:
						LectioJSUtils.AssertNever(row.command, 'row.command');
					}
				}

				if (cssClass)
					li.attr("class", cssClass);
				ul.appendChild(li[0]);
			}

			$(ul).on('mouseenter', 'li',
				function () {
					$("li", ul).removeClass("ac_over");
					$(this).addClass("ac_over");
					const ele = $(this).get(0);
					if (ele)
						active = $("li", ul).indexOf(ele);
				}
			);

			$(ul).on('mouseleave', 'li',
				function () { $(this).removeClass("ac_over"); }
			);
			$(ul).on('click', 'li', function (e) {
				if (timeout) {
					window.clearTimeout(timeout);
				}
				e.preventDefault();
				e.stopPropagation();

				if (selectItemByLI(this, e)) {
					hideResultsNow();
					$textbox.focus();
				}
			});

			return ul;
		}

		function DoSearch(q: string, data: AutocompleteOptions['data']): void {
			let matcher: (item: DropdownDataItem) => [MatchQuality, number];

			if (options.useFuzzySearch) {
				matcher = item => {
					const res = fuzzyMatch(q, item.title);
					if (res[0] === false)
						return [0, 0];

					// Burde man bare returnere en konstant MatchQuality her?
					let mq: MatchQuality;
					const score = res[1];
					if (score >= 70)
						mq = 3;
					if (score > 0)
						mq = 2;
					mq = 1;
					return [mq, res[1]];
				}
			}
			else {
				const mm = Autocomplete.CreateMatcher(q);
				matcher = item => [mm(item), 0];
			}
			q = q.toLowerCase().trim();

			ensureResultListDomInitialized();
			if (!input.resultsDiv)
				throw new Error('results');
			input.resultsDiv.innerHTML = "";

			// if the field no longer has focus or if there are no matches, do
			// not display the drop down
			if (!hasFocus) {
				hideResultsNow();
				return;
			}

			if (data === null) {
				input.resultsDiv.appendChild(dataToDom([{ title: '(Henter data...)', command: "Label" }]));
				showResultsBox(!!q);
				return;
			}
			else if (data.length === 0) {
				input.resultsDiv.appendChild(dataToDom([{ title: '(Der er ingen poster at vælge imellem)', command: "Label" }]));
				showResultsBox(!!q);
				return;
			}

			LectioJSUtils.AssertNotNullOrUndefined(options.data, 'data');
			const searchResults = DoSearchWithMatcher(matcher, q, options, options.data);
			if (searchResults == 'cancel') {
				hideResultsNow();
				return;
			}
			input.resultsDiv.appendChild(dataToDom(searchResults));

			LectioJSUtils.DispatchBrowserTestEvent('autocomplete_searchresultsdisplayed');

			// autofill in the complete box w/the first match as long as the
			// user hasn't entered in more data
			if (options.autoFill && !options.matchSubset &&
				(($textbox.val() as string).toLowerCase() === q.toLowerCase())) {
				// fills in the input box w/the first match (assumed to be the best match)
				const sValue = data[0].title;
				// if the last user key pressed was backspace, don't autofill
				if (lastKeyPressCode === 8)
					return;

				// fill in the value (keep the case the user has typed)
				$textbox.val($textbox.val() + sValue.substring(prev.length));
				// select the portion of the value not typed by the user (so the
				// next character will erase)
				createSelection(prev.length, sValue.length);
			}

			showResultsBox(!!q);
		}
	}

	function splitByType<T1, T2>(
		items: (T1 | T2)[],
		det: ((x: (T1 | T2)) => x is T1)
	): [T1[], T2[]] {
		const arr1: T1[] = [];
		const arr2: T2[] = [];
		for (const item of items) {
			if (det(item))
				arr1.push(item);
			else
				arr2.push(item);
		}
		return [arr1, arr2];
	}

	let allReadyDeferred: LectioDeferred<void> | undefined;
	let initializingCount: number | undefined;

	export async function autocompleteCtrl(
		elementId: string,
		dataEx: (string | InputDropdownDataItem[])[],
		options: Partial<AutocompleteOptions>,
		restrictto: string[] | undefined
	): Promise<void> {
		const e = document.getElementById(elementId) as HTMLInputElementAutocomplete;

		// Element is not sent to Client, dont do anything (it's in a hidden
		// template field)
		if (!e)
			return;


		// Set default values for required options
		const defaults: AutocompleteOptions = {
			dataVariables: [],
			favoriteVariable: null,
			data: [],
			favorites: [],
			isReducedDataSet: false,
			reloadWithNonReducedDataSetsAsync: () => { throw new Error('mangler'); },
			targetValue: "",
			maxItemsToShow: 50,
			groupSeparatorNumber: 15,
			select: null,
			selectedOverriddenBefore: null,
			autoPostBackId: null,
			delay: 10,
			emptyText: "",
			additionalTooltip: "",
			inputClass: "ac_input",
			resultsClass: "ac_results",
			resultsWidth: -1,
			selectFirst: false,
			selectOnly: false,
			matchSubset: true,
			autoFill: true,
			minChars: 1,
			textDestinationControl: "",
			useFuzzySearch: false,
		};

		const settings = $.extend({}, defaults, options);
		let myInitCount = 0;

		initializingCount ??= 0;
		initializingCount++;

		e.isLoading = true;
		await initAsync(true, true);
		e.isLoading = false;
		e.readyDeferred?.resolve();

		initializingCount--;
		if (initializingCount === 0) {
			allReadyDeferred ??= LectioJSUtils.CreateDeferred<void>();
			allReadyDeferred.resolve();
		}

		return;

		async function initAsync(allowReducedDataSets: boolean, backgroundPriority: boolean): Promise<void> {
			myInitCount++;
			LectioJSUtils.AssertArgument(myInitCount === 1 || myInitCount === 2);
			const [dataVariables, realData] = splitByType<string, InputDropdownDataItem[]>(dataEx, v => typeof v === 'string');
			settings.data = null;
			const dataPromise = getDataSetsAsync(dataVariables, allowReducedDataSets, backgroundPriority);

			// Lav basal initialisering inden at vi noedvendigvis har alle data.
			if (myInitCount === 1)
				initDomAndEvents(e, settings);

			// Fortsaetter naar vi har alle data.
			const obj = await dataPromise;
			HideIsLoading(e);
			const data = obj.items;
			const isReducedDataSet = obj.isReducedDataSet;

			settings.reloadWithNonReducedDataSetsAsync = async () => {
				LectioJSUtils.AssertArgument(allowReducedDataSets !== false, 'Den var i forvejen false?');
				LectioJSUtils.AssertArgument(settings.isReducedDataSet === true, 'true??');
				await initAsync(false, false);
			};
			data.push(...realData);

			const favorites = settings.favoriteVariable == null
				? null
				: (await getDataSetsAsync([settings.favoriteVariable], false, backgroundPriority)).items.single();

			const datay = restrictto
				? [data[0].filter(d => restrictto.indexOf(d[1]) !== -1)]
				: data;

			const datax = (() => {
				const tempdata: DropdownDataItem[] = [];
				for (const rr of datay) {
					for (const row of rr) {
						tempdata.push({
							title: row[titleIndex],
							key: row[keyIndex],
							flags: row[flagsIndex],
							group: row[groupIndex],
							cssClass: row[cssClassIndex],
							isContextCard: row[isContextCardIndex],
							shortName: row[shortNameIndex],
							longName: row[longNameIndex],
							searchValues: null,
						});
					}
				}
				return tempdata;
			})();

			settings.data = datax;
			settings.isReducedDataSet = isReducedDataSet;
			settings.favorites = favorites as (any[][] | null);
		}
	}

	export function autocompleteCtrlLoading(elementId: string) {
		const e = document.getElementById(elementId) as HTMLInputElementAutocomplete;
		e.disabled = true;
	}

	/**
	 * Data hentes ikke noedvendigvis foer document.readyState == 'complete',
	 * saa hvis man vil vente til at alle vaelgere har hentet data, kan dette
	 * promise bruges. */
	export function GetAllReadyPromise(elementId: string): Promise<void> {
		allReadyDeferred ??= LectioJSUtils.CreateDeferred<void>();
		return allReadyDeferred.promise();
	}

	export function GetReadyPromise(elementId: string): Promise<void> {
		const e = LectioJSUtils.GetAssertedType(
			document.getElementById(elementId), HTMLInputElement) as HTMLInputElementAutocomplete;
		LectioJSUtils.AssertNotNullOrUndefined(e, 'the element');

		if (!e.isLoading)
			return Promise.resolve();

		e.readyDeferred ??= LectioJSUtils.CreateDeferred<void>();
		return e.readyDeferred.promise();
	}

	/**
	 * Beregnet til naar man har lavet en vaelger paa serveren, men man gerne
	 * vil have events paa klienten.
	 */
	export function OverrideSelect(
		elementId: string,
		select: AutocompleteOptions['select']
	): void {
		const e = LectioJSUtils.GetAssertedType(
			document.getElementById(elementId), HTMLInputElement) as HTMLInputElementAutocomplete;
		LectioJSUtils.AssertNotNullOrUndefined(e, 'the element');
		LectioJSUtils.AssertNotNullOrUndefined(e.options, 'the options');
		if (!e.options)
			throw new Error('e.options');
		if (e.options.select && !e.options.selectedOverriddenBefore)
			throw new Error('select');
		e.options.select = select;
		e.options.selectedOverriddenBefore = true;
	}

	export function CreateMatcher(searchExpression: string): ((item: DropdownDataItem) => MatchQuality) {
		const q = searchExpression.toLowerCase().trim();
		const qa = q.split(" ");

		return (item: DropdownDataItem): MatchQuality => {
			if (!item.searchValues)
				item.searchValues = createSearchValues(item);

			const curtext = item.searchValues.plaintextSearchString;
			let allpassed = true;
			let giveUp = false;
			let exactMatch = false;

			//Exact same text
			if (q === curtext) {
				exactMatch = true;
				allpassed = true;
			}
			else {
				for (let j = 0; j < qa.length; j++) {
					const queryPart = qa[j];

					if (item.searchValues.exactMatchStrings.includes(queryPart)) {
						exactMatch = true;
						break;
					}

					let idx = -1;
					while (true) {
						idx = curtext.indexOf(queryPart, idx + 1);
						if (idx < 0) {
							allpassed = false;
							giveUp = true;
							break;
						}

						let befval = " ";
						if (idx > 0) {
							befval = curtext.substr(idx - 1, 1);
						}

						// Allowed word separators, ensures that the matched
						// value is at the beginning of a word
						if (befval === " " || befval === "-" || befval === "(" || befval === ")" || (befval >= '0' && befval <= '9') || befval === "/") {
							break;
						}
					}

					if (giveUp) {
						break;
					}
				}
			}

			if (allpassed) {
				if (exactMatch) {
					return 3;
				} else if (curtext.indexOf(q) === 0) {
					return 2;
				} else {
					return 1;
				}
			}
			else {
				return 0;
			}
		};
	}

}

function createSearchValues(item: DropdownDataItem): AutocompleteSearchValues {
	let plaintext = item.title.toLowerCase().trim();
	const exactMatches = [];

	// Teacher initials
	const maycontainTeacher = item.cssClass == " ft" && plaintext.charAt(plaintext.length - 1) == ')';
	if (maycontainTeacher) {
		const matches = plaintext.match(/\(([a-z]{2,5})\)$/);
		if (matches && matches.length == 2) {
			const initials = matches[1];

			exactMatches.push(initials);
		}
	}

	// Student CPR-numbers
	const mayContainCprNumber = item.cssClass == " fs" && plaintext.indexOf('-') >= 0;
	if (mayContainCprNumber) {
		const matches = item.title.match(/([0-9]{6})-([0-9]{4})/,);
		if (matches && matches.length == 3) {
			const cprWithoutDash = matches[1] + matches[2];
			const cprWithDash = matches[0];

			exactMatches.push(cprWithDash);
			exactMatches.push(cprWithoutDash);

			plaintext += " " + cprWithoutDash;
		}
	}

	return {
		plaintextSearchString: plaintext,
		exactMatchStrings: exactMatches,
	};
}
type MatchQuality = 0 | 1 | 2 | 3;

function DoSearchWithMatcher(
	matcher: ((item: DropdownDataItem) => [MatchQuality, number]),
	q: string,
	options: AutocompleteOptions,
	data: DropdownDataItem[]
): 'cancel' | ResultItem[] {
	const tsAtStart = performance.now();
	const marks: { name: string, ts: number }[] = [];
	marks.push({ name: 'resultResultListDomInitialized', ts: performance.now() });


	marks.push({ name: 'prepareDom', ts: performance.now() });

	const resultsDataTemp: ResultTempItem[] = [];
	const resultsData: ResultItem[] = [];

	const favKeyDict = {} as any[];
	if (options.favorites) {
		for (let k = 0; k < options.favorites.length; k++) {
			favKeyDict[options.favorites[k][keyIndex]] = 1;
		}
	}

	for (const recordArr of data) {
		let include = false;
		let exactMatch = false;
		let goodMatch = false;
		let subscore: number;

		if (options.matchSubset) {
			const [matchQuality, mq2] = matcher(recordArr);
			subscore = mq2;
			if (matchQuality === 3) {
				include = true;
				exactMatch = true;
			} else if (matchQuality === 2) {
				include = true;
				goodMatch = true;
			} else if (matchQuality === 1) {
				include = resultsDataTemp.length < 200;
			} else if (matchQuality === 0) {
				// ok
			} else {
				throw new Error("wtf");
			}
		} else {
			// To be optimized
			if (recordArr.title.substr(0, q.length) === q) {
				include = true;
			}
			subscore = 0;
		}

		if (!include) {
			continue;
		}

		const recordObj = {
			key: recordArr.key,
			title: recordArr.title,
			cssClass: recordArr.cssClass,
			groupNumber: parseInt(recordArr.group, 10),
			subScore: subscore,
			internalGroupNumber: 2,
			isInactive: !!recordArr.flags.match(/i/),
			isSupplementary: parseInt(recordArr.group, 10) > 2 * options.groupSeparatorNumber,
			isContextCardEntity: recordArr.isContextCard
		};

		const isFavoriteMatch = recordObj.key in favKeyDict;

		if (exactMatch && !recordObj.isInactive) {
			recordObj.groupNumber = 1;
			recordObj.isSupplementary = false;
		} else if (isFavoriteMatch && !recordObj.isInactive) {
			recordObj.groupNumber = 2;
			recordObj.isSupplementary = false;
		}

		if (goodMatch) {
			recordObj.internalGroupNumber = 0;
		} else {
			recordObj.internalGroupNumber = 1;
		}

		resultsDataTemp.push(recordObj);
	}
	resultsDataTemp.sort((a, b) => {
		if (a.groupNumber !== b.groupNumber) {
			return a.groupNumber - b.groupNumber;
		} else if (a.internalGroupNumber !== b.internalGroupNumber) {
			return a.internalGroupNumber - b.internalGroupNumber;
		} else if (a.subScore !== b.subScore) {
			return b.subScore - a.subScore;
		} else {
			return 0;
		}
	});
	marks.push({ name: 'matchAndSort', ts: performance.now() });

	const groupSeparatorNumber = options.groupSeparatorNumber;
	let lastGroupNumber = 0;
	let hasAddedLoadNonReduced = false;
	for (let n = 0; n < resultsDataTemp.length; n++) {
		const currentItem = resultsDataTemp[n];
		const currentGroupNumber = currentItem.groupNumber;

		if (Math.floor(currentGroupNumber / groupSeparatorNumber) !== Math.floor(lastGroupNumber / groupSeparatorNumber)) {
			if (lastGroupNumber < 2 * groupSeparatorNumber && currentGroupNumber > 2 * groupSeparatorNumber) {
				if (options.isReducedDataSet && !hasAddedLoadNonReduced) {
					resultsData.push({
						command: "SearchNonReducedDataSet",
						title: "Søg i alle"
					});
					hasAddedLoadNonReduced = true;
				}

				resultsData.push({
					command: "ShowSupplementary",
					title: "Udvid"
				});
			} else if (n !== 0) {
				resultsData.push({
					command: "Separator",
					title: String.fromCharCode(160),
					isSupplementary: currentGroupNumber > 2 * groupSeparatorNumber
				});
			}
		}

		resultsData.push(currentItem);
		lastGroupNumber = currentGroupNumber;
	}

	if (resultsData.length === 0) {
		if (options.unknownValueHandling == 'keyEqualsText') {
			return 'cancel';
		}

		const synth: ResultItem[] = (() => {
			if (options.unknownValueHandling)
				return GetUnknownValueHandler(options.unknownValueHandling).getEm(q);
			return [];
		})();

		for (const r of synth)
			resultsData.push(r);
		if (synth.filter(ri => 'key' in ri && ri.key).length === 0) {
			resultsData.push({ title: '(Der er ingen poster at vælge imellem)', command: 'Label' });
		}
	}
	if (options.isReducedDataSet && !hasAddedLoadNonReduced)
		resultsData.push({
			command: "SearchNonReducedDataSet",
			title: "Søg i alle"
		});


	marks.push({ name: 'dataToDom', ts: performance.now() });
	marks.push({ name: 'showResultsBox', ts: performance.now() });

	const obj: { [idx: string]: number } = {};
	for (let i = 0; i < marks.length; i++) {
		const last = i === 0 ? tsAtStart : marks[i - 1].ts;
		obj[marks[i].name] = marks[i].ts - last;
	}
	return resultsData;
}