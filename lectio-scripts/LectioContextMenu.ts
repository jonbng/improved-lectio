import { GuiMisc } from './GuiMisc';
import { CommandRegistry, LectioDeferred, LectioJSUtils, SkemaMenu } from "./lectiolib";

export type LectioContextMenuItemData =
	Readonly<{
		caption: string,
		imagePath?: string,
		iconPath?: string,
		prio?: number,
		placement?: number,
	} & (
			{ action: (() => void) }
			| { url: string })>;

function GetSingle(j: JQuery<Element>): Element {
	const sod = GetSingleOrDefault(j);
	if (!sod)
		throw new Error('har ikke elementer.');
	return sod;
}

function GetSingleOrDefault(j: JQuery<Element>): Element | null {
	if (j.length === 0)
		return null;
	if (j.length > 1)
		throw new Error('har >1 elementer');
	const e = j.get(0);
	if (!(e instanceof Element))
		throw new Error('har ikke Element');
	return e;
}

function ParseSingleElement(html: string) {
	const n = new DOMParser().parseFromString(html, 'text/html');
	const theone = n.body.firstElementChild;
	if (!theone)
		throw new Error('Ikke noget element efter parse.');
	return theone;
}

export namespace LectioContextMenu {
	let activeContextMenu: JQuery<Element> | undefined;
	let currentMenuCallbackSet: MenuCallbackSet | undefined;

	type MenuCallbackSet = {
		[key: string]: (() => void);
	};

	export let OnBeforeShowMenu_MacomOnly: () => LectioContextMenuItemData[];

	export function Initialize(
		enableContextMenus: boolean,
		baseSchoolUrl: string | null,
		prevurl: string | undefined,
		allowTableSearch: boolean,
	): void {
		CommandRegistry.RegisterCommand({
			id: 'TableSearch',
			title: "Tabelsøgning",
			execute: async ctx => {
				let areaIdEffective: string;
				if (ctx.Argument) {
					areaIdEffective = ctx.Argument;
				} else {
					const element = await CommandRegistry.PromptUserForElementSelection({
						prompt: 'Klik på en tabel',
						promptTitle: 'Tabelsøgning',
						selector: 'table[id]',
					});
					if (element === 'notfound')
						return {};
					areaIdEffective = element.id;
				}

				if (areaIdEffective == null)
					return {};
				ctx.ArgumentDerivedByCommand = areaIdEffective;

				const table = LectioJSUtils.GetAssertedType(
					document.getElementById(areaIdEffective), HTMLTableElement);

				GuiMisc.ShowTableFilter(table);
				return {};
			}
		});

		const clicky: (e: MouseEvent) => boolean = e => {
			HideContextMenu();
			const target = e.target;
			if (!target)
				return true;
			if (!(target instanceof Element))
				throw new Error('huh, target er ikke element?');

			// Led opad i dom-en, indtil vi eventuelt finder noget vi har
			// lyst til at reagere paa/vise.
			let curr: Element | null = target;

			const etype = e.type;
			if (!(etype === 'click' || etype === 'contextmenu'))
				throw new Error(`huh, hvad er det for en event? type='${etype}'.`);

			let itercount = 0;

			for (; curr; curr = curr.parentElement) {
				itercount++;
				if (itercount > 50)
					throw new Error('wtf?');

				if (!curr)
					break;

				// Kontekstkort...
				const ccid = curr.getAttribute('data-lectioContextCard');
				if (ccid && ccid.length > 2 && baseSchoolUrl && prevurl && etype === 'contextmenu') {
					e.stopPropagation();
					e.preventDefault();
					ShowContextCardAsync({ type: 'idserialized', ser: ccid }, baseSchoolUrl, prevurl, e, undefined, false);
					return false;
				}

				// ... kontekstkort paa genial vaelger ...
				const ccx = curr instanceof HTMLElement && TryGetLectioDropDownData(curr);
				if (ccx && baseSchoolUrl && prevurl && enableContextMenus && etype === 'contextmenu') {
					if (ccx == 'naesten')
						return true;
					e.stopPropagation();
					e.preventDefault();
					ShowContextCardAsync({ type: 'idserialized', ser: ccx.ccId }, baseSchoolUrl, prevurl, e, undefined, true);
					return false;
				}


				// Menu
				if (curr.matches('.lec-context-menu-instance') && enableContextMenus &&
					(etype === 'contextmenu' || (etype === 'click' && curr.matches('.lec-context-menu-onclick')))) {
					if (curr instanceof HTMLElement && curr.innerText.includes('error-trigger-title'))
						throw new Error('menu-fejl: pga. error-trigger-title.');

					let curr2: Element | null | undefined = curr;
					const accumulatedItems: LectioContextMenuItemData[] = [];
					for (; curr2; curr2 = curr2.parentElement?.closest('.lec-context-menu-instance')) {
						LectioJSUtils.AssertType(curr2, HTMLElement);

						{
							const itemsShorts = curr2.getAttribute('data-menu-items');

							if (itemsShorts) {
								const shorts = itemsShorts.split(/\s+/);
								LectioJSUtils.AssertArgument(shorts.length > 0, 'shorts.length > 0 - hvad skal det betyde?');

								const vx = SkemaMenu.CreateContextMenuItems(shorts, e, { type: 'inline-shorts', inlineShortsElement: curr2 }, prevurl);
								if (vx === 'nej')
									continue;
								accumulatedItems.push(...vx);
							}
						}

						const contextMenuElement = GetContextMenuElement(curr2);
						if (!contextMenuElement)
							continue;

						if (accumulatedItems.length && !contextMenuElement.matches('.lec-context-menu-additive'))
							break;

						const itemsShorts = contextMenuElement.getAttribute('data-menu-items');

						if (itemsShorts) {
							const shorts = itemsShorts.split(/\s+/);
							LectioJSUtils.AssertArgument(shorts.length > 0, 'shorts.length > 0 - hvad skal det betyde?');

							const vx = SkemaMenu.CreateContextMenuItems(shorts, e, { type: 'get-context-menu-element', contextMenuElement: curr2 }, prevurl);
							if (vx === 'nej')
								continue;
							accumulatedItems.push(...vx);
						}
						else {
							contin({ content: contextMenuElement, handlers: undefined, eventForPlacement: e, thingForPlacement: e });
							return false;
						}
					}

					if (!accumulatedItems.length)
						continue;


					const vv = CreateMenuHtmlAndHandlers(accumulatedItems);
					contin({ content: vv.menu, handlers: vv.handlers, eventForPlacement: e, thingForPlacement: e });

					e.stopPropagation();
					e.preventDefault();

					return false;
				}


				if ((curr.matches('[data-role=button]') && etype === 'click')) {
					const btn = curr;
					if (!(btn instanceof HTMLElement))
						throw new Error('curr er ikke htmlelement.');

					const cmd = btn.getAttribute('data-command');

					// Links paa lectiobuttons kan havne her.
					if (!cmd)
						continue;

					e.stopPropagation();
					e.preventDefault();

					if (cmd === 'LbgShow')
						PrepareAndShowMenu_button(btn, allowTableSearch, undefined);
					else if (cmd === 'menuhandler') {
						if (!currentMenuCallbackSet)
							throw new Error('har ikke callback set?');

						const key = curr.getAttribute('data-menu-key');
						LectioJSUtils.AssertNotNullOrEmpty(key, 'key');

						const cb = currentMenuCallbackSet[key];
						LectioJSUtils.AssertNotNullOrUndefined(cb, 'cb');

						cb();
						return false;
					}
					else {
						const arg = btn.getAttribute('data-command-argument') || undefined;
						CommandRegistry.ExecuteCommand(cmd, arg);
					}
					continue;
				}
			}

			// Tekstsoegningsbaseret kontekstkort (logging2).
			if (baseSchoolUrl && etype === 'contextmenu' && target.closest('.ls-log-cell')) {
				const arg = ConsiderTextSearchContextCard(e);
				if (arg) {
					ShowContextCardAsync(
						arg, baseSchoolUrl, prevurl, e, undefined, true);
					e.stopPropagation();
					e.preventDefault();

					return false;
				}
			}
			return true;
		}

		$(() => {
			document.body.addEventListener('click', clicky);
			document.body.addEventListener('contextmenu', clicky);
		});
	}

	function ConsiderTextSearchContextCard(
		e: Pick<Readonly<MouseEvent>, 'clientX' | 'clientY'>
	): Parameters<typeof ShowContextCardAsync>[0] | null {
		let range: Range;
		if (document.caretRangeFromPoint) {
			const tmp = document.caretRangeFromPoint(e.clientX, e.clientY);
			if (!tmp)
				return null;

			range = tmp;
		} else if ((document as any).caretPositionFromPoint) {
			const pos: { offsetNode: Node, offset: number } = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
			range = document.createRange();
			range.setStart(pos.offsetNode, pos.offset);
			range.setEnd(pos.offsetNode, pos.offset);
		}
		else
			return null;

		const textNode = range.startContainer;
		const offset = range.startOffset;

		if (!(textNode instanceof Text))
			return null;

		// "Id: "54823089324", HoldelementId: "1g5 ap (2022/23)", SkhBookingOensket: "False""
		// "    WishStudieretningId ændret fra "" til "6. Samfundsfaglig (saA, maA)""

		const line = textNode.textContent?.trimEnd();
		LectioJSUtils.AssertNotNullOrEmpty(line, 'line');

		// Find omgivende quotes, og dermed deres indhold.
		const startQuoteIdx = line.lastIndexOf('"', offset);
		const endQuoteIdx = line.indexOf('"', offset);
		if (startQuoteIdx === -1 || endQuoteIdx === -1)
			return null;
		// Sikrer at vi ikke har klikket paa et feltnavn eller lignende,
		// der ikke er en vaerdi.
		if (!(
			// Vaerdi i felt i liste, eller felt uden for liste.
			endQuoteIdx === line.length - 1 ||
			// Vaerdi i felt uden for liste, eller sidste vaerdi i liste.
			line[endQuoteIdx + 1] === ',' ||
			// Vaerdi uden for liste: "fra".
			line.substring(endQuoteIdx + 1).startsWith(" til ")))
			return null;

		const valuestr = line.slice(startQuoteIdx + 1, endQuoteIdx);

		// Se om vi kan finde et foranstillet feltnavn.
		const beforePart = line.substring(0, startQuoteIdx);
		let fieldName: string | null = null;
		do {
			const mm1 = beforePart.match(/(\w+): *$/);
			if (mm1) {
				fieldName = mm1[1];
				break;
			}
			const mm2 = beforePart.match(/^\s+(\w+) +/);
			if (mm2) {
				fieldName = mm2[1];
				break;
			}
		}
		while (false);

		if (!fieldName)
			return null;

		// console.log('click:', [fieldName, valuestr])
		return { type: 'search', value: valuestr, field: fieldName };
	}

	function PrepareAndShowMenu_button(
		buttonLink: HTMLElement,
		allowTableSearch: boolean,
		eventForPlacement: Event | undefined,
	): void {
		const buttonForPlacement = $(buttonLink).closest('.button, .buttonlink, .buttonicon');

		const contentOrig =
			GetSingleOrDefault(buttonForPlacement.next('.lec-context-menu'))
			?? ParseSingleElement('<div class="lec-context-menu"><ul></ul></div>');
		const content = contentOrig.cloneNode(true);
		LectioJSUtils.AssertArgument(content instanceof Element);

		const thingForPlacement = GetSingle(buttonForPlacement);

		const ancestorisland = buttonForPlacement.get(0)?.closest('.lf-island');
		if (ancestorisland) {
			LectioJSUtils.AssertType(ancestorisland, HTMLElement);
			(() => {
				if (allowTableSearch) {
					const t0 = GuiMisc.TryFindTable(ancestorisland);
					if (t0) {
						($(content)).find('li[data-tag=dynamic]').remove();

						const tableid = t0.id;
						if (!tableid)
							console.warn('LectioButtonGroup: Tabel har ikke id - tabelsoegning aktiveres ikke.');
						else {
							const html = `<li data-role='button' data-command='TableSearch' data-command-argument='${tableid}' data-tag='dynamic'> <div class='buttonlink'><a><span class='ls-fonticon'>search</span>Tabelsøgning</a></div></li>`;
							content.querySelector('ul')?.insertAdjacentHTML('beforeend', html);
						}
						return;
					}
				}

				const islandmenu = ancestorisland.querySelector('.ls-island-content-menu');
				if (islandmenu) {
					const items = islandmenu.querySelectorAll('[data-role=button]');
					if (items.length) {
						const lis = items.map(btn => {
							const li = document.createElement('li');
							li.appendChild(btn.cloneNode(true));
							if (btn.parentElement?.matches('.macomonly'))
								li.classList.add('macomonly');
							return li;
						});
						content.querySelector('ul')!.append(...lis);
					}
				}
			})();
		}

		if (!content.childElementCount)
			return;

		contin({ content, handlers: undefined, eventForPlacement, thingForPlacement });
	}

	function contin(
		args: {
			content: Element,
			handlers: MenuCallbackSet | undefined,
			eventForPlacement: Event | undefined,
			thingForPlacement: Element | Event
		}): void {

		const { content, handlers, eventForPlacement, thingForPlacement } = args;

		HideContextMenu();
		currentMenuCallbackSet = handlers;
		const contextMenucontent = $(content)
			.clone(true, true)
			.wrap('<div class="lec-context-menu"></div>');
		activeContextMenu = contextMenucontent;
		$(document.body).append(contextMenucontent);

		contextMenucontent.css({
			'z-index': 10050,
			'display': 'inline-block',
		});

		if (LectioJSUtils.IsMobilePortrait())
			contextMenucontent.css({
				maxWidth: 90 + "dvw",
			});

		if (LectioJSUtils.IsMobile())
			contextMenucontent.addClass(" mobile-header-buttons");

		if (eventForPlacement) {
			contextMenucontent.position({
				my: 'left top',
				of: thingForPlacement,
			});
		}
		else
			contextMenucontent.position({
				my: 'left top',
				at: 'left bottom',
				of: thingForPlacement
			});

		const onclick = (): void => {
			HideContextMenu();
			document.removeEventListener('click', onclick, true);
		};
		document.addEventListener('click', onclick, true);

		lectioContextMenuShownDeferred.resolve(LectioJSUtils.GetAssertedType(contextMenucontent.get(0), HTMLElement));
		lectioContextMenuShownDeferred = LectioJSUtils.CreateDeferred();
	}

	let lectioContextMenuShownDeferred: LectioDeferred<HTMLElement> = LectioJSUtils.CreateDeferred();

	export function GetLectioContextMenuShownPromise(): Promise<HTMLElement> {
		return lectioContextMenuShownDeferred.promise();
	}

	function GetContextMenuElement(instance: Element): Element | null {
		LectioJSUtils.AssertNotNullOrUndefined(instance, 'instance');

		const instancey = $(instance);

		if (instancey.length === 0)
			return null;

		let target = instancey.hasClass('.lec-context-menu') ? instancey : null;
		if (target && target.length > 0)
			return target.get(0) ?? null;

		target = instancey.next('.lec-context-menu');
		if (target && target.length > 0)
			return target.get(0) ?? null;

		target = instancey.children('.lec-context-menu');
		if (target && target.length > 0)
			return target.get(0) ?? null;

		return null;
	}

	export function ShowContextMenuEx(
		eventForPlacement: Event,
		items: readonly LectioContextMenuItemData[],
		noItemsText: string | undefined,
	): void {
		eventForPlacement.stopPropagation();
		eventForPlacement.preventDefault();

		if (items.length === 0 && !noItemsText)
			throw new Error('huh: ingen elementer og ingen fallback-tekst?');

		const effectiveItems: readonly LectioContextMenuItemData[] = items.length || !noItemsText
			? items
			: [{ caption: noItemsText, action: () => { } }];

		const andHandlers = CreateMenuHtmlAndHandlers(effectiveItems);

		contin({ content: andHandlers.menu, handlers: andHandlers.handlers, eventForPlacement, thingForPlacement: eventForPlacement });
	}

	function CreateMenuHtmlAndHandlers(items: readonly LectioContextMenuItemData[]): {
		menu: HTMLElement,
		handlers: MenuCallbackSet,
	} {
		let fnItemCtr = 0;
		const handlers: MenuCallbackSet = {};
		const itemsmut = [...items];
		itemsmut.sort((x, y) => (y.prio ?? 0) - (x.prio ?? 0) || (y.placement ?? 0) - (x.placement ?? 0));
		const htmllist: string[] = [];
		let idx = -1;
		for (const item of itemsmut) {
			idx++;
			if (idx > 0 && (item.prio ?? 0) !== (itemsmut[idx - 1].prio ?? 0))
				htmllist.push(`<li data-role='separator'><div></div></li>`);

			const [href, key, cmd] = (() => {
				if ('url' in item) {
					return [item.url, '', ''];
				} else {
					const key = 'ctx' + (++fnItemCtr);
					handlers[key] = item.action;
					return ['#', key, 'menuhandler'];
				}
			})();

			const html = item.imagePath
				? `<img src='${item.imagePath}' style='margin-right: 3px;'>` + LectioJSUtils.HtmlEncode(item.caption)
				: item.iconPath
					? `<span class="ls-fonticon">${item.iconPath}</span>` + LectioJSUtils.HtmlEncode(item.caption)
					: LectioJSUtils.HtmlEncode(item.caption);

			htmllist.push(`<li data-menu-key='${key}' data-role='button' data-command='${cmd}'><a href='${href}'>${html}</a></li>`);
		}
		const lishtml = htmllist.join('\n');

		const menu = $(`<div class="lec-context-menu"><ul>${lishtml}</ul></div>`);
		return { menu: menu[0], handlers };
	}

	function HideContextMenu() {
		if (activeContextMenu != null) {
			activeContextMenu.remove();
			activeContextMenu = undefined;
		}

		if ($('.lec-context-menu').is(':visible'))
			$('.lec-context-menu').hide();
	}

	export function IsContextCardLectioDropdown(ele: HTMLInputElement): boolean {
		return !!TryGetLectioDropDownData(ele);
	}
}

function TryGetLectioDropDownData(cctarget: HTMLElement): {
	ccId: string
}
	| 'naesten'
	| null {
	if (cctarget.matches('.ac_input') && $(cctarget).nextAll(':input').first().is(':hidden')) {
		const hidden = LectioJSUtils.GetAssertedType($(cctarget).nextAll(':input').first().get(0), HTMLInputElement, 'html input');

		const ccidMaybe = hidden.value as string;
		if (ccidMaybe && ccidMaybe.length > 2) {
			if (ccidMaybe.match(/^[^\d]+\d+$/))
				return { ccId: ccidMaybe };
			const pref = hidden.getAttribute('lec-ddcc-prefix');
			if (pref)
				return { ccId: pref + ccidMaybe };
		}
		return 'naesten';
	}
	return null;
}

let lastContextCard: JQuery | undefined;
const contextCardDivId = "ctxCardId";

async function ShowContextCardAsync(
	key:
		{ type: 'idserialized', ser: string } |
		{ type: 'search', value: string, field: string },
	baseschoolurl: string,
	prevurl: string | undefined,
	targetEvent: Event | undefined,
	targetElement: JQuery | undefined,
	ignoreUnsupportedIdTypes: boolean
): Promise<undefined> {
	if (!$('#' + contextCardDivId).length) {
		$(`<div id='${contextCardDivId}'></div>`).appendTo("body");
	}

	if (lastContextCard) {
		lastContextCard.dialog('destroy').remove();
		lastContextCard = undefined;
	}
	const $dialogdiv = $('#' + contextCardDivId);
	$dialogdiv.html(`<div><span class='loadingContextCard'>Henter info...</span></div>`);

	const position = targetElement
		? {
			my: "left top",
			at: "left bottom",
			of: targetElement,
			collision: "fit",
			within: "div.outerContentFrame"
		}
		: {
			my: "left bottom-55%",
			at: "right bottom",
			of: targetEvent,
			collision: "fit",
			within: "div.outerContentFrame"
		};

	const $dialog = $dialogdiv.dialog({
		autoOpen: true,
		closeOnEscape: true,
		title: '',
		width: 430,
		position: position,
		resizable: false,
		draggable: true,
		open: () => { $("div#thumbctrl_largeimg").hide(); },
		close: () => {
			$("div#thumbctrl_largeimg").hide();
			lastContextCard = undefined;
		}
	});

	lastContextCard = $dialog;

	let ids: { searchtype: string, lectiocontextcard: string } & Record<string, string>;
	if (key.type === 'idserialized') {
		ids = {
			searchtype: 'id',
			lectiocontextcard: key.ser,
			prevurl: prevurl ?? '',
			ignoreUnsupportedIdTypes: ignoreUnsupportedIdTypes ? '1' : '0'
		};
	}
	else if (key.type === 'search') {
		LectioJSUtils.AssertNotNullOrEmpty(key.value, 'key.value');
		ids = {
			searchtype: 'text',
			lectiocontextcard: key.value,
			field: key.field,
			prevurl: prevurl ?? '',
			ignoreUnsupportedIdTypes: ignoreUnsupportedIdTypes ? '1' : '0'
		};
	}
	else
		LectioJSUtils.AssertNever(key, 'key');

	try {
		const response = await fetch(
			new Request(baseschoolurl + '/contextcard/contextcard.aspx?' + new URLSearchParams(ids)));
		if (response.status === 204 && ignoreUnsupportedIdTypes) {
			// 204 no content.
			$dialogdiv.dialog('destroy').remove();
			lastContextCard = undefined;
			return;
		}
		const responseText = await response.text();
		$(".ui-dialog-title").html($(responseText).first().text());
		$dialogdiv.html(responseText);
	} catch (error) {
		$dialogdiv.html('Kan ikke vise kontekstkort - der er sket en fejl.');
	}

	LectioJSUtils.DispatchBrowserTestEvent('contextCardShown', $dialogdiv.get(0));
}
