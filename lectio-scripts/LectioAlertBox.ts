import { LectioJSUtils } from "./LectioJSUtils";


export class LectioAlertBox {
	public static ShowAlerts = ShowAlerts;
	public static RegisterAlerts = RegisterAlerts;
}

function RegisterAlerts(divhtml: string, useBrowserAlert: boolean): Promise<undefined> {
	// Skal først vise efter WebForm_RestoreScrollPosition, der kører onload.
	const d = LectioJSUtils.CreateDeferred();
	const startIt = () => {
		setTimeout(() => {
			ShowAlerts(divhtml, useBrowserAlert).
				then(() => d.resolve(undefined));
		}, 10);
	};
	// flg. aht. updatepanel
	if (document.readyState === "complete")
		startIt();
	else
		$(window).ready(startIt);
	return d.promise();
}

type AlertLine = {
	readonly variant: 'unk',
	readonly content: string
} | {
	readonly variant: 'method',
	readonly fqMethod: string,
	readonly typeAndMethod: string,
	readonly typeAndMethodPrefix: string,
	typeAndMethodPostfix: string,
	group?: string,
};

function CompressStackTrace(lines: readonly AlertLine[]) {
	// Proev af bestemme en gruppe for hver linie.
	const lines2 = lines.map(line => {
		if (line.variant === 'unk')
			return line;
		const pmatch = [
			{ p: 'Oracle.DataAccess', g: 'OraCthulhu' },
			{ p: 'OpenDataReader', g: 'OpenDataReader' },
			{ p: 'OracleUtility.Execute', g: 'OpenDataReader' },
			{ p: 'DatabaseConnector', g: 'DatabaseConnector' },
		].filter(({ p, g }) => line.fqMethod.indexOf(p) !== -1)[0];
		if (!pmatch)
			return line;
		line.group = pmatch.g;
		return line;
	});

	// Pak sekvenser af stack frames med gruppe i een linie, og fjern gentagelser.
	const linesAndGroups: (AlertLine | { variant: 'grouplist', grouplist: string[] })[] = [];
	for (const al of lines2) {
		switch (al.variant) {
		case 'unk':
			linesAndGroups.push(al);
			break;
		case 'method': {
			if (!al.group) {
				linesAndGroups.push(al);
				break;
			}
			if (!linesAndGroups.length) {
				linesAndGroups.push({ variant: 'grouplist', grouplist: [al.group] });
				break;
			}

			const last = linesAndGroups[linesAndGroups.length - 1];
			if (last.variant === 'grouplist') {
				if (last.grouplist[last.grouplist.length - 1] !== al.group)
					last.grouplist.push(al.group);
			}
			else {
				linesAndGroups.push({ variant: 'grouplist', grouplist: [al.group] });
			}
			break;
		}
		default:
			LectioJSUtils.AssertNever(al, 'al');
		}
	}
	const lines3 = linesAndGroups.map<AlertLine>(linex => {
		if (linex.variant == 'grouplist')
			return { 'variant': 'unk', content: '[' + linex.grouplist.join(' ← ') + ']<br/>' };
		if (linex.variant === 'unk')
			return linex;
		// fjern argumentlisten, den er ikke saa interessante.
		const argpart = linex.typeAndMethodPostfix.match(/^\([^)]+\)(.*)/);
		if (argpart) {
			linex.typeAndMethodPostfix = '()' + argpart[1];
		}
		return linex;
	});

	return lines3;
}


function ShowAlerts(divhtml: string, useBrowserAlert: boolean): Promise<undefined> {
	const getregexp = (re: RegExp) => {
		const ss = re.toString();
		return ss.substr(1, ss.length - 2);
	};

	const idPartRE = getregexp(/(?:(?:<\.\w+>)|\w|(?:[<][\w.>])|[>[\]`])+/);

	{
		// Lidt test...
		const idmulti = new RegExp(idPartRE, 'g');
		const eqq = (exp: string, inp: string) => {
			if (exp !== (inp.match(idmulti) || [])!.join(' '))
				throw new Error('exp=' + exp + ", act=" + inp);
		}
		eqq('Macom SomeClass method1', 'Macom.SomeClass.method1');
		eqq('Macom SomeClass Method1[TReturn]', 'Macom.SomeClass.Method1[TReturn]');
		eqq('Macom SomeClass Method1`3', 'Macom.SomeClass.Method1`3');
		eqq('Macom SomeClass <>c <.cctor>b__48_0', 'Macom.SomeClass.<>c.<.cctor>b__48_0');
		// Hvis '<' kan genkendes som id-part, kan ovenstaaende grimme cctor-navn nemt blive
		// genkendt som to separate id-parts nedenfor.
		eqq('', '<');
	}

	// Opdel html i linier, og lav lidt parsning af dem der ligner stack frames.
	const stackFrameRE = new RegExp(`^([ \\w]+ )((?:${idPartRE}\\.)*)(${idPartRE})(\\(.+)`);
	const lines = divhtml.split(/\r?\n/).map<AlertLine>(line => {
		// laeser linien html-encoded, og '<' og '>' indgaaar i nogle typenavne.
		const maybetext = line.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
		const match = maybetext.match(stackFrameRE);
		if (!match)
			return { variant: 'unk', content: line };
		const [, prequal, qual, name, post] = match;
		return {
			variant: 'method',
			fqMethod: qual + name,
			typeAndMethod: name,
			typeAndMethodPrefix: prequal + qual,
			typeAndMethodPostfix: post,
		};
	});

	// const finalLines = lines;
	const finalLines = CompressStackTrace(lines);
	const prettyfied = finalLines
		.map<string>(alertline => {
			if (alertline.variant === 'unk')
				return alertline.content;
			return '<div class="ls-alertbox-stacktraceline">' + alertline.typeAndMethodPrefix
				+ '<strong>' + alertline.typeAndMethod.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</strong>'
				+ alertline.typeAndMethodPostfix
				+ '</div>';
		})
		.join('\r\n');

	const container = $(prettyfied).appendTo("body");
	const children = container.children();
	let i = 0;

	function showHtmlAlert(dialogElement: JQuery) {
		// Max-width should be document size for mobile phones
		let width = $(document).width() as number - 40;  //
		if (width > 560)
			width = 560;

		dialogElement.css({
			'text-align': 'left',
			'max-width': width + 'px',
			'min-width': '340px',
		});

		dialogElement.dialog({
			title: dialogElement.attr('data-title'),
			appendTo: '#aspnetForm',
			modal: true,
			width: 'auto',
			height: 'auto',
			buttons: {
				"Ok": () => {
					dialogElement.dialog('close');
				}
			},
			close: () => {
				dialogElement.dialog('destroy').remove();
				showNext();
			},
			open: e => {
				if (!e.target)
					throw new Error('e.target mangler.');
				const $etarget = $(e.target).parent();
				const btns = $etarget.find('button');
				const btn = btns.filter(':contains("Ok")');
				setTimeout(() => btn.focus(), 100);

				$etarget.keypress(eo => {
					if (eo.keyCode === 13) {
						btn.click();
					}
				});

				CopyToClipboardFromAlertBox($etarget, btn);
			}
		});

		//STM 24831. This needs to be set after .dialog() to take effect (as of 29/10-2014)
		dialogElement.css('max-height', '70vh');
		//setTimeout(() => dialogElement.focus(), 60); // tvinger focus på dialogen men først efter 60 ms, da sidens autofocus har et delay på 60ms

		//STM 32630 Indholdet kunne nogle gange være stort, så det rykkede den "ydre" dialog ud af skærmbilledet
		dialogElement.dialog('widget').position({
			'my': 'center',
			'at': 'center',
			'of': window,
		});
	}

	function CopyToClipboardFromAlertBox($t: JQuery<HTMLElement> | JQuery<EventTarget>, b: JQuery) {
		const $g = $("<div class='ui-dialog-copyclipboard'><a href='#'>Kopier</a></div>");
		const c = $t.find('div#ui-id-1').text();
		$g.click(() => {
			try {
				LectioJSUtils.CopyStringToClipboard(c);
				window.alert('Dataene er nu kopieret til udklipsholderen og kan indsættes.');
			} catch (e) {
				window.alert(e);
			}
		});

		if (c.length > 1000) {
			const $c = b.parent().parent();
			$g.appendTo($c);
		}
	}

	function showBrowserAlert(dialogElement: JQuery) {
		const title = dialogElement.attr('data-title');
		const body = dialogElement.text();

		alert(title + '\n\n' + body);
		showNext();
	}

	const alertImpl = useBrowserAlert ? showBrowserAlert : showHtmlAlert;

	const def = LectioJSUtils.CreateDeferred<undefined>();

	function showNext() {
		if (i >= children.length) {
			def.resolve(undefined);
			return;
		}
		const dialogElement = $(children[i]);
		i++;
		alertImpl(dialogElement);
	}

	showNext();

	container.remove();

	return def.promise();
}

