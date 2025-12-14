import { LectioJSUtils } from "./LectioJSUtils";
import { SkemaUge } from "./SkemaUge";
import { SkemaListe } from "./SkemaListe";
import { SkemaForsideUtils } from "./SkemaForsideUtils";

export namespace SkemaForside {

	let skemaIdForPostback: string | undefined;

	let frigivBtnIdForPostback: string | undefined;

	let straBase: number | undefined;

	export let detailsIsDirty: boolean = false;

	export function FrigivScenarie() {
		let userConfirmation: boolean = false;
		if (detailsIsDirty)
			userConfirmation = confirm("Vil du frigive scenariet?\n\nDer er stadig ændringer som ikke er gemt endnu. Disse bliver automatisk gemt før scenariet frigives.");
		else
			userConfirmation = confirm("Vil du frigive scenariet?");

		if (!userConfirmation)
			return;

		waitUntilSaveHasBeenPerformedToFrigiv();

		function waitUntilSaveHasBeenPerformedToFrigiv() {
			if (detailsIsDirty) {
				setTimeout(() => {
					waitUntilSaveHasBeenPerformedToFrigiv();
				}, 100);
			}
			else {
				LectioJSUtils.AssertNotNullOrEmpty(frigivBtnIdForPostback, 'frigivBtnIdForPostback');
				window.__doPostBack(frigivBtnIdForPostback, "frigiv scenarie");
			}		
		}
	}

	export function RegisterDirtyCheck(id: string) {
		const updatePanel = document.getElementById(id) as HTMLElement;

		if (LectioJSUtils.HasBeenHere(updatePanel, 'registerDirtyCheck'))
			return;

		LectioJSUtils.AssertNotNullOrUndefined(updatePanel, "Kunne ikke finde updatePanel med id " + id);

		$(updatePanel).on('keypress', 'table tr:not(:last-child) textarea, table tr:not(:last-child) input',
			_ => {
				detailsIsDirty = true;
			});
	}

	export function RegisterFrigivBtnIdForPostback(id: string) {
		LectioJSUtils.AssertNotNullOrUndefined(id, "id");

		frigivBtnIdForPostback = id;
	}

	export function ResetStraBase(): void {
		straBase = undefined;
	}

	export function stra(): void {
		const observer = new PerformanceObserver(list => {
			list.getEntries().forEach(entry => {
				straBase ??= entry.startTime;
				if (entry.entryType === 'resource' && 'deliveryType' in entry && entry['deliveryType'] === 'cache') {
					return;
				}
				// Display each reported measurement on console
				if (console) {
					LectioJSUtils.LogDebug(
						", Type: " + entry.entryType +
						", Name: " + entry.name.slice(0, 60) +
						", Start: " + (entry.startTime - straBase) +
						", Duration: " + entry.duration +
						", body: " + (entry instanceof PerformanceResourceTiming ? entry.encodedBodySize : '') +
						"\n");
				}
			})
		});

		observer.observe({
			entryTypes: ['resource', 'mark', 'measure',
				'longtask', 'navigation', 'paint', 'largest-contentful-paint',
			]
		});
	}


	let shareUrl: string | undefined;
	export function SetShareUrl(url: string): void {
		shareUrl = url;
	}


	export async function CopyShareUrlToClipboard(): Promise<void> {
		LectioJSUtils.AssertNotNullOrUndefined(navigator.clipboard, 'navigator.clipboard');
		if (!shareUrl)
			throw new Error('share url is not set');

		try {
			await navigator.clipboard.writeText(shareUrl);
			LectioJSUtils.ShowInformation('Link kopieret.');
		}
		catch (err) {
			LectioJSUtils.LogError('Async: Could not copy text: ', err);
		}
	}

	/// "flipped": Ugedage paa y-aksen.
	export function InitializeSkemaFlipped(skemaid: string, skemaContainerQuery: string, skemaUgeContentDivId: string) {
		performance.mark('skemauge-initialize');
		LectioJSUtils.AssertNotNullOrEmpty(skemaid, 'skemaid');
		LectioJSUtils.AssertNotNullOrEmpty(skemaContainerQuery, 'skemaContainerQuery');
		LectioJSUtils.AssertNotNullOrEmpty(skemaUgeContentDivId, 'skemaUgeContentDivId');

		const skemaContainer = document.querySelector(skemaContainerQuery);
		LectioJSUtils.AssertNotNullOrUndefined(skemaContainer, 'skemaContainer');

		const skemaUgeContentDiv = document.getElementById(skemaUgeContentDivId);
		LectioJSUtils.AssertNotNullOrUndefined(skemaUgeContentDiv, 'skemaUgeContentDivId');

		skemaIdForPostback = skemaid;

		if (LectioJSUtils.HasBeenHere(skemaContainer, 'skemaforside'))
			return;

		InitDragDrop(skemaUgeContentDiv, { flipped: true });
		SkemaUge.Initialize(skemaUgeContentDivId, skemaid);
	}
	
	export function InitializeSkemaListe(skemaid: string, skemaContainerQuery: string, skemaListeContentDivId: string) {
		LectioJSUtils.AssertNotNullOrEmpty(skemaid, 'skemaid');

		performance.mark('skemauge-initialize');
		LectioJSUtils.AssertNotNullOrEmpty(skemaid, 'skemaid');
		LectioJSUtils.AssertNotNullOrEmpty(skemaContainerQuery, 'skemaContainerQuery');
		LectioJSUtils.AssertNotNullOrEmpty(skemaListeContentDivId, 'skemaListeContentDivId');

		const skemaContainer = document.querySelector(skemaContainerQuery);
		LectioJSUtils.AssertNotNullOrUndefined(skemaContainer, 'skemaContainer');

		const skemaListeContentDiv = document.getElementById(skemaListeContentDivId);
		LectioJSUtils.AssertNotNullOrUndefined(skemaListeContentDiv, 'skemaListeContentDiv');

		skemaIdForPostback = skemaid;

		if (LectioJSUtils.HasBeenHere(skemaContainer, 'skemaforside'))
			return;
			
		SkemaListe.Initialize(skemaListeContentDivId, skemaid);
	}

	export type ModuleTimes = {
		readonly [key: string]: string;
	};

	/// "flipped": Ugedage paa y-aksen.
	export function InitializeSkemaNotFlipped(
		config: {
			skemaid: string,
			contentDivId: string,
			moduleTimes: ModuleTimes,
		}): void {
		LectioJSUtils.AssertNotNullOrEmpty(config.skemaid, 'skemaid');

		const skemaContainer = document.getElementById(config.contentDivId);
		LectioJSUtils.AssertType(skemaContainer, HTMLElement);

		skemaIdForPostback = config.skemaid;

		if (LectioJSUtils.HasBeenHere(skemaContainer, 'skemaforside'))
			return;

		InitDragDrop(skemaContainer, { flipped: false, moduleTimes: config.moduleTimes });
		SkemaForsideUtils.InitializeBrikIndividualSelection(config.contentDivId, config.skemaid);
	}

	type ModuleKeyParts = Readonly<{
		date: string,
		moduleNo: string | null,
	}>;

	type SkemaDragData = Readonly<{
		ids: readonly string[];
		module: ModuleKeyParts,
		dropGranularity: 'day' | 'module',
	}>;

	type SkemaSetup = Readonly<{
		flipped: true;
	} | {
		flipped: false;
		moduleTimes: ModuleTimes;
	}>;

	function tryGetModuleInfo_todrag(
		target: EventTarget | null,
		skemaSetup: SkemaSetup,
		ancestorDiv: HTMLElement,
	): {
		// element: HTMLElement,
		key: ModuleKeyParts,
	} | null {
		LectioJSUtils.AssertNotNullOrUndefined(target, 'target');
		if (!(target instanceof HTMLElement))
			return null;

		if (skemaSetup.flipped) {
			const moduleElement = target.closest('.skemaweekSkemabrikContainer');
			if (!moduleElement)
				return null;

			LectioJSUtils.AssertType(moduleElement, HTMLElement);
			const key = moduleElement.getAttribute('data-key');
			if (!key)
				throw new Error('modul uden key?');
			const [x, y] = key.split(' ');

			return {
				key: {
					date: x.substring(1),
					moduleNo: y.substring(1),
				},
			};
		}
		else {
			const datestr = target.closest('[data-date]')?.getAttribute('data-date');
			if (!datestr)
				return null;

			const timeintervalstr = target.closest('[data-sameday-ss]')?.getAttribute('data-sameday-ss');
			const modstrtmp = timeintervalstr
				? skemaSetup.moduleTimes[timeintervalstr]
				: null;

			return {
				key: {
					date: datestr,
					moduleNo: modstrtmp?.substring(1) ?? null,
				},
			};
		}
	}

	function tryGetModuleElement_hover(
		target: EventTarget | null,
		evt: MouseEvent,
		skemaSetup: SkemaSetup,
		ancestorDiv: HTMLElement,
	): {
		element: HTMLElement,
		key: ModuleKeyParts,
	} | null {
		LectioJSUtils.AssertNotNullOrUndefined(target, 'target');
		if (!(target instanceof HTMLElement))
			return null;

		if (skemaSetup.flipped) {
			const moduleElement = target.closest('.skemaweekSkemabrikContainer');
			if (!moduleElement)
				return null;

			LectioJSUtils.AssertType(moduleElement, HTMLElement);
			const key = moduleElement.getAttribute('data-key');
			if (!key)
				throw new Error('modul uden key?');
			const [x, y] = key.split(' ');

			return {
				element: moduleElement,
				key: {
					date: x.substring(1),
					moduleNo: y.substring(1),
				},
			};
		}
		else {
			const datestr = target.closest('[data-date]')?.getAttribute('data-date');
			if (!datestr)
				return null;

			const moduleElementsAll = ancestorDiv.querySelectorAll(
				`td .s2module-bg`);
			const coordMatches = moduleElementsAll
				.filter(me => {
					const br = me.getBoundingClientRect();
					return evt.clientX >= br.x && evt.clientX < br.x + br.width
						&& evt.clientY >= br.y && evt.clientY < br.y + br.height;
				});
			LectioJSUtils.AssertArgument(coordMatches.length < 2, 'coordmatches.length < 2');
			if (coordMatches.length === 0)
				return null;

			const element = coordMatches[0];
			LectioJSUtils.AssertType(element, HTMLElement);

			const modstr = element.getAttribute('data-module')?.substring(1);
			LectioJSUtils.AssertNotNullOrUndefined(modstr, 'modstr');

			return {
				element: element,
				key: {
					date: datestr,
					moduleNo: modstr,
				},
			};
		}
	}

	function InitDragDrop(
		ancestorDiv: HTMLElement,
		setup: SkemaSetup,
	): void {
		let ongoingDragData: SkemaDragData | undefined;
		let ongoingDragImageElement: HTMLElement | undefined;

		ancestorDiv.addEventListener('dragstart', evt => {
			LectioJSUtils.AssertType(evt.target, HTMLElement);

			const ele = evt.target;
			const brikids = [
				...new Set(
					ancestorDiv
						.querySelectorAll('.s2skemabrik.s2selected')
						.map(be => {
							const id = be.getAttribute('data-brikid');
							LectioJSUtils.AssertNotNullOrEmpty(id, 'id');
							return id;
						}))];
			LectioJSUtils.AssertArgument(brikids.length > 0);

			const module = tryGetModuleInfo_todrag(ele, setup, ancestorDiv);
			// if (!module)
			// 	tryGetModuleElement(ele, setup, ancestorDiv);
			LectioJSUtils.AssertNotNullOrUndefined(module, 'module');

			const gran = ele.getAttribute('data-drop-granularity');
			LectioJSUtils.AssertNotNullOrEmpty(gran, 'gran');
			if (!(gran == 'day' || gran == 'module'))
				throw new Error('Bad gran=' + gran);

			const data: SkemaDragData = {
				ids: brikids,
				module: module.key,
				dropGranularity: brikids.length === 1 ? gran : 'day',
			};
			// console.debug('drag start', data);

			const dt = evt.dataTransfer;
			LectioJSUtils.AssertNotNullOrUndefined(dt, 'dt');

			dt.setData('text/lec-skemadata', JSON.stringify(data));
			dt.effectAllowed = 'copyMove';
			LectioJSUtils.AssertType(ele, HTMLElement);

			{
				const info = data.ids.length > 1
					? '+' + (data.ids.length - 1)
					: undefined;

				const dragImageElement = createCustomDragImageElement(ele, info);
				ongoingDragImageElement = dragImageElement;

				ele.parentElement!.appendChild(dragImageElement);
				dt.setDragImage(dragImageElement, 0, 0);
			}
			ongoingDragData = data;

			// cluetip gaar i vejen...
			document.getElementById('cluetip')!.style.display = 'none';
		});

		ancestorDiv.addEventListener('dragend', () => {
			ongoingDragData = undefined;
			ongoingDragImageElement?.remove();
			ongoingDragImageElement = undefined;
			ancestorDiv.querySelectorAll('.drop-over').jQueryPartial().removeClass('drop-over');
		});

		function createCustomDragImageElement(
			brik: HTMLElement,
			info: string | undefined
		): HTMLElement {
			const elem = document.createElement('div');
			elem.style.position = 'absolute';
			elem.style.top = '-1000px';

			const brikclone = brik.cloneNode(true);
			LectioJSUtils.AssertType(brikclone, HTMLElement);
			elem.appendChild(brikclone);

			if (info) {
				const infoele = document.createElement('div');
				infoele.className = 'ls-drag-info';
				infoele.textContent = info;
				elem.appendChild(infoele);
			}
			return elem;
		}

		function dataTransferHasSkemaData(dt: DataTransfer): boolean {
			return dt.types.indexOf('text/lec-skemadata') !== -1;
		}

		function computeDropEffect(evt: DragEvent): 'copy' | 'move' | 'none' {
			switch (LectioJSUtils.GetEventModifiers(evt)) {
			case '':
				return 'move';
			case LectioJSUtils.GetCtrlKeyOSSpecific():
				return 'copy';
			default:
				return 'none';
			}
		}

		function matches(
			kp1: ModuleKeyParts, kp2: ModuleKeyParts,
			dropGranularity: SkemaDragData['dropGranularity'],
		): boolean {
			switch (dropGranularity) {
			case 'module':
				return kp1.date === kp2.date && kp1.moduleNo === kp2.moduleNo;
			case 'day':
				return kp1.date === kp2.date;
			default:
				LectioJSUtils.AssertNever(dropGranularity, 'dd');
				throw new Error('Uventet: ' + dropGranularity);
			}
		}

		ancestorDiv.addEventListener('dragenter', evt => {
			LectioJSUtils.AssertNotNullOrUndefined(evt.dataTransfer, 'dt');
			if (!dataTransferHasSkemaData(evt.dataTransfer))
				return;

			const dragdata = ongoingDragData;
			if (!dragdata)
				throw new Error('dragenter uden data?');

			const over_module = tryGetModuleElement_hover(evt.target, evt, setup, ancestorDiv);
			LectioJSUtils.AssertType(evt.target, HTMLElement);

			// Fjern evt. eksisterende markering.
			const markedModuleElements = ancestorDiv.querySelectorAll('.drop-over');
			if (markedModuleElements.length) {
				const kp2 = tryGetModuleElement_hover(markedModuleElements[0], evt, setup, ancestorDiv);

				if (!over_module || kp2 && !matches(over_module.key, kp2.key, dragdata.dropGranularity))
					markedModuleElements.jQueryPartial().removeClass('drop-over');
			}

			if (!over_module?.key.moduleNo)
				return;

			const isDragToSame = matches(over_module.key, dragdata.module, dragdata.dropGranularity);
			if (isDragToSame)
				return;

			evt.preventDefault();
			evt.dataTransfer.dropEffect = computeDropEffect(evt);

			// Lav ny markering, hvis den boer opdateres.
			const markedModuleElementsKey = markedModuleElements.length
				? tryGetModuleElement_hover(markedModuleElements[0], evt, setup, ancestorDiv)
				: null;
			if (!markedModuleElementsKey || !matches(over_module.key, markedModuleElementsKey.key, dragdata.dropGranularity)) {
				switch (dragdata.dropGranularity) {
				case 'module':
					over_module.element?.classList.add('drop-over');
					break;
				case 'day': {
					const moduleElements = ancestorDiv.querySelectorAll(
						setup.flipped
							? `.skemaweekSkemabrikContainer[data-key*=D${over_module.key.date}]`
							: `td[data-date='${over_module.key.date}'] .s2module-bg`);
					LectioJSUtils.AssertArgument(!!moduleElements.length, 'moduleelements');

					moduleElements.jQueryPartial().addClass('drop-over');
					break;
				}
				default:
					LectioJSUtils.AssertNever(dragdata.dropGranularity, 'dg');
				}
			}
		});

		ancestorDiv.addEventListener('dragover', evt => {
			LectioJSUtils.AssertNotNullOrUndefined(evt.dataTransfer, 'dt');
			if (!dataTransferHasSkemaData(evt.dataTransfer))
				return;

			const over_module = tryGetModuleElement_hover(evt.target, evt, setup, ancestorDiv);
			if (!over_module?.key.moduleNo)
				return;

			const data = ongoingDragData;
			if (!data)
				throw new Error('dragover uden data?');

			const isDragToSame = matches(over_module.key, data.module, data.dropGranularity);
			if (isDragToSame)
				return;

			evt.preventDefault();
			evt.dataTransfer.dropEffect = computeDropEffect(evt);
		});

		ancestorDiv.addEventListener('drop', evt => {
			LectioJSUtils.AssertNotNullOrUndefined(evt.dataTransfer, 'dt');

			const str = evt.dataTransfer.getData('text/lec-skemadata');
			if (!str)
				throw new Error('drop uden data?');
			const data: SkemaDragData = JSON.parse(str);
			LectioJSUtils.AssertArgument(data.ids.length > 0, 'empty');

			const module = tryGetModuleElement_hover(evt.target, evt, setup, ancestorDiv);
			if (!module)
				throw new Error('drop uden modul?');

			// module.element.classList.remove('drop-over');
			evt.preventDefault();

			SkemaUge.DoPostback(skemaIdForPostback, 'brik_drop', JSON.stringify({
				brikId: data.ids,
				date: module.key.date,
				moduleNo: module.key.moduleNo,
				operation: computeDropEffect(evt),
			}));
		});
	}
}