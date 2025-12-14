import { CommandRegistry } from "./CommandRegistry";
import { fuzzyMatch } from "./fts_fuzzy_match";
import { LectioJSUtils } from "./LectioJSUtils";


export namespace GridStuff {
	export async function showGridStuff(ctx: CommandRegistry.CommandExecutionContext): Promise<{}> {
		let element: Element | null;
		if (ctx.Argument) {
			element = document.getElementById(ctx.Argument);
		} else {
			const tmp = await CommandRegistry.PromptUserForElementSelection({
				prompt: 'Klik på en tabel.',
				selector: 'table.lf-grid',
			});
			if (tmp === 'notfound')
				return {};
			element = tmp;
		}
		if (!(element instanceof HTMLTableElement))
			return {};

		const table = element;
		ctx.ArgumentDerivedByCommand = table.id;

		const exprsstr = table.getAttribute('lec-col-exprs') ?? '';
		const tabinfos = parseexprsimpl(exprsstr);
		const tab = LectioJSUtils.GetAssertedType(table, HTMLTableElement);

		showGridStuffSelector(tab, tabinfos);
		return {};
	}

	type TabField = {
		readonly fn: string;
		readonly ref?: string;
	};

	type TabInfo = {
		readonly id: string,
		readonly fields: TabField[];
	};

	export function parseexprsimpl(attr: string): readonly TabInfo[] {
		const lines = attr.split(/\n/g);

		let currtabid: string | null = null;
		const tables: TabInfo[] = [];

		let currtabitems: TabField[] | null = [];
		for (const l of lines) {
			if (!l) {
				currtabid = null;
				currtabitems = null;
				continue;
			}
			if (currtabid === null) {
				currtabid = l;
				currtabitems = [];
				tables.push({ id: currtabid, fields: currtabitems });
				continue;
			}

			const tabidx = l.indexOf('\t');
			if (tabidx === -1)
				currtabitems?.push({ fn: l });
			else {
				const fn = l.slice(0, tabidx);
				const ref = l.slice(tabidx + 1, l.length);
				currtabitems?.push({ fn: fn, ref: ref });
			}
		}
		return tables;
	}

	function indexOfRegExp(str: string, regexp: RegExp, position: number): number | null {
		for (let i = position; i < str.length; i++) {
			if (str.slice(i, i + 1).match(regexp))
				return i;
		}
		return null;
	}

	function lastIndexOfRegExp(str: string, regexp: RegExp, position: number): number | null {
		for (let i = position - 1; i >= 0; i--) {
			if (str.slice(i, i + 1).match(regexp))
				return i;
		}
		return null;
	}

	type Result<TOk, TError> = {
		status: 'ok', value: TOk
	} | {
		status: 'error', error: TError
	};


	function showGridStuffSelector(gvtable: HTMLTableElement, tabinfos: readonly TabInfo[]): void {
		const configinput = LectioJSUtils.GetAssertedType(gvtable.nextElementSibling, HTMLInputElement);
		const currExprs = configinput.value;

		const d = $(
			`<div>
				<h4>Felter:</h4>
				<textarea class='xxx_exprs' style='width:50em; height: 5em; overflow: auto; height: min(8em, 50%)'></textarea>
				<div style='display: flex'>
					<div class='clu-completions' style='height: 20em; overflow-x: auto; width: 17em'>

					</div>
					<div>
						<button>Opdatér</button>
					</div>
				</div>
			</div>`)
			.dialog({
				height: 500,
				width: '55em',
				open: function (this: HTMLElement, evt: Event) {
					const completions = LectioJSUtils.GetAssertedType(
						this.querySelector('.clu-completions'), HTMLDivElement);
					const ta = LectioJSUtils.GetAssertedType(
						this.querySelector('.xxx_exprs'),
						HTMLTextAreaElement,
						'ta');
					ta.value = currExprs;

					dota(ta, completions);

					const dialogele = LectioJSUtils.GetAssertedType(evt.target, HTMLElement);
					const btn = LectioJSUtils.GetAssertedType(dialogele.querySelector('button'), HTMLButtonElement);
					btn.onclick = () => {
						const configstr = ta.value;
						configinput.value = configstr;
						const xx = gvtable.id.replace(/_/g, '$');
						window.__doPostBack(xx, 'SetColConfig$boo');
					}

					setTimeout(() => {
						ta.focus();
						LectioJSUtils.DispatchBrowserTestEvent('cluEditReady', document.body);
					}, 500);
				}
			});

		function trygetnames(fqname: string): Result<{ names: string[], normbefore: string }, 'badinput'> {
			if (fqname.match(/[^\w.]/))
				return { status: 'error', error: 'badinput' };
			const parts = fqname ? fqname.split('.') : [];

			let idx = -1;
			let tab = tabinfos[0];
			const normalizedfqnames: string[] = [];
			for (const part of parts) {
				idx++;
				const tfmatches = tab.fields
					.filter(tf => tf.fn.toLowerCase() === part.toLowerCase());

				if (tfmatches.length != 1)
					return { status: 'error', error: 'badinput' };

				const tf = tfmatches[0];
				normalizedfqnames.push(tf.fn);

				if (tf.ref) {
					const tabmatches = tabinfos
						.filter(ti => ti.id === tf.ref);
					if (tabmatches.length !== 1)
						throw new Error(`tab ikke fundet. field=${part}, id=${tf.ref}.`);
					const nexttab = tabmatches[0];
					tab = nexttab;
				}
				else if (parts.length >= idx + 1)
					return { status: 'error', error: 'badinput' };
			}

			return {
				status: 'ok', value: {
					names: tab.fields.map(fi => fi.fn),
					normbefore: normalizedfqnames.map(n => n + '.').join(''),
				}
			};
		}

		type states = 'noassistance' | 'showingcompletions';
		let state: states = 'noassistance';

		type stateinfo = {
			noassistance: 42,
			showingcompletions: readonly string[],
		};

		function GetCursorPosInfo(taValue: string, cursorpos: number): {
			exprstart: number;
			exprend: number;
			namestart: number;
			nameend: number;
		} {
			const exprstart = (lastIndexOfRegExp(taValue, /[^\w.]/, cursorpos) ?? -1) + 1;
			const exprend = indexOfRegExp(taValue, /[^\w.]/, cursorpos) ?? taValue.length;
			const namestart = (lastIndexOfRegExp(taValue, /[^\w]/, cursorpos) ?? -1) + 1;
			const nameend = indexOfRegExp(taValue, /[^\w]/, cursorpos) ?? taValue.length;
			return {
				exprstart,
				exprend,
				namestart,
				nameend,
			};
		}

		function dota(ta: HTMLTextAreaElement, completionsContainer: HTMLDivElement): void {
			function doinp(): void {
				ta.oninput = evt => {
					if (!(evt instanceof InputEvent))
						throw new Error('her skal der vaere en inputevent.');
					if (evt.data !== '.')
						return;

					const inpval = ta.value;
					const cursorpos = ta.selectionStart;
					const cpi = GetCursorPosInfo(inpval, cursorpos);
					const names = trygetnames(inpval.slice(cpi.exprstart, cpi.namestart - 1));

					if (names.status === 'error') {
						setstate('noassistance', 42);
						return;
					}
					setstate('showingcompletions', names.value.names);
				};
			}

			function asshtml(x: EventTarget | null): HTMLElement {
				return LectioJSUtils.GetAssertedType(x, HTMLElement);
			}

			doinp();
			ta.onblur = () => {
				setstate('noassistance', 42);
			};

			function getcurrentcompletionselection<si extends states & 'showingcompletions'>(statex: si) {
				if (statex !== state)
					throw new Error('forkert tilstand');
				const activecomp = completionsContainer.querySelector('.clu-current-completion');
				if (!activecomp)
					throw new Error('completions aktiv, men intet valgt element.');
				return activecomp;
			}

			ta.onkeydown = evt => {
				let mods = '';
				if (evt.ctrlKey)
					mods += 'c';
				if (evt.shiftKey)
					mods += 's';
				if (evt.altKey)
					mods += 'a';
				if (evt.metaKey)
					mods += 'm';
				if (mods !== '') {
					const ok = mods === 'c' && evt.key === ' ';
					if (!ok)
						return;
				}

				const inpval = ta.value;

				switch (evt.key) {
				case 'ArrowUp':
				case 'ArrowDown': {
					if (state !== 'showingcompletions')
						return;
					evt.preventDefault();

					const activecomp = getcurrentcompletionselection(state);

					// todo scrolling her fungerer ikke saa godt.
					const scrollele = (ele: HTMLElement) => {
						if (ele.offsetTop < completionsContainer.offsetTop) {
							// completionsContainer.scrollTo(0, ele.offsetTop);
							ele.scrollIntoView();
						}
						else if (ele.offsetTop > completionsContainer.offsetTop + completionsContainer.clientHeight) {
							ele.scrollIntoView();
							// completionsContainer.scrollTo(0, ele.offsetTop - completionsContainer.clientHeight);
						}
					}


					let newactive: HTMLElement;
					if (evt.key === 'ArrowUp')
						newactive = asshtml(
							activecomp.previousElementSibling ??
							activecomp.parentElement!.lastElementChild);
					else
						newactive = asshtml(
							activecomp.nextElementSibling ??
							activecomp.parentElement!.firstElementChild);
					activecomp.classList.remove('clu-current-completion');
					newactive.classList.add('clu-current-completion');
					scrollele(newactive);
					break;
				}
				case 'Tab':
				case 'Enter': {
					if (state !== 'showingcompletions')
						return;
					evt.preventDefault();

					const selection = asshtml(getcurrentcompletionselection(state)).innerText.trim();
					// console.debug('choose this', selection);
					const cpi = GetCursorPosInfo(ta.value, ta.selectionStart);

					let prenames = inpval.slice(cpi.exprstart, cpi.namestart);
					if (prenames[prenames.length - 1] === '.')
						prenames = prenames.slice(0, -1);
					const names = trygetnames(prenames);
					if (names.status !== 'ok') {
						console.debug('completion ikke ok: parse-fejl');
						break;
					}
					ta.setRangeText(names.value.normbefore + selection, cpi.exprstart, cpi.exprend, 'end');

					setstate('noassistance', 42);
					break;
				}
				default: {
					if (!(evt.key && (evt.key.match(/^\w$/) || evt.key === ' ' && mods == 'c'))) {

						setstate('noassistance', 42);
						break;
					}

					const cpi2 = GetCursorPosInfo(inpval, ta.selectionStart);
					const enteredname = inpval.slice(cpi2.namestart, ta.selectionStart);

					let prenames = inpval.slice(cpi2.exprstart, cpi2.namestart);
					if (prenames[prenames.length - 1] === '.')
						prenames = prenames.slice(0, -1);
					const names = trygetnames(prenames);
					if (names.status !== 'ok') {
						console.debug('completion ikke ok: parse-fejl');
						break;
					}
					let matches: [string, number][] = [];
					if (!enteredname) {
						matches = names.value.names.map(n => [n, 1]);
					}
					else {
						for (const name of names.value.names) {
							const mq = fuzzyMatch(enteredname, name);
							if (mq[0] === false)
								continue;
							matches.push([name, mq[1]]);
						}
					}
					if (matches.length === 0) {
						setstate('noassistance', 42);
						return;
					}
					matches.sort((x, y) => {
						const dnum = y[1] - x[1];
						return dnum;
					})
					setstate('showingcompletions', matches.map(t => t[0]));
					// console.debug('keyx', cpi2, {
					// 	toreplace: enteredname,
					// });
				}
				}
			};

			function setstate<si extends keyof stateinfo>(newstate: si, info: stateinfo[si]): void {
				switch (newstate) {
				case 'noassistance':
					completionsContainer.innerHTML = '';
					break;
				case 'showingcompletions': {
					const completions = info as stateinfo['showingcompletions'];

					const chtml = completions.map(name => `<div>${name}</div>`).join('\n');
					completionsContainer.innerHTML = chtml;
					state = 'showingcompletions'

					const firstcomp = asshtml(completionsContainer.firstElementChild);
					firstcomp.classList.add('clu-current-completion');
					break;
				}
				default:
					LectioJSUtils.AssertNever(newstate, newstate);
				}
				state = newstate;
			}
		}
	}

	export function getColCountFromHeader(t: HTMLTableElement): number {
		const r0 = t.rows[0];
		const r1 = t.rows[1]?.firstElementChild?.nodeName == 'TH' ? t.rows[1] : null;
		if (!r1)
			return r0.cells.length;
		const r0part = r0.children
			.map<number>(th => (parseInt(th.getAttribute('rowspan') ?? '1')) === 2 ? 1 : 0)
			.reduce((agg, num) => agg + num, 0);
		const r1part = r1.children.length;

		return r0part + r1part;
	}
}