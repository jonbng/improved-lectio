import { Autocomplete, InputDropdownDataItem } from './Autocomplete';
import Combokeys from "combokeys";
import { LectioJSUtils, ReadWrite } from './LectioJSUtils';


export namespace CommandRegistry {

	const registeredCommands: { [id: string]: CommandDefinition | undefined; } = {};
	let ck: Combokeys.Combokeys | undefined;

	export function InitializeLinkSearch(templateUrl: string): void {
		linkTemplateUrl = templateUrl;
	}

	export let linkTemplateUrl: string | undefined;

	/**
	 * input-args og evt. udledte args til naeste gang.
	 */
	export type CommandExecutionContext = {
		readonly Argument: string | undefined;
		ArgumentDerivedByCommand: string | undefined;
	}

	export type CommandExecutionReturnType = void | Promise<{}>;

	export type CommandDefinition = Readonly<{
		id: string;
		title: string;
		execute:
		(() => CommandExecutionReturnType) |
		((ctx: CommandExecutionContext) => CommandExecutionReturnType);
		skipAddToHistory?: boolean;
	}>;

	export function RegisterCommand(definition: CommandDefinition, shortcut?: string): void {
		LectioJSUtils.AssertNotNullOrUndefined(definition, 'definition');
		if (definition.id in registeredCommands)
			throw new Error('Allerede registreret: ' + definition.id);
		registeredCommands[definition.id] = definition;

		if (shortcut)
			RegisterCommandKeyBinding(definition.id, shortcut);
	}

	export async function ExecuteCommand(cmdId: string, arg?: string): Promise<void> {
		const def = registeredCommands[cmdId];
		if (!def)
			throw new Error('Ukendt kommando: ' + cmdId);
		const hist = GetCommandHistory();
		const saveInHistory = def?.skipAddToHistory !== true && cmdId !== 'showCommandSelector';
		let histentry: ReadWrite<CommandHistoryItem> | null;
		if (saveInHistory) {
			for (let i = 0; i < hist.Items.length; i++) {
				if (hist.Items[i].CommandId === cmdId) {
					hist.Items.splice(i, 1);
					i--;
				}
			}
			histentry = {
				CommandId: cmdId, Argument: arg
			};
			hist.Items.unshift(histentry);
			if (hist.Items.length > 3)
				hist.Items.length = 3;
		}
		else
			histentry = null;

		SetCommandHistory(hist);

		const ctx: CommandExecutionContext = { Argument: arg, ArgumentDerivedByCommand: undefined };
		const rv = def.execute(ctx);
		if (rv && 'then' in rv) {
			await (rv as any);
		}
		considerUpdateHist();

		function considerUpdateHist() {
			// kan vel godt ske at en anden kommando har koert i mellemtiden,
			// saa burde nok haandtere dettehersens anderledes.
			if (ctx.ArgumentDerivedByCommand && histentry) {
				histentry.Argument = ctx.ArgumentDerivedByCommand;
				SetCommandHistory(hist);
			}
		}
	}


	type CommandHistoryItem = {
		readonly CommandId: string;
		readonly Argument: string | undefined;
	}

	type CommandHistory = {
		readonly Items: CommandHistoryItem[];
	}

	export function GetCommandHistory(): CommandHistory {
		const json = localStorage.getItem('CommandHistory');
		if (!json)
			return { Items: [] };
		return JSON.parse(json);
	}

	export function SetCommandHistory(commandHistory: CommandHistory): void {
		localStorage.setItem('CommandHistory', JSON.stringify(commandHistory));
	}

	export function ExecuteRecent(num: number, reuseArgument: boolean) {
		const hist = GetCommandHistory();
		if (!(num - 1 < hist.Items.length))
			return;
		const histentry = hist.Items[num - 1];
		if (reuseArgument)
			ExecuteCommand(histentry.CommandId, histentry.Argument);
		else
			ExecuteCommand(histentry.CommandId);
	}

	export function RegisterCommandKeyBinding(commandId: string, key: string) {
		LectioJSUtils.AssertArgument(commandId in registeredCommands, 'commandId in registeredCommands');
		if (!ck) {
			ck = new Combokeys(document.documentElement);
			EnableGlobalCombokeys(ck);
		}

		const cb = (evt: any) => {
			evt.preventDefault();
			ExecuteCommand(commandId);
		};
		const firstChordUsesModifier = !!key.match(/^(ctrl|alt|shift|meta)/i);
		if (firstChordUsesModifier) {
			// Vi vil gerne have at genvejstaster ogsaa virker naar fokus er i et input-felt.
			// I hvert fald et par centrale/universelle, saa som alt+1 og alt+2.
			// 'any' her, for har ikke dt-defs for bindGlobal.
			(ck as any).bindGlobal(key, cb);
		}

		else
			ck.bind(key, cb);
	}

	export function PromptUserForElementSelection(args: {
		prompt: string,
		promptTitle?: string, selector: string
	}): Promise<Element | 'notfound'> {
		LectioJSUtils.ShowInformation(args.prompt, args.promptTitle);

		const def = LectioJSUtils.CreateDeferred<Element | 'notfound'>();
		const onclick = (e: MouseEvent): void => {
			const orig = LectioJSUtils.GetAssertedType(e.target, Element, 'Element');
			let target = orig;

			function isnice(ele: Element) {
				return ele.matches(args.selector);
			}
			while (target && !isnice(target)) {
				target = target.parentElement!;
			}
			if (!target) {
				stopit();
				def.reject('notfound');
				return;
			}
			stopit();
			def.resolve(target);
		};
		const onkeydown = (e: KeyboardEvent): void => {
			stopit();
			LectioJSUtils.ShowInformation('Annulleret');
			def.resolve('notfound');
		};

		document.body.addEventListener('click', onclick, { capture: true, once: true });
		document.body.addEventListener('keydown', onkeydown, { capture: true, once: true });
		function stopit() {
			document.body.removeEventListener('click', onclick, { capture: true });
			document.body.removeEventListener('keydown', onkeydown, { capture: true });
		}
		return def.promise();
	}

	export function showCommandSelector() {
		const d = $(`<div>
		<div>Kommando:</div>
		<input id='xxx_inp' style='width:40em'>
		<input type=hidden id='xxx_inpid'>
		</div>`).dialog({
			height: 500,
			width: '55em',
			open: () => {
				initpicker();
				const inp = document.querySelector('#xxx_inp') as HTMLInputElement;
				inp.blur();

				setTimeout(() => {
					inp.focus();
				}, 500);
			}
		});
		function initpicker(): void {
			const data: InputDropdownDataItem[] = [];
			function add(def: CommandDefinition) {
				const item: InputDropdownDataItem = [
					def.title, def.id, '', '11', '', null, true, null, null
				];
				data.push(item);
			}
			const arr: CommandDefinition[] = [];
			for (const id of Object.keys(registeredCommands))
				arr.push(registeredCommands[id]!);

			arr.sort((x, y) => x.title.localeCompare(y.title));
			for (const cmd of arr)
				add(cmd);

			type LinkTemplate = Readonly<{
				/**  member path */
				mp: string;
				/** Title */
				t: string;
				/** Argument types */
				at: string;
			}>;

			fetch(linkTemplateUrl || 'darnit')
				.then(resp => {
					return resp.json();
				})
				.then((json: (LinkTemplate | 0)[]) => {
					const dict: { [key: string]: LinkTemplate | undefined; } = {};

					for (const lt of json) {
						if (lt === 0)
							break;
						if (lt.at) {
							// Indtil vi har en maade at skaffe/give args, ignorerer vi links der kraever dem.
							continue;
						}

						const id = "Link." + lt.mp;
						// todo brug noget andet en metodenavnet her - noget der er unikt.
						if (id in dict) {
							continue;
						}
						dict[id] = lt;
						add({
							id: id,
							title: lt.t,
							execute: () => { throw new Error('Not no be executed - not a real comand.'); }
						});
					}
					return dict;
				})
				.then(dict => {
					Autocomplete.autocompleteCtrl("xxx_inp",
						[data], {
						targetValue: "xxx_inpid",
						emptyText: '',
						useFuzzySearch: true,
						select: args => {

							const lt = dict[args.key];
							if (lt) {
								LectioJSUtils.LogDebug('lt', lt.mp);
								startLectioNav(lt.mp);
							}
							else {
								ExecuteCommand(args.key);
							}
							d.dialog('destroy').remove();
							return 'done';
						},
						groupSeparatorNumber: 10
					}, undefined);
					LectioJSUtils.DispatchBrowserTestEvent('lectestDialogInitialized', window);
				});
			function startLectioNav(linkTemplateId: string): void {
				LectioJSUtils.PostApi('/default.api', 'ResolveLink', { linkTemplateId: linkTemplateId })
					.catch(resp => {
						console.error('Nav: Fejl under hent url', resp);
					})
					.then(resp_ => {
						function isResponse(r: void | Response): r is Response {
							return true;
						}
						if (!isResponse(resp_)) {
							console.error('response er ikke Response.', resp_);
							return;
						}
						const resp = resp_ as Response;
						return resp.json();
					})
					.then(json => {
						if (!('url' in json))
							throw new Error('Svar fra server er ikke object med url.');
						const url = json.url;
						window.location.assign(url);
					});
			}

		}
	}

	export function ShowKeybordHelpDialog() {
		const html = `
		<div>
<table class='ls-help-table'>
	<tr>
		<td>Alt+1</td>
		<td>
			Hop til andet sted på siden. Viser mærkater med genvejstaster for alle inputfelter, links og knapper.
		</td>
	</tr>
	<tr>
		<td>Alt+2</td>
		<td>
			Forlad fokus på inputfelt. Derefter kan piletaster m.m. igen bruges til at scrolle m.m..
		</td>
	</tr>
</table>
</div>
		`.trim();
		const hh = $(html);
		hh.dialog({
			title: 'Hjælp til brug af keyboard', buttons: {
				'Ok': () => hh.dialog('destroy').remove(),
			}
		});
	}

	/** Dette er "bind-global"-modulet. */
	function EnableGlobalCombokeys(Combokeys: any) {
		const globalCallbacks: any = {};
		const originalStopCallback = Combokeys.stopCallback;
		const originalUnbind = Combokeys.unbind;

		Combokeys.stopCallback = function (e: any, element: any, combo: any, sequence: any) {
			if (globalCallbacks[combo] || globalCallbacks[sequence]) {
				return false;
			}

			return originalStopCallback(e, element, combo);
		};

		Combokeys.bindGlobal = function (keys: string[] | string, callback: any, action: any) {
			this.bind(keys, callback, action);

			if (keys instanceof Array) {
				for (let i = 0; i < keys.length; i++) {
					globalCallbacks[keys[i]] = true;
				}
				return;
			}

			globalCallbacks[keys] = true;
		};

		Combokeys.unbind = function (keys: any, action: any) {
			originalUnbind.call(this, keys, action);

			if (keys instanceof Array) {
				for (let i = 0; i < keys.length; i++) {
					globalCallbacks[keys[i]] = false;
				}
				return;
			}

			globalCallbacks[keys] = false;
		};

		return Combokeys;
	}

	// Anvendes på sider hvor command-keybindings kan oedelaegge funktionaliteten evt. bogdepot
	export function ResetAllCommandKeyBinding() {
		ck?.reset();
	}
}
