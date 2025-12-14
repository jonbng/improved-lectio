import { CommandRegistry } from "./CommandRegistry";
import { LectioJSUtils } from "./LectioJSUtils";
import { HtmlUtilities } from "./HtmlUtilities";
import { CssUtil } from "./CssUtil";

export namespace GuiMisc {
	export function FindTables(): HTMLTableElement[] {
		const tables = document.body.querySelectorAll<HTMLTableElement>('table.ls-table-layout1');
		return [...tables];
	}

	export function TryFindTable(ancestor: HTMLElement): HTMLTableElement | null {
		const tableraw = ancestor.querySelector('table.lf-grid');
		if (!tableraw)
			return tableraw;
		return LectioJSUtils.GetAssertedType(tableraw, HTMLTableElement, 'table');
	}

	export function FindTable(ancestor: HTMLElement): HTMLTableElement {
		const tableraw = TryFindTable(ancestor);
		if (!tableraw)
			throw new Error("Find ikke tabel.");
		return tableraw;
	}

	export function CurrentDialogMaximize(): void {
		const ex = document.querySelector('body > div[role=dialog]');
		if (!ex)
			return;

		const e = LectioJSUtils.GetAssertedType(ex, HTMLElement, 'htmlelement');
		e.style.width = '90vw';
		e.style.left = '5vw';
		e.style.top = '5vh';
		e.style.height = '90vh';
	}

	export function InitTableFilter(): void {
		const tables = FindTables();
		const islandsWithTables: HTMLElement[] = [];

		// Vis burgermenu for oer der har tabeller.
		for (const t of tables) {
			const island = $(t).closest('.island').get(0);
			if (island)
				islandsWithTables.push(island);
		}

		const allislands = document.querySelectorAll('.island');
		for (const island of allislands) {
			const headerright = island.querySelector('.islandHeaderRight');
			if (!headerright)
				continue;
			if (!(headerright instanceof HTMLElement))
				throw new Error('awioawje');

			const hastables = islandsWithTables.some(iwt => iwt === island);
			if (!hastables && !headerright.querySelector('ul')) {
				headerright.style.display = 'none';
			}
		}
	}

	let tscounter = 0;

	export function ShowTableFilter(tableraw: HTMLTableElement, initialFilter?: string): void {
		if (tableraw.previousSibling instanceof HTMLTextAreaElement) {
			tableraw.previousSibling.focus();
			return;
		}

		if (tableraw.querySelector('td[rowspan], td[colspan]')) {
			alert('Tabelsøgning er ikke understøttet på den valgte tabel: Tabellen indeholder rækkegrupperinger.');
			return;
		}

		const ta = document.createElement('textarea');
		const tbodies = tableraw.querySelectorAll(':scope > tbody');
		if (tbodies.length !== 1)
			throw new Error(`Antal tbody er ikke 1, men ${tbodies.length}.`);

		const tbody = LectioJSUtils.GetAssertedType(tbodies[0], HTMLTableSectionElement, 'tbody');
		let latestsearchid = 1;

		{
			// Soegning efter en smule forsinkelse/pause mellem tastetryk.
			let lastInputMs: number | null = null;
			let delayxx: number | null = null;
			// Vil gerne have at soegningen er saa instantan som muligt.
			// Naar der er mange raekker, kan det dog tage maerkbar tid at
			// soege, hvilket er lidt irriterende at vente paa naar man ikke er
			// faerdig med at skrive det man vil soege paa. Derfor venter vi
			// lidt laengere tid med at soege, naar det er sandsynligt/muligt
			// at soegningen vil tage maerkbar tid.
			// Selv for store tabeller gaar det oftest hurtigt efter de foerste
			// par tegn er skrevet, fordi de fleste raekker da baade foer og
			// efter er skjulte.
			const expectslow = tbody.childElementCount >= 100;
			const inputdelay = expectslow ? 300 : 100;
			ta.addEventListener('input', () => {
				const nowMs = new Date().valueOf();
				lastInputMs = nowMs;
				if (delayxx != null) {
					clearTimeout(delayxx);
				}
				delayxx = setTimeout(() => {
					const filter = ta.value.trim();
					latestsearchid++;
					filterit(tbody, filter, latestsearchid);
				}, inputdelay);
			});
		}

		ta.style.width = '30em';
		ta.style.height = '6em';
		ta.placeholder = `Søg i tabel`;
		ta.title = `
Eks.:
ungedatabase
bevis
-Foretaget via: Eksamensdatabase-indberetning
`;
		if (initialFilter)
			ta.value = initialFilter;
		tableraw.parentElement!.insertBefore(ta, tableraw);

		let counter = 0;
		for (const row of tbody.children) {

			if (row.firstElementChild && row.firstElementChild.nodeName === 'TH')
				continue;

			counter++;
			const infoele = document.createElement('div');
			infoele.innerText = 'r ' + counter;
			const c0 = row.firstElementChild;
			c0?.appendChild(infoele);
		}

		// Ved ikke om det er noedvendigt med timeout inden focus,
		// og gider ikke at bruge tid paa at finde ud af det...
		setTimeout(() => {
			if (initialFilter) {
				latestsearchid++;
				filterit(tbody, initialFilter, latestsearchid);
			}

			const setfocus = !initialFilter;
			if (setfocus) {
				ta.focus();
				LectioJSUtils.DispatchBrowserTestEvent('tableSearchReady', document.body);
			}

		}, 100);
		tscounter++;

		const hideclassbase = 'ls-table-row-hidden-';

		const enum Musty {
			MustEvery,
			MustSome,
			MustNotSome,
		}

		function filterit(tbody: HTMLTableSectionElement, filter: string, searchid: number) {
			const hideclass = hideclassbase + tscounter + '-' + searchid;

			//StoreTableSettings(tableraw, filter);

			const lines = filter.split('\n');
			const allpreds = lines
				.filter(line => !!(line ?? '').trim())
				.map(line => {
					let op: Musty;
					switch (line[0]) {
					case '+':
						op = Musty.MustEvery;
						break;
					case '-':
						op = Musty.MustNotSome;
						break;
					default:
						op = Musty.MustSome;
						break;
					}
					const realline = line[0] === '-' || line[0] === '+' ? line.substring(1) : line;
					const re = new RegExp(realline
						// 202308: vil blot have wilcard-funktionalitet, ikke fuld regex-syntaks:
						.replace(/[()\\.?]/g, str => '\\' + str)
						.replace(/\*/g, '.*'),
						'i');
					return { re, op };
				});
			const mustSomePreds = allpreds.filter(p => p.op === Musty.MustSome);
			const mustNotSomePreds = allpreds.filter(p => p.op === Musty.MustNotSome);
			const mustEveryPreds = allpreds.filter(p => p.op === Musty.MustEvery);

			LectioJSUtils.AssertArgument(mustEveryPreds.length <= 30, 'for mange "+"');
			const mustEveryPredsMaskTarget = (1 << mustEveryPreds.length) - 1;

			let row_mustEveryMask = 0;
			let row_mustSomeOk = false;
			let row_mustNotSomeOk = true;
			function match(str: string): boolean {
				row_mustNotSomeOk &&= !mustNotSomePreds.some(p => p.re.exec(str));
				if (!row_mustNotSomeOk)
					return false;

				row_mustSomeOk ||= mustSomePreds.length === 0 || mustSomePreds.some(p => p.re.exec(str));
				if (!row_mustSomeOk)
					return false;

				if (row_mustEveryMask !== mustEveryPredsMaskTarget) {
					let idx = -1;
					for (const pred of mustEveryPreds) {
						idx++;
						const thisMask = 1 << idx;
						if (row_mustEveryMask & thisMask)
							continue;
						if (!pred.re.exec(str))
							continue;
						row_mustEveryMask |= thisMask;
					}
				}

				return row_mustSomeOk && row_mustNotSomeOk && row_mustEveryMask === mustEveryPredsMaskTarget;
			}

			let filternext: Element | null | undefined;
			let shownext: Element | null | undefined = null;
			filternext = tbody.firstElementChild;
			filtersome();


			// Tager nogle raekker ad gangen for ikke at risikere at
			// fryse/blokere browseren.
			function filtersome() {
				let time = new Date();
				while (true) {
					// Hvis brugeren har indtastet noget andet i mellemtiden,
					// stopper vi denne soegning.
					if (searchid != latestsearchid)
						return;

					// Med css-regel-tilgangen gaar det ret hurtigt at haandtere
					// selv store tabeller.
					// I hvert fald pr. 202203. Men det vil vaere ret kedeligt at
					// komme til at blokere ui-en hvis perf forvaerres, saa vi
					// holder lige en pause en gang imellem.
					const newnow = new Date();
					const duration = newnow.valueOf() - time.valueOf();
					time = newnow;
					if (duration > 100) {
						setTimeout(filtersome, 1);
						return;
					}

					const row = filternext;
					row_mustEveryMask = 0;
					row_mustSomeOk = false;
					row_mustNotSomeOk = true;
					filternext = row?.nextElementSibling;

					if (!row)
						break;
					if (!(row instanceof HTMLElement))
						throw new Error();
					if (row.classList.contains("paging"))
						continue;
					const rowchildren = [...row.children];
					if (rowchildren.length > 0 && rowchildren[0].tagName === 'TH') {
						continue;
					}

					const show =
						!filter

						// tolker det som 2. raekke ifbm. SuperHeaderText; den lader vi vaere.
						|| rowchildren.length == 0

						// Matcher mod hver celle isf. konkatenering af tekst
						// fra alle celler i raekken.
						// Fordi 1) det er lidt simplere. 2) det virker lidt
						// niche-agtigt at have et udtryk der skal se hele
						// raekkens tekst. 2) kunne approksimeres ved at have en
						// maade at angive konjunktiv normalform, hvor der laves
						// en konjunktion for de to kolonner, man vil ramme.
						|| rowchildren.some(cell => {
							if (!(cell instanceof HTMLTableCellElement))
								throw new Error('is not html table cell??');
							// todo haandtere celler med skjult indhold bedre.
							// Pt. bliver de bare helt ignoreret, hvilket er bedre
							// end at deres skjulte indhold matcher..
							// Eks.: holdelementliste paa Rediger elev, hvor der
							// er skjulte fejltekster for periodevaelgeren.
							if (!cell.querySelector('[style], [class]'))
								return match(cell.innerText);
							return false;
						})

						// Soeg i tekstfelter o.l. (stm 46818).
						|| row.querySelectorAll('input, select').some(ele => {
							if (ele instanceof HTMLInputElement)
								return match(ele.value);
							if (ele instanceof HTMLSelectElement) {
								const text = ele.options[ele.selectedIndex].textContent;
								return !!text && match(text);
							}
							throw new Error('type');
						});

					if (show)
						row.classList.remove(hideclass);
					else
						row.classList.add(hideclass);
				}

				// Det er vigtigt for perf at denne regel *ikke* findes
				// mens skjule-klassen bliver sat paa raekkerne.
				CssUtil.CreateOrUpdateCssRule('.' + hideclass, 'display: none');

				// Fjern css-regler fra tidligere soegninger.
				const rules = CssUtil.GetCssRules();
				const todelete = rules
					.filter(r =>
						r.selectorText.startsWith('.' + hideclassbase) &&
						r.selectorText != '.' + hideclass);
				for (const rule of todelete) {
					CssUtil.DeleteDynamicCssRule(rule.selectorText);
				}

				shownext = tbody.firstElementChild;
				// Ryd op i brug af css-regler fra tidligere soegninger.
				showsome();
			}


			// Tager nogle raekker ad gangen for ikke at risikere at
			// fryse/blokere browseren.
			function showsome() {

				let time = new Date();
				while (true) {
					// Hvis brugeren har indtastet noget andet i mellemtiden,
					// stopper vi denne soegning.
					if (searchid != latestsearchid)
						return;

					const newnow = new Date();
					const duration = newnow.valueOf() - time.valueOf();
					time = newnow;
					if (duration > 100) {
						setTimeout(showsome, 1);
						return;
					}

					const row = shownext;
					shownext = row?.nextElementSibling;

					if (!row)
						break;
					if (!(row instanceof HTMLElement))
						throw new Error();
					const rowchildren = Array.from(row.children);
					if (rowchildren.length > 0 && rowchildren[0].tagName === 'TH') {
						continue;
					}

					for (const c of <string[]><any>row.classList) {
						if (c.startsWith(hideclassbase) && c !== hideclass)
							row.classList.remove(c);
					}
				}

				// Her er vi helt faerdige med den aktuelle soegning.

				LectioJSUtils.DispatchBrowserTestEvent('tableSearchDone', document.body);
			}
		}
	}

	export function ShowDatabaseInfo() {
		const existing = document.querySelectorAll('.ls-dbinfo');
		if (existing?.length) {
			existing.jQueryPartial().remove();
			return;
		}

		const tableelements = document.querySelectorAll('*[lec-dbg-itemtype]');
		for (const tabele of tableelements) {
			const tabname = tabele.getAttribute('lec-dbg-tablename');
			const infoele = document.createElement('div');
			infoele.className = 'ls-dbinfo';
			if (tabname) {
				const linkele = document.createElement('a');
				linkele.innerText = tabname || "??";
				linkele.href = 'https://lectio-udv4.macom.dk/DbViewerWeb/TableView/' + tabname;
				infoele.appendChild(document.createTextNode('Table: '));
				infoele.appendChild(linkele);
			} else {
				// Vi faar her oftest et fuldt clr-typenavn, saa vi klipper det lige til til..
				// Men sommetider er assemblynavn ikke en del af det.
				const itemTypeFull = tabele.getAttribute('lec-dbg-itemtype');
				const disp = itemTypeFull!.split(',')[0];
				infoele.appendChild(document.createTextNode('ItemType: ' + disp));
			}

			tabele.parentElement!.insertBefore(infoele, tabele);
		}

		const colelement = document.querySelectorAll('*[lec-dbg-columnname]');
		for (const thele of colelement) {
			const colname = thele.getAttribute('lec-dbg-columnname');

			const infoele = document.createElement('div');
			infoele.className = 'ls-dbinfo';
			infoele.style.border = '1px solid #cccccc';
			infoele.appendChild(document.createTextNode('Column: ' + colname));
			thele.insertBefore(infoele, thele.firstChild!);
		}
	}

	export function ShowSetStudentIdsToBrowse() {
		const html = `
		<div>
<table class='ls-help-table'>
	<tr>
		<td>Indsaet student-id pr. linie eller kommasepareret liste</td>
		<td>
		<textarea id="studentids_ta"></textarea>
		</td>
	</tr>
</table>
</div>
		`.trim();
		const hh = $(html);
		hh.dialog({
			title: 'bladre..', buttons: {
				'Ok': () => {
					const ta = document.getElementById("studentids_ta");
					if (!(ta instanceof HTMLTextAreaElement))
						throw new Error();

					const val = ta.value.trim();
					if (!val) {
						return hh.dialog('destroy').remove();
					}
					let commasep: string;
					if (val.match(/,/)) {
						commasep = val;
					}
					else {
						commasep = val.split(/\r?\n/g).join(', ');
					}
					if (!commasep.match(/,/)) {
						// todo fejlbesked
						return hh.dialog('destroy').remove();
					}

					let ids: any;
					try {
						ids = JSON.parse('[' + commasep + ']');
					}
					catch (e) {
						console.error("Kan ikke parse som json", e, commasep);
						return;
					}
					if (!(ids instanceof Array))
						throw new Error("Data passer ikke i et array.");
					LectioJSUtils.PostApi(
						'/stamdata/stamdata_edit_student.api',
						'SetStudentIdsToBrowse',
						{},
						{
							studentIds: ids
						})
						.then(response => {
							if (!response.ok) {
								console.error("Fik ikke ok fra kald.", response);
								throw new Error("Fik ikke ok fra kald: " + response.statusText);
							}
							return response.json();
						})
						.then(url => location.href = url);

					return hh.dialog('destroy').remove();
				},
			}
		});
	}


	export namespace LectioJump {
		$(() => {
			CommandRegistry.RegisterCommand({
				id: 'navigation.jumpSamePage',
				title: 'Hop',
				execute: () => {
					const jumpy = (originalUrl: string, jumpKeyRaw: string): { paq: string, openNewWindow: boolean } => {
						// '52,123123123' - foerste er eksamensnummer.
						// '52 123123123' - samme, men med tab isf. komma. Chromes "prompt" laver tabs om space.
						// ',123123123' - skift ikke eksamensnummer.
						// '52,123123/n' - aabn i nyt faneblad.
						const settingsSplit = jumpKeyRaw.match(/^(.+)\/(\w*)$/);
						let jumpkey: string;
						let openNewWindow = false;
						if (settingsSplit) {
							const [_, p1, settings] = settingsSplit;
							jumpkey = p1;
							openNewWindow = settings === 'n';
						}
						else
							jumpkey = jumpKeyRaw;
						const parts = jumpkey.split(' ').length > 1 ? jumpkey.split(' ') : jumpkey.split(',');
						let idx = -1;
						const newStr = originalUrl.replace(/\b\d+\b/g, m => {
							idx++;
							if (idx >= parts.length || parts[idx] === '')
								return m;
							return parts[idx];
						});

						return { paq: newStr, openNewWindow };
					};


					const aseq = (expected: string, actual: string, jk: string) => {
						if (expected !== jumpy(actual, jk).paq)
							throw Error(`aseq: ${expected} vs ${actual} with jump key '${jk}'.`);
					}
					aseq("/lectio/456/stamdata/stamdata_edit_hold.aspx?id=456123456123", "/lectio/123/stamdata/stamdata_edit_hold.aspx?id=123456123456", "456,456123456123");
					aseq("/lectio/456/stamdata/stamdata_edit_hold.aspx?id=456123456123", "/lectio/123/stamdata/stamdata_edit_hold.aspx?id=123456123456", "456 456123456123");
					aseq("/lectio/123/stamdata/stamdata_edit_hold.aspx?id=456123456123", "/lectio/123/stamdata/stamdata_edit_hold.aspx?id=123456123456", ",456123456123");
					aseq("/lectio/456/stamdata/stamdata_edit_hold.aspx?id=123456123456", "/lectio/123/stamdata/stamdata_edit_hold.aspx?id=123456123456", "456");
					aseq("/lectio/456/stamdata/stamdata_edit_hold.aspx?id=123456123456", "/lectio/123/stamdata/stamdata_edit_hold.aspx?id=123456123456", "456,");

					const jumpKeyRaw = prompt('Indtast hoppenoegle. Afslut med "/n" for at aabne i nyt vindue.');
					if (!jumpKeyRaw)
						return;
					const res = jumpy(location.pathname + location.search, jumpKeyRaw);

					const newstr2 = CleanLectioLink(res.paq);
					LectioJSUtils.LogDebug('newstr', newstr2);
					if (res.openNewWindow)
						window.open(newstr2);
					else
						location.assign(newstr2);
				}
			});
		});

		export function CleanLectioLink(url: string) {
			const magic = '?qorno=q';
			const rep1 = url.replace(/(&|\?)prevurl=[^&]+/, m => m[0] == '?' ? '?' : '');
			const rep2 = rep1.replace('?&', '?');
			return rep2;
		}
	}
}