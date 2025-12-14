import { Autocomplete } from "./Autocomplete";
import { CommandRegistry } from "./CommandRegistry";
import { GridStuff } from "./GridStuff";
import { GuiMisc } from "./GuiMisc";
import { LectioJSUtils, ReadWrite } from "./LectioJSUtils";

export namespace LectioPageCommands {
	function NavigateSchoolUrl(schoolUrl: string) {
		location.href = LectioJSUtils.GetBaseSchoolURL() + '/' + schoolUrl;
	}

	function RegisterBasicCommands() {
		if (true) {
			CommandRegistry.RegisterCommand({
				id: 'SayHi', title: 'hejsa', execute: () => {
					alert('hejsa');
				}
			});
		}
		const cmds: (ReadWrite<CommandRegistry.CommandDefinition> & { historyAfterAll?: true })[] = [
			{
				id: 'cleanCurrentPageUrl', title: 'Fjern unødige dele af sidens url', execute: () => {
					const cc = GuiMisc.LectioJump.CleanLectioLink(location.href);
					window.history.replaceState(window.history.state, window.document.title, cc);
				}
			},
			{
				id: 'showQuickNavigate',
				title: 'Vis hurtignaviger',
				execute: () => {
					const oo = document.getElementById("quickNavigateDiv");
					if (!oo)
						return;
					const inp = LectioJSUtils.GetAssertedType(oo.querySelector('.ac_input'), HTMLInputElement, 'HTMLInputElement');
					const templates = JSON.parse(oo.querySelector('*[data-role=link-templates]')!.textContent!.trim()) as {
						[type: string]: string
					};

					Autocomplete.OverrideSelect(inp.id, (args => {
						console.debug('select', args.key, args.text);
						const mmm = args.key.match(/^([A-Z]+)([0-9]+)$/);
						if (!mmm)
							throw new Error('aoiwejr');
						const type = mmm[1];
						const id = mmm[2];
						const template = LectioJSUtils.GetNotNullValue(templates[type]);
						const url = template.replace('666', id);
						$(oo).dialog('close');

						return { type: 'navigate', url: url };
					}));

					$(oo).dialog({
						height: 500,
						width: 500,
						open: () => {
							inp.blur();

							setTimeout(async () => {
								$("form#aspnetForm").append($(oo).parent());
								inp.focus();
								LectioJSUtils.LogDebug('qq: open')

								await Autocomplete.GetReadyPromise(inp.id);

								LectioJSUtils.LogDebug('qq: hasdata')

								// Aht. test.
								// #example Browsertest: Send event til en browsertest
								LectioJSUtils.DispatchBrowserTestEvent('quickNavigateShow', document.body);
							}, 250);
						}
					});
				}
			},
			{ id: 'showCommandSelector', title: 'Vis kommandovælger', execute: () => CommandRegistry.showCommandSelector() },
			{ id: 'showGridStuff', title: 'Vis grid-stuff', execute: ctx => GridStuff.showGridStuff(ctx), historyAfterAll: true },

			{ id: 'gotoUserFrontPage', title: 'Gå til forside', execute: () => NavigateSchoolUrl('forside.aspx') },
			{ id: 'gotoMacomLookup', title: 'Gå til macom lookup', execute: () => NavigateSchoolUrl('macom/lookup.aspx') },
			{ id: 'search', title: 'Søg i Lectio', execute: () => $('#s_m_searchinputfield').focus() },
			{ id: 'showKeyboardHelp', title: 'Vis hjælp til brug af keyboard', execute: CommandRegistry.ShowKeybordHelpDialog },
			{ id: 'showSetStudentIdsToBrowse', title: 'Indsaet student-id pr. linie eller kommasepareret list', execute: GuiMisc.ShowSetStudentIdsToBrowse },
			{ id: 'showDatabaseInfo', title: 'Vis databaseinfo', execute: GuiMisc.ShowDatabaseInfo },
			{ id: 'showTableFilter', title: 'Vis tabelfiltrering', execute: () => CommandRegistry.ExecuteCommand('TableSearch') },
			{ id: 'maximizeCurrentDialog', title: 'Maksimér dialog', execute: GuiMisc.CurrentDialogMaximize },
			{ id: 'executeRecent1', title: 'Genkør nylig 1', execute: () => CommandRegistry.ExecuteRecent(1, false) },
			{ id: 'executeRecent2', title: 'Genkør nylig 2', execute: () => CommandRegistry.ExecuteRecent(2, false) },
			{ id: 'executeRecent3', title: 'Genkør nylig 3', execute: () => CommandRegistry.ExecuteRecent(3, false) },
			{ id: 'executeRecent1ReuseArg', title: 'Genkør nylig 1, genbrug argument', execute: () => CommandRegistry.ExecuteRecent(1, true) },
			{ id: 'executeRecent2ReuseArg', title: 'Genkør nylig 2, genbrug argument', execute: () => CommandRegistry.ExecuteRecent(2, true) },
			{ id: 'executeRecent3ReuseArg', title: 'Genkør nylig 3, genbrug argument', execute: () => CommandRegistry.ExecuteRecent(3, true) },
			{ id: 'hideLeadingZeros', title: 'Erstat foranstillede nuller med blank', execute: () => replaceZeros() },

		];

		for (const def of cmds) {
			if (def.historyAfterAll !== true)
				def.skipAddToHistory = true;

			CommandRegistry.RegisterCommand(def);
		}

		type CommandBinding = {
			key: string;
			commmand: string;
		};
		const commandBindings: CommandBinding[] = [
			{ key: 'g f', commmand: 'gotoUserFrontPage' },
			{ key: '/', commmand: 'search' },
			{ key: '?', commmand: 'showKeyboardHelp' },
			{ key: 'o d', commmand: 'showDatabaseInfo' },
			{ key: 'o g', commmand: 'showGridStuff' },
			{ key: 'o t', commmand: 'showTableFilter' },
			{ key: 'o u', commmand: 'cleanCurrentPageUrl' },
			{ key: 'o c', commmand: 'showCommandSelector' },
			{ key: 'o m', commmand: 'maximizeCurrentDialog' },
			{ key: 'o l', commmand: 'gotoMacomLookup' },
			{ key: 'r 1', commmand: 'executeRecent1' },
			{ key: 'r 2', commmand: 'executeRecent2' },
			{ key: 'r 3', commmand: 'executeRecent3' },
			{ key: 'r r 1', commmand: 'executeRecent1ReuseArg' },
			{ key: 'r r 2', commmand: 'executeRecent2ReuseArg' },
			{ key: 'r r 3', commmand: 'executeRecent3ReuseArg' },
			{ key: 'alt+x', commmand: 'showQuickNavigate' },
		];

		for (const binding of commandBindings)
			CommandRegistry.RegisterCommandKeyBinding(binding.commmand, binding.key);
	}


	RegisterBasicCommands();
}

export const ReplaceText = (find: RegExp, replace: string) => {
	const desce = (n: Node): void => {
		if (n instanceof Element) {
			const ignore = n.nodeName === 'script';
			if (ignore)
				return;
			for (const child of n.childNodes) {
				desce(child);
			}
		}
		else if (n instanceof Text) {
			if (n.textContent?.match(find))
				n.textContent = n.textContent.replace(find, replace)
		}
	}
	desce(document.body);
};

const replaceZeros = () => ReplaceText(/\b0/g, '\u2007');
