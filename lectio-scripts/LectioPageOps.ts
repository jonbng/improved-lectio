
import { LectioJSUtils, LectioDeferred } from "./LectioJSUtils";
import { JSErrorHandling } from "./JSErrorHandling";
import { LectioContextMenu, LectioContextMenuItemData } from "./LectioContextMenu";


import { PageHistoryBehavior, ScrollPosition } from "./Globals";
import { ajax } from "jquery";

export namespace LectioPageOps {
	let errorDialog: JQuery;

	function WriteErrorDialog(msg: string) {
		let d = errorDialog;
		if (!d) {
			d = $('<div>').
				css({ 'white-space': 'pre-line', 'text-align': 'left' }).
				text(msg).
				dialog({ title: "Javascriptfejl" });
			errorDialog = d;
		} else {
			d.text(d.text() + "\r\n" + msg);
		}
	}

	function GetScriptFileDiagnosticsItems(): string[] {
		const detailsItems: string[] = [];
		detailsItems.push('document.readyState: ' + document.readyState);
		const expressions = [
			'document.cookie',
			'$.ui',
			'$.cluetip.defaults',
			'WebForm_AutoFocus'
		];
		$.each(expressions, (_, expr) => {
			const msg = TryEvaluate(expr);
			detailsItems.push('Evaluering af ' + expr + ': ' + msg);
		});
		return detailsItems;
	}

	export function rightClickShareIcon(clickEvent: Event, id: string, schoolid: number): void {
		LectioJSUtils.AssertNotNullOrEmpty(id, "id");

		clickEvent.preventDefault();

		function copyToAsync(dest: string) {
			ajax({
				url: LectioJSUtils.GetBaseSchoolURL() + '/lcutil/editorapi.api/CopyToActivity?src='
					+ id + '&srcSchoolId=' + schoolid + '&dstActivityContentId=' + dest,
				method: 'post',
				success: (data: string, textStatus: string, jqXHR: JQueryXHR) => {
					LectioJSUtils.ShowInformation("Indhold kopieret");
				}, error: (jqXHR: JQueryXHR, textStatic: string, errorThrown) => {
					LectioJSUtils.ShowInformation("Kopiering fejlede:" + jqXHR.responseText);
				}
			});
		}

		const url = LectioJSUtils.GetBaseSchoolURL() + '/lcutil/editorapi.api/GetSkemaData';
		const res = ajax({
			url: url,
			method: 'get',
			success: (data: { titel: string, iconPath: string, actId: string }[], textStatus: string, jqXHR: JQueryXHR) => {
				const items: LectioContextMenuItemData[] = data
					.map(item => ({
						caption: item.titel,
						iconPath: item.iconPath,
						action: () => copyToAsync(item.actId),
					}))
				LectioContextMenu.ShowContextMenuEx(clickEvent, items, undefined);
			}, error: (jqXHR: JQueryXHR, textStatic: string, errorThrown) => {
				LectioJSUtils.ShowInformation("Kunne ikke hente næste lektioner");
			}
		});
	}

	export function DetectChromeExtension(extensionid: string): Promise<boolean> {

		const r = new Promise((resolve, reject) => {
			const s = document.createElement('script');
			s.onerror = () => resolve('found');
			s.onload = () => reject('notfound');
			document.body.appendChild(s);
			s.src = 'chrome-extension://' + extensionid + '/manifest.json';
			s.remove();
		});

		return r.then((t) => true).catch((t) => false);
	}


	export function DetectChromeExtensions(): string[] {
		const extensionIdsObj: { [n: string]: true } = {};
		const elements = $('img[src^="chrome-extension://"]');
		if (elements.length > 0) {
			elements.each(function () {
				const url = $(this).attr('src');
				const matches = url!.match(/^chrome-extension:\/\/(\w+)\//);
				if (matches) {
					const extensionId = matches[1];
					extensionIdsObj[extensionId] = true;
				}
			});
			const extensionIds = Object.keys(extensionIdsObj);
			const knownExtensions: { [n: string]: string } = {
				"liajalnjelpdmdbfbmpiconpenfbpgln": "Lectio Enchancer"
			};
			return extensionIds.map(id => (knownExtensions[id] || "Ukendt udvidelse") + " (ID: " + id + ")");
		}
		return [];
	}

	function TryEvaluate(expr: string) {
		const evaluatedParts: string[] = [];
		const parts = expr.split('.');
		let currentValue = window;
		let hasFailed = false;
		let rv = '';
		$.each(parts, (_, part) => {
			if (hasFailed)
				return;
			evaluatedParts.push(part);
			const newValue = (currentValue as any)[part];
			if (!newValue) {
				hasFailed = true;
				rv = 'Stødte på værdien "' + newValue + '" ved evaluering af sidste del af ' + evaluatedParts.join('.') + '.';
			} else {
				currentValue = newValue;
			}
		});
		if (!hasFailed) {
			let sneakPeak: string;
			try {
				sneakPeak = currentValue + "";
				if (sneakPeak.length > 50)
					sneakPeak = sneakPeak.substr(0, 50);
			} catch (e) {
				sneakPeak = '(Evalueringsfejl: ' + e;
			}
			rv = 'Kunne godt evaluere. Type: ' + typeof (currentValue) + '. Sneak peak: ' + (sneakPeak);
		}
		return rv;
	}

	let errorDeferred: LectioDeferred<undefined> = LectioJSUtils.CreateDeferred();

	export function GetErrorPromise(): Promise<undefined> {
		return errorDeferred.promise();
	}

	export function InitScriptErrorHandling(logToServer: boolean, showToUser: boolean) {

		// IE9: lineNo, columnNumber, ex er ikke tilstede.
		// FF30: ex er ikke tilstede.
		// Chrome vs IE: source er tom streng i chrome ved fejl i setTimeout, IE
		// sætter den til sidens url.

		window.onerror = (
			msg: string | Event,
			sourceRaw: string | undefined,
			lineNumber: number | undefined,
			columnNumber: number | undefined,
			ex?: Error
		) => {
			errorDeferred.reject(msg);
			errorDeferred = LectioJSUtils.CreateDeferred();

			LectioJSUtils.LogDebug('errxx');

			if (typeof msg !== 'string') {
				console.warn(`msg er ikke string. Burde kun forekomme i 'error="..."'. Afbryder.`);
				return;
			}

			// Disse type fejl-events kommer fra ca. chrome 102, naar man skriver i konsollen.
			// Hvilket er irriterende at se pa.
			if (msg.startsWith('Uncaught EvalError: Possible side-effect in debug-evaluate'))
				return;
			if (msg.startsWith('Uncaught SyntaxError: ') &&
				sourceRaw && sourceRaw == location.href && lineNumber === 1)
				return;

			// Chrome (36) præfikser msg med fx "Uncaught ReferenceError: ", hvilket IE ikke gør.
			// Vil gerne have dem til at se mere ens ud i fejllisten, skønt den
			// eksakte fejlbesked ikke nødvendigvis bliver den samme.
			const normalizedMessage = msg.replace(/^[\w ]+Error: (.+)$/, "$1");

			if (logToServer) {
				let stack: string | undefined;

				// safari mac mistænkes for at give source === "undefined".
				const source = sourceRaw && sourceRaw !== "undefined" ? sourceRaw : null;

				if (ex)
					stack = ex.stack;
				else if (source)
					stack = "  at " + source + ":" + lineNumber + ":" + columnNumber;
				else
					stack = "";

				// Dem uden fuld stack er svære at bruge, og vi får formodentlig
				// nok i dem der leverer stack med.
				if (!stack)
					return;

				const notLoadedScriptTags = [];
				if ('performance' in window && 'getEntriesByType' in window.performance) {
					try {
						const sl = document.querySelectorAll('script[src]') as NodeListOf<HTMLScriptElement>;
						const scriptTagSrcList = Array.from(sl).map(e => e.src);
						const resourceList = window.performance.getEntriesByType("resource") as
							(PerformanceEntry & { initiatorType: string })[];
						const scriptLoadUrls = resourceList
							.filter(e => e.initiatorType == 'script')
							.map(e => e.name);
						const missingLoadUrls = scriptTagSrcList
							.filter(scriptUrl => scriptLoadUrls.indexOf(scriptUrl) === -1);
						notLoadedScriptTags.push(...missingLoadUrls);
					}
					catch (e) {
						notLoadedScriptTags.push('[fejl under detektering: ' + e + ']');
					}
				}
				else {
					notLoadedScriptTags.push('[Kan ikke afgoere: window.performance.getEntriesByType() findes ikke.]');
				}

				let detailsItems: string[] = [];
				let details = "";

				if (notLoadedScriptTags.length !== 0)
					detailsItems.push(...notLoadedScriptTags.map(url => `Script-tag-src lader ikke til at vaere loaded: ${url}`));
				else
					detailsItems.push("window.performance.getEntriesByType indikerer ikke at der er scripts ikke kunne loades.");

				try {
					let includeScriptFileDiagnostics = false;
					$.each(["of undefined", "ikke defineret", "not defined", "is not a function", "is not an object", "understøtter ikke egenskaben eller metoden"], (_, partialMsg) => {
						if (normalizedMessage.indexOf(partialMsg) !== -1)
							includeScriptFileDiagnostics = true;
					});
					if (includeScriptFileDiagnostics) {
						detailsItems = detailsItems.concat(GetScriptFileDiagnosticsItems());
					}
					detailsItems = detailsItems.concat(DetectChromeExtensions());
					details = detailsItems.join('\r\n');
				} catch (e) {
					details = "Fejl under scriptfilsdiagnosticering: " + e;
				}
				const userAgent = navigator.userAgent;
				if (!ex && !source) {
					// Script error.
					// Stack trace:
					//
					// User agent: Mozilla / 5.0 (X11; Linux i686) AppleWebKit / 535.19(KHTML, like Gecko) Ubuntu / 10.10 Chromium / 18.0.1025.151 Chrome / 18.0.1025.151 Safari / 535.19

					// ... samt ...

					//'undefined' is not an object(evaluating 'kango.ui')
					// Stack trace:
					//   at undefined:1:undefined
					// User agent: Mozilla / 5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit / 537.77.4(KHTML, like Gecko) Version / 6.1.5 Safari / 537.77.4
					return;
				} else if (userAgent.match(/Firefox/) && stack.match(/\w@http/)) {
					// Error: Error calling method on NPObject!
					// stack trace:
					// symcBFGetSafeSearchValuesHandler@http://www.lectio.dk/lectio/9/default.aspx?lecafdeling=4733693062:0:1437
					// User agent: Mozilla / 5.0 (Macintosh; Intel Mac OS X 10.9; rv:31.0) Gecko / 20100101 Firefox / 31.0
					return;
				}
				else if (!ex && lineNumber === 0 && columnNumber === 0) {
					// Script error
					// Stack trace:
					//   at https://cdncache-a.akamaihd.net/loaders/1546/l.js?aoi=1311798366&pid=1546&zoneid=287609&ext=BestSaveForYou&systemid=1100298913933179681:0:0
					// User agent: Mozilla / 5.0 (Windows NT 6.1; WOW64; Trident / 7.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; InfoPath.2; InfoPath.3; .NET4.0E; BRI / 2; rv:11.0) like Gecko
					return;
				}
				else if (userAgent.match(/Safari/) && normalizedMessage.match("Can't find variable:") && ((lineNumber === 1 && columnNumber === undefined))) {
					// Can't find variable: dataKeys
					// User agent: Mozilla / 5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit / 537.77.4(KHTML, like Gecko) Version / 7.0.5 Safari / 537.77.4

					// Can't find variable: _TPIHelper
					// User agent: Mozilla / 5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit / 537.77.4(KHTML, like Gecko) Version / 6.1.5 Safari / 537.77.4
					// STACK TRACE:
					//   at https://www.lectio.dk/lectio/202/forside.aspx:1:undefined

					// Can't find variable: admwl
					// User agent: Mozilla / 5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit / 537.77.4(KHTML, like Gecko) Version / 7.0.5 Safari / 537.77.4
					return;
				}
				else if (userAgent.match(/Safari/) && stack.match("getABPNamespace@")) {
					// STM 44265.
					//User agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15
					//					STACK TRACE:
					// getABPNamespace @lectio/508/aktivitet / aktivitetforside2.aspx: 32: 61
					//					@https://www.lectio.dk/lectio/508/aktivitet/aktivitetforside2.aspx?absid=60906692780&prevurl=SkemaNy.aspx&elevid=48247981659:77:3
					//					global code @lectio/508/aktivitet / aktivitetforside2.aspx: 143: 7
					// appendChild @[native code]
					//					@
					//					eval code @
					//					eval @[native code]
					// handleMessage @webkit-masked - url://hidden/:38:17
					return;
				}
				JSErrorHandling.reportJSErrorImpl({
					message: normalizedMessage,
					source: source,
					lineNumber: lineNumber,
					columnNumber: columnNumber,
					stack: stack,
					userAgent: userAgent,
					customData: details,
					error: ex,
				});
			}
			if (showToUser) {
				WriteErrorDialog(msg);
			}
		};
	}

	export function BuildNavigationTimingObject(httpMethod: string) {
		const timing = window.performance.timing;
		const obj = {
			timestamp: new Date(),
			navigationTiming: timing,
			method: httpMethod,
			userAgent: navigator.userAgent,
			screen: {
				devicePixelRatio: window.devicePixelRatio,
				availWidth: screen.availWidth,
				availHeight: screen.availHeight,
				width: screen.width,
				height: screen.height
			}
		};
		return obj;
	}

	const autoFocusReadyDeferred_Initial: LectioDeferred<void> = LectioJSUtils.CreateDeferred();
	let autoFocusReadyDeferred_AsyncPostback: LectioDeferred<void> = LectioJSUtils.CreateDeferred();
	let autoFocusReadyDeferred_AsyncPostbackOld: LectioDeferred<void> | undefined;

	export function ReplaceAutoFocusReadyDeferred_AsyncPostback(): void {
		autoFocusReadyDeferred_AsyncPostbackOld = autoFocusReadyDeferred_AsyncPostback;
		autoFocusReadyDeferred_AsyncPostback = LectioJSUtils.CreateDeferred();
	}

	export function GetAutoFocusReadyPromise_AsyncPostback(): Promise<void> {
		return autoFocusReadyDeferred_AsyncPostback.promise();
	}

	export function GetAutoFocusReadyPromise_Initial(): Promise<void> {
		return autoFocusReadyDeferred_Initial.promise();
	}

	export function PrepareAutoFocus() {
		const defaultImpl = window.WebForm_AutoFocus;

		function tryEnsureScrollIntoView(element: JQuery) {
			const offset = element.offset()!.top;

			const visibleAreaStart = $(window).scrollTop() as number;
			const visibleAreaEnd = visibleAreaStart + window.innerHeight;

			if (offset < visibleAreaStart || offset > visibleAreaEnd) {
				// Not in view so scroll to it.
				// Will problably want to modify this...
				$('html,body').animate({ scrollTop: offset - window.innerHeight / 3 }, 1000);
				return false;
			}
			return true;
		}

		// Dette er den "rigtige"/oprindelinge funktion, modificeret for bedre
		// at haandtere scroll, og lidt moderniseret.
		function WebForm_AutoFocus_Modified(focusId: string) {
			const targetControl = document.getElementById(focusId);
			let focused = targetControl;
			if (targetControl && (!window.WebForm_CanFocus(targetControl))) {
				focused = window.WebForm_FindFirstFocusableChild(targetControl);
			}
			if (focused) {
				focused.focus();

				tryEnsureScrollIntoView($(focused));
			}
		}

		async function customAutoFocus(targetIdRaw: string): Promise<void> {
			const target = (() => {
				if (targetIdRaw.startsWith('bydummyid_')) {
					const idd = targetIdRaw.slice('bydummyid_'.length);
					return document.querySelector(`*[data-dummyid="${idd}"]`);
				}
				return document.getElementById(targetIdRaw);
			})()
				?? LectioJSUtils.Throw(`Focus target id "${targetIdRaw}" was not found.`);

			const { targettype, scroll } = (() => {
				if ($(target).is(':input'))
					return { targettype: 'input', scroll: false } as const;

				// todo 'contenttable' skal ikke havne her som editor.
				if (target.matches('span, div') &&
					target.querySelector('textarea[lectio-role=editor-textarea]')) {
					// hack kan vi goere noget bedre end at hardcode id-et?
					if (targetIdRaw === 'contenttable')
						return { targettype: 'editor', scroll: false } as const;
					else
						return { targettype: 'editor', scroll: true } as const;
				}
				return { targettype: 'container', scroll: false } as const;
			})();

			LectioJSUtils.LogDebug('WebForm_AutoFocus: targettype=' + targettype + ', scroll=' + scroll);

			switch (targettype) {
			case 'input':
				LectioJSUtils.AssertArgument(scroll === false);
				WebForm_AutoFocus_Modified(target.getAttribute('id')!);
				break;
			case 'editor': {
				// Der skal sættes fokus i en editor, men den er næppe
				// initialiseret endnu.  targetId antages at være id for en
				// ancestor af textarea-elementet, der bruges af
				// editor-instansen.

				const editorId = target
					.querySelector('textarea[lectio-role=editor-textarea]')
					?.getAttribute('id')
					?? LectioJSUtils.Throw('autofokus: Ligner en editor, men har ikke ID?');

				const editor = CKEDITOR.instances[editorId]
					?? LectioJSUtils.Throw(`AutoFocus: Editor-instans "${editorId}" ikke fundet.`);

				await new Promise<void>(resolve => {
					if (editor.instanceReady)
						resolve();
					else
						editor.once('instanceReady', () => resolve());
				});
				LectioJSUtils.LogDebug('ckeditor: Ready')
				// Et par ting:
				// 1. instanceReady er ikke (altid?) nok til at dom-en er
				//    opbygget og klar.
				// 2. Hvis vi kalder .focus() paa editoren her, vises
				//    template-html ikke, hvilket er ufedt.  Saa vi goer ligesom
				//    lectio generelt, at fokus foerst saettes, naar der trykkes
				//    tab.
				// 3. Naar editoren viser templatehtml der viser en ca. tom
				//    slide, give .focus() ikke det fokus med blaa kant paa
				//    slide som man faar, naar man trykker paa sliden. Ufedt,
				//    burde proeve at ordne det. Naar den ikke viser
				//    template-html, giver .focus() fokus med kant som
				//    forventet. At tabbe to gange giver ogsaa det oenskede
				//    fokus.

				// Burde maaske synkroniseres mere med maintainscrollposition.
				// Eller bare kun scrolle hvis der er behov for det: hvis der
				// saettes fokus til en nytilfoejet editor der iht.
				// maintainscrollposition er fuldt synlig, burde vi fx. nok
				// ikke scrolle.
				await LectioJSUtils.Delay(800); // hack fjern dette.
				LectioJSUtils.LogDebug('WebForm_AutoFocus: editor, scroller: ' + scroll);
				// 202408 RH: har udkommenteret dette scroll, fordi det knaekker
				// maintainscrollposition og
				// LectioContentEditorTest.LinkTargetDoesNotHideBehindEditorToolbarOnTocHeaderClick.
				if (scroll)
					window.scrollTo(0, $(target).offset()!.top - 50);

				document.addEventListener('keydown', e => {
					const hasfocused = !!document.activeElement?.closest('.cke');
					if (hasfocused)
						return;
					if (e.key !== 'Tab')
						return;

					editor.focus();
					e.preventDefault();

				}, { once: true });

				break;
			}
			case 'container': {
				/*
				 * Hvis fokus skal sættes til en container, vil vi gerne have
				 * fokus lige før første inputfelt.
				 * IE kan godt sætte fokus uden for input - felter, således
				 * at man kan tabbe direkte til det næste inputfelt, men det kan
				 * fx chrome (37) ikke.
				 * Browsere vil iøvrigt meget gerne scrolle, når man sætter
				 * fokus, og det er ufedt, når målet allerede er
				 * synligt. Derfor håndterer vi selv det første tab.
				 *
				 * Måske man skulle springe knapper over her, og hoppe til
				 * input-element?
				 *
				 * Check om kontrollen faktisk er synlig på skærmen, ellers
				 * scroll ned til det.
				 */
				LectioJSUtils.AssertArgument(scroll === false);
				setTimeout(() => {
					const pos = $(target).offset()!.top;
					const scrollTop = $(window).scrollTop() as number;
					const windowHeight = $(window).height() as number;
					const scrollBottom = scrollTop + windowHeight;
					if (pos > scrollBottom) {
						$(window).scrollTop(pos + 100);
					}
				}, 50); // todo2 fjern forsinkelse?

				let realTarget: Element | null;
				const tabcontent = target.querySelector('.lectioTabContent');
				if (tabcontent) {
					const policy = tabcontent.getAttribute('data-autofocuspolicy');
					switch (policy ?? '') {
					case '':
						realTarget = getFocusblam(tabcontent);
						break;
					case 'first-gridview': {
						const gv = tabcontent.querySelector('.lf-grid');
						if (!gv)
							throw new Error('Autofocus policy ' + policy + ': Fandt ikke gridview.');
						realTarget = getFocusblam(gv);
						break;
					}
					default:
						throw new Error('ukendt focus policy "' + policy + '".');
					}
				} else
					realTarget = getFocusblam(target);

				function getFocusblam(inputContainer: Element): Element | null {
					return inputContainer.querySelector('input:not([type=hidden]):not(.hidetabinputbutton), select')
						?? target.querySelector('.lectioTabContent a');
				}

				document.addEventListener('keydown', e => {
					if (document.activeElement && $(document.activeElement).is(":input"))
						return;
					if (e.key !== 'Tab')
						return;

					if (!realTarget)
						return;

					if (realTarget instanceof HTMLInputElement) {
						// 202410 RH: asp.nets `defaultImpl` har det med at
						// scrolle naar det ikke er oenskvaerdigt/noedvendigt.

						realTarget.focus();
					}
					else {
						$(realTarget).uniqueId();
						defaultImpl(realTarget.getAttribute('id') ?? LectioJSUtils.Throw('Har ikke id?'));
					}
					e.preventDefault();
				}, { once: true });

				break;
			}
			default:
				LectioJSUtils.AssertNever(targettype, targettype);
			}

		}

		const delayedCustomAutoFocus = async (targetId: string) => {
			// Skal forsinke autofokus nok til at kontroller (datepicker) er
			// blevet initialiseret, og det bliver de først i ready.
			await LectioJSUtils.GetJQueryReadyPromise();
			await LectioJSUtils.Delay(1);
			LectioJSUtils.LogDebug('WebForm_AutoFocus: Before');
			customAutoFocus(targetId);
			LectioJSUtils.LogDebug('WebForm_AutoFocus: After');
			autoFocusReadyDeferred_Initial.resolve();
			autoFocusReadyDeferred_AsyncPostbackOld?.resolve();
		};
		window.WebForm_AutoFocus = delayedCustomAutoFocus;
		document.addEventListener('focusin', EnsureScrollVisible);

		// Når Sys.WebForms.PageRequestManager / updatepanel er på siden,
		// bliver standardimplementationen af WebForm_AutoFocus genindsat ved
		// async postback. Derfor går vi her ind og tager pladsen tilbage.
		// Desuden opdaterer vi sidetitlen her.
		if (window.Sys?.WebForms?.PageRequestManager) {
			const prm = window.Sys.WebForms.PageRequestManager.getInstance();
			// Foerste gang er det den normale indlaesning af siden, hvor der
			// ikke er behov for at opdatere titel.
			let ctr = 0;
			if (prm) {
				prm.add_pageLoaded(() => {
					ctr++;
					//stm 47862: For mobil-visningen skal titlen ikke opdateres.
					if (ctr > 0 && !LectioJSUtils.IsMobile()) {
						const ele = document.querySelector('.maintitle');
						// Mangler sommetider, fx. i documentchooser.aspx.
						if (ele) 
							ele.textContent = document.title.replace(/ - Lectio - .+/, '');
					}
					window.WebForm_AutoFocus = delayedCustomAutoFocus;
				});
			}
		}
	}


	function EnsureScrollVisible(evt: FocusEvent): void {
		// Vores dejlig knappo i bunden af siden har det med at laegge sig
		// ovenover inputelement der har fokus.
		// Det forsoeger vi her at undgaa ved at scrolle lidt mere nedad i
		// den situation.
		const ele = evt.target;
		if (!(ele instanceof HTMLInputElement || ele instanceof HTMLTextAreaElement || ele instanceof HTMLSelectElement))
			return;

		function getNonRootScrollAncestorOrSelf(ele2: HTMLElement): HTMLElement | null {
			// Stop hvis vi har fundet et element der scroller, og det ikke er
			// element der faar focus (som det er tilfaeldet for texarea).
			if (window.getComputedStyle(ele2).overflowY == 'auto' && ele !== ele2)
				return ele2;
			if (ele2.parentElement)
				return getNonRootScrollAncestorOrSelf(ele2.parentElement);
			if (ele2 === document.body.parentElement) // the html element.
				return null;

			throw new Error('hvad er dette?');
		}
		const scrollo = getNonRootScrollAncestorOrSelf(ele);
		if (scrollo)
			return;

		const br = ele.getBoundingClientRect();
		const minBottom = 60;

		const avHeight = window.innerHeight;
		const bottomDist = avHeight - br.bottom;
		if (bottomDist < minBottom) {
			const toScrollY = minBottom - bottomDist + 1;
			window.scrollBy(0, toScrollY);
		}
	}


	const restoreScrollDependencies: { [key: string]: LectioDeferred<void> } = {};
	const scrollPositionRestoredDeferred = LectioJSUtils.CreateDeferred<void>();
	let scrollHasBeenRestored = false;

	export function RegisterRestoreScrollDependency(key: string): void {
		if (!key)
			throw new Error('Der skal gives en tekstnoegle med.');
		if (restoreScrollDependencies[key])
			throw new Error(`noeglen ${key} findes allerede.`);
		if (scrollHasBeenRestored)
			throw new Error('For sent: Afvent af scroll-afhaengigheder er startet.');
		const def = LectioJSUtils.CreateDeferred<void>();
		restoreScrollDependencies[key] = def;
	}

	export function ResolveRestoreScrollDependency(key: string): void {
		if (!key)
			throw new Error('Der skal gives en tekstnoegle med.');
		const def = restoreScrollDependencies[key];
		if (!def)
			throw new Error(`noeglen ${key} er ukendt - ikke registreret med RegisterRestoreScrollDependency().`);
		if (scrollHasBeenRestored)
			throw new Error('For sent: Afvent af scroll-afhaengigheder er startet.');

		def.resolve(undefined);
	}

	export function GetScrollPositionRestoredPromise(): Promise<void> {
		return scrollPositionRestoredDeferred.promise();
	}

	function getscrollhiddeninput(): HTMLInputElement {
		return window.theForm.__SCROLLPOSITION;
	}

	export function SetCustomScrollState(scrollState: {}) {
		getscrollhiddeninput().value = JSON.stringify(scrollState);
	}

	export function PrepareMaintainScrollPosition(): void {
		const savepos = () => {
			const pos = GetScrollPosition();
			getscrollhiddeninput().value = JSON.stringify(pos);
		};
		window.WebForm_SaveScrollPositionOnSubmit = () => {
			savepos();
			if (window.theForm.oldOnSubmit)
				return window.theForm.oldOnSubmit();

			return true;
		};
		window.WebForm_SaveScrollPositionSubmit = () => {
			savepos();
			if (window.theForm.oldSubmit)
				return window.theForm.oldSubmit();
			return true;
		};

		window.WebForm_RestoreScrollPosition = async () => {
			LectioJSUtils.LogDebug('WebForm_RestoreScrollPosition: Called')
			const scrollpos = getscrollhiddeninput().value;
			const scrolldeps = Object
				.values(restoreScrollDependencies)
				.map(v => v.promise());

			await Promise.all(scrolldeps);
			LectioJSUtils.LogDebug('WebForm_RestoreScrollPosition: Ready')
			LectioJSUtils.LogDebug('at scroll, height is ' + document.body.scrollHeight);

			scrollHasBeenRestored = true;
			if (scrollpos !== undefined && scrollpos !== '') {
				LectioJSUtils.LogDebug('WebForm_RestoreScrollPosition: SetScrollPosition')
				const pos: ScrollPosition = JSON.parse(scrollpos);
				SetScrollPosition(pos);
			}

			if ((typeof window.theForm.oldOnLoad !== "undefined") &&
				window.theForm.oldOnLoad != null) {
				window.theForm.oldOnLoad();
			}

			scrollPositionRestoredDeferred.resolve();

			return true;
		};
		window.addEventListener('load', async () => {
			await LectioJSUtils.Yield();
			LectioJSUtils.LogDebug('restorescroll: post')
		});
	}

	function GetScrollPosition(): ScrollPosition {

		const pixelScrollTop = window.pageYOffset || window.document.documentElement.scrollTop;
		const pixelScrollLeft = window.pageXOffset || window.document.documentElement.scrollLeft;

		const midElement = $(window.document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2) as Element);
		const gridTable = midElement.parents('table.list:last');
		if (gridTable.length) {
			const gridrow = midElement.is('table.list tr') ? midElement : midElement.parents('table.list tr');
			const gridrowraw = gridrow[0] as HTMLTableRowElement;
			const rowoffset = gridrow.offset();
			const info = {
				tableId: gridTable.attr('id') as string,
				rowIndex: gridrowraw.rowIndex,
				rowScreenOffsetTop: rowoffset!.top - window.pageYOffset,
				rowScreenOffsetLeft: rowoffset!.left - window.pageXOffset,
				pixelScrollTop: pixelScrollTop,
				pixelScrollLeft: pixelScrollLeft,
			};

			return info;
		} else {
			return {
				tableId: '',
				rowIndex: -1,
				rowScreenOffsetTop: -1,
				rowScreenOffsetLeft: -1,
				pixelScrollTop: pixelScrollTop,
				pixelScrollLeft: pixelScrollLeft,
			};
		}
	}

	function SetScrollPosition(pos: Readonly<ScrollPosition>): void {
		if (!pos.tableId) {
			window.scrollTo(pos.pixelScrollLeft, pos.pixelScrollTop);
			return;
		}
		const table = LectioJSUtils.GetAssumedType<HTMLTableElement>(document.getElementById(pos.tableId));
		if (!table) {
			LectioJSUtils.LogDebug('Scroll: Kan ikke genfinde tabel.');
			return;
		}

		if (pos.rowIndex >= table.rows.length) {
			LectioJSUtils.LogDebug('Scroll: Kan ikke genfinde tabelrække.');
			return;
		}
		const row = table.rows[pos.rowIndex];
		row.scrollIntoView();
		LectioJSUtils.LogDebug('scroll pos:', pos);

		// nu er elementet synligt på siden. Så mangler vi den sidste scroll,
		// der får øverste venstre hjørne på samme plads som det var før.
		const rowoffset = $(row).offset();
		const rowScreenOffsetTopNew = rowoffset!.top - window.pageYOffset;
		const rowScreenOffsetLeftNew = rowoffset!.left - window.pageXOffset;
		const extraTop = rowScreenOffsetTopNew - pos.rowScreenOffsetTop;
		const extraLeft = rowScreenOffsetLeftNew - pos.rowScreenOffsetLeft;
		LectioJSUtils.LogDebug('rowoffset.top', rowoffset!.top, 'window.pageYOffset', window.pageYOffset);
		window.scrollBy(extraLeft, extraTop);
	}

	export function InitializeHistory(behavior: PageHistoryBehavior): void {
		switch (behavior) {
		case PageHistoryBehavior.PrevUrl:
			InitializeHistory_PrevUrl();
			break;
		case PageHistoryBehavior.HandsOff:
			break;
		case PageHistoryBehavior.ReplacePost:
			history.replaceState({}, '', location.href);
			break;
		default:
			LectioJSUtils.AssertNever(behavior, "Ukendt opfoersel: " + behavior);
		}
	}

	function InitializeHistory_PrevUrl(): void {
		// Tilbage-knap vha. browsernavigering.

		let backLink = document.querySelector('.button > a[data-rolevariant="back"]:nth-child(1)');
		if (!backLink)
			backLink = document.querySelector('.button > a[data-rolevariant="cancel"]:nth-child(1)');

		const doHistory = !!backLink;
		if (!doHistory)
			return;

		const goBack = () => {
			if (backLink)
				$(backLink).trigger('lecclick');
			else
				window.history.back();
		};

		// Used to detect initial (useless) popstate.
		// If history.state exists, assume browser isn't going to fire initial
		// popstate.
		// Chrome 19 beta sætter initielt state til null, men fyrer desværre
		// også den ubrugelige popstate.
		// FF 11 sætter den til null, og fyrer den IKKE.
		let expectUselessPopstate = !('state' in window.history);

		window.history.replaceState('initial', '', window.location.href);
		window.history.pushState('dummystate', '', window.location.href);

		$(window).on('popstate', event => {
			if (expectUselessPopstate) {
				expectUselessPopstate = false;
				return;
			}

			const state = (event.originalEvent as PopStateEvent).state;
			if (state === 'initial')
				goBack();
		});
	}

	export function EnableDevelopmentTracing() {
		$.post(LectioJSUtils.GetBaseSchoolURL() + '/utils/trace.api/EnableDevelopmentTracing')
			.then(
				() => LectioJSUtils.ShowInformation('Trace af sessionen aktiveret.'),
				() => LectioJSUtils.ShowInformation('Fejl under aktivering af trace.'));
	}

	export function EnableBusinessLogicTracing() {
		$.post(LectioJSUtils.GetBaseSchoolURL() + '/utils/trace.api/EnableBusinessLogicTracing')
			.then(
				() => LectioJSUtils.ShowInformation('Trace af sessionen aktiveret.'),
				() => LectioJSUtils.ShowInformation('Fejl under aktivering af trace.'));
	}

	export function DisableTracing() {
		$.post(LectioJSUtils.GetBaseSchoolURL() + '/utils/trace.api/DisableTracing')
			.then(
				() => LectioJSUtils.ShowInformation('Trace af sessionen deaktiveret.'),
				() => LectioJSUtils.ShowInformation('Fejl under deaktivering af trace.'));
	}
}
