import { GetKeys, LectioJSUtils } from './LectioJSUtils';


export namespace DomDumper {
	type ElementDumper = (element: HTMLElement) => string | null;

	export function GetElementDump(element: HTMLElement,
		dumpKind?: 'HeaderVariantAll' | 'JustElementName',
		includeMissingAttributes?: boolean,
		redactions?: { [key: string]: string }
	): string {
		let dumper: ElementDumper;
		switch (dumpKind) {
		case 'HeaderVariantAll':
			dumper = element => {
				const data = {
					variant: element.getAttribute('data-lc-header-variant'),
					displayHeaderInfo: element.getAttribute('data-lc-display-header-info'),
				};
				return SerializeElementDump(data, val => val,
					includeMissingAttributes == null ? false : includeMissingAttributes);
			};
			break;
		case 'JustElementName':
			dumper = element => {
				return SerializeElementDump({}, val => val,
					includeMissingAttributes == null ? false : includeMissingAttributes);
			};
			break;
		case undefined:
			dumper = GetElementLayoutDump;
			break;
		default: {
			const n: never = dumpKind;
			throw new Error('Ukendt dumpkind: ' + dumpKind);
		}
		}
		const lines: string[] = [];
		AppendElementLines(element, lines, 0, dumper, redactions ?? {});
		// Praktisk at have afsluttende linieskift ifbm. fx. git diff.
		if (lines.length > 0)
			lines.push('');
		return lines.join('\r\n');
	}

	function AppendElementLines(
		element: HTMLElement, lines: string[],
		level: number,
		dumpElementLocal: ElementDumper,
		redactions: { [key: string]: string }
	): void {
		if (level > 0) {
			let indent = '';
			for (let i = 0; i < level - 1; i++)
				indent += '\t';
			const elementDump = dumpElementLocal(element);
			const line = indent + element.localName + (elementDump ? ' ' + elementDump : '');
			lines.push(line);

			const texts: string[] = [];
			for (let n = element.firstChild; n = n; n = n.nextSibling) {
				if (!(n instanceof Text && n.nodeValue))
					continue;
				const str = n.nodeValue.trim();
				if (str)
					texts.push(str.length > 10 ? str.substr(0, 20) : str);
			}
			if (texts.length) {
				// Vil gerne beholde det paa een linie, saa vi fjerner/erstatter
				// tegn der kunne oedelaegge det.
				const nice = texts.join(' ... ').replace(/[\x00-\x19\u0800-\uffff]/g, '_').slice(0, 100);
				const nice2 = nice in redactions ? '[redacted: ' + redactions[nice] + ']' : nice;
				lines.push(indent + ' #text: ' + nice2);
			}
		}
		let c = element.firstElementChild;
		let childIdx = -1;
		let optionIdx = -1;
		while (c) {
			childIdx++;
			if (c instanceof HTMLElement) {
				AppendElementLines(c, lines, level + 1, dumpElementLocal, redactions);


				// FindSkemaAdv.aspx har (@0190910) nogle meeget lange
				// selection/option-lister.
				// Det er ikke saa interessant at faa ~5mb dumps af den slags,
				// saa forsoeger vi at
				// begraense det.
				if (c instanceof HTMLOptionElement) {
					optionIdx++;
				}
				if (childIdx >= 10 && optionIdx >= 10) {
					break;
				}
				if (childIdx > 100) {
					break;
				}
			}
			c = c.nextElementSibling;
		}
	}

	function SerializeElementDump<T extends {}>(data: T,
		transform: (val: string) => string | null,
		includeMissingAttributes: boolean
	): string | null {
		const arr: string[] = [];
		let hasAnyValues = false;
		for (const k of GetKeys(data)) {
			const val = data[k];
			if (!val && !includeMissingAttributes)
				continue;
			const str = val !== null ? transform(typeof val === 'string' ? val : (val as any).toString()) : null;
			const nullStr = "null";
			// Ideen her er at encode vaerdien ganske lidt, men nok til entydigt
			// og nemt at vide hvor vaerdien starter og stopper. Kunne godt
			// forestille mig at det bliver praktisk (20180307 RH).
			let enc: string;
			if (str === null) {
				enc = nullStr;
			}
			else if (str === '' || str === nullStr || /\s/.test(str)) {
				enc = JSON.stringify(str);
				if (enc.length !== 0 && enc[0] === '"')
					enc = '\'' + enc.substr(1, enc.length - 2) + '\'';
			}
			else {
				enc = str;
			}

			if (enc === nullStr) {
				if (!includeMissingAttributes)
					continue;
			}

			else
				hasAnyValues = true;
			arr.push(k.toString() + ': ' + enc);
		}

		return arr.length !== 0 ? arr.join(' ') : null;
	}

	function GetElementLayoutDump(element: HTMLElement): string {
		const cs = window.getComputedStyle(element);
		const br = element.getBoundingClientRect();

		function arrx(arr: (string | number)[]): string {
			return arr.map(s => (s === 0 ? '0' : s) || '??').join(' ');
		}

		const data = {
			margin: arrx([cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft]),
			padding: arrx([cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft]),

			boundingRect: arrx([br.width, br.height]),
		};
		const seri = SerializeElementDump(data,
			val => val.replace(
				/(\d+\.\d{2,})/g,
				m => (Math.round(parseFloat(m) * 100) / 100).toString()),
			true);
		return seri || '';
	}
}

/**
 * Denne klasse findes for at teste, i hvilke visninger af forloeb der bliver
 * vist hvad.
 * Det er lidt mere tricky at holde styr paa end man skulle tro.
 */
export namespace PhaseMatDumper {
	export function GetDump(): string {
		const tocc = document.querySelector('.ls-tocandcontentparent > *:nth-child(1)')
			?? LectioJSUtils.Throw("Fandt ikke toc container.");
		const tocSections = tocc.querySelectorAll('h2').map(h => h.innerText);

		const contentside = document.querySelector('.ls-tocandcontentparent > *:nth-child(2)')
			?? LectioJSUtils.Throw('Fandt ikke forloebsindhold.');

		const burgers = document
			.querySelectorAll('[data-role=button]')
			.filter(l => !!l.querySelector('img[src="/lectio/img/menu_burger.auto"]'))
			.reduce((agg, btn) => {
				const contains = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_CONTAINED_BY) !== 0
				const intoc = agg.intoc || contains(tocc, btn);
				const incontent = agg.incontent || contains(contentside, btn);
				const outside = agg.outside || !(intoc || incontent)

				return { intoc, incontent, outside };
			}, { intoc: false, incontent: false, outside: false });

		const hasActivities = !!contentside.querySelector('.ls-phase-activity-title');
		const hasActivitiesWithLinkHeaders = !!contentside.querySelector('.ls-phase-activity-title a[href]');
		const hasPhaseMat = !!contentside.querySelector('[data-lc-header-variant]');
		const hasSwup = !!contentside
			.querySelectorAll('[data-lc-header-variant="activity"]')
			.filter(h => {
				const cs = window.getComputedStyle(h, '::before');
				return !!cs.backgroundImage.match(/phase-send-to.auto/);
			})
			.length;
		const hasShowCancelledCb = !!document
			.querySelectorAll('label')
			.filter(l => l.innerText.trim().match(/(aflyste|ekskluderede)/i))
			.length
		const hasShareCb = !!document
			.querySelectorAll('label')
			.filter(l => l.innerText.trim().match(/Del/i))
			.length

		const lines: string[] = [];

		lines.push(`TOC-afsnit:`);
		lines.push(...tocSections); // "Aktiviteter" | "Quizzer" | ...

		lines.push('');
		lines.push(ff`TOC har knapper: ${!!tocc.querySelector('*[data-role="button"]')}`);
		lines.push(ff`TOC har checkbokse: ${!!tocc.querySelector('*[data-role="cb"]')}`);
		lines.push(ff`TOC har burgermenu: ${burgers.intoc}`);

		lines.push('');
		lines.push(ff`Indhold har aktiviteter: ${hasActivities}`);
		lines.push(ff`Indhold har aktiviteter m. overskriftslinks: ${hasActivitiesWithLinkHeaders}`);
		lines.push(ff`Indhold har fmat-afsnit: ${hasPhaseMat}`);
		lines.push(ff`Indhold har vis aflyste-cb: ${hasShowCancelledCb}`);
		lines.push(ff`Indhold har dele-cb: ${hasShareCb}`);
		lines.push(ff`Indhold har forloebsinfo: ${!!document.querySelector('#overview table')}`);
		lines.push(ff`Indhold har burgermenu: ${burgers.incontent}`);
		lines.push(ff`Indhold har checkbokse: ${!!contentside.querySelector('*[data-role="cb"]')}`);
		lines.push(ff`Indhold har kopierpile: ${!!contentside.querySelector('.ls-share-buttonicon')}`);
		lines.push(ff`Indhold har swup: ${hasSwup}`);
		lines.push('');
		lines.push(ff`Burgere andetsteds: ${burgers.outside}`);
		lines.push('');

		return lines.join('\n');
	}

	// overvejende aht. typesikkerhed.
	function ff(fmt: readonly string[], ...args: (string | boolean | number)[]): string {
		const arr: string[] = [];

		let idx = 0;
		for (; idx < fmt.length - 1; idx++) {
			arr.push(fmt[idx]);
			arr.push(args[idx] + '');
		}
		arr.push(fmt[idx] + '');

		return arr.join('');
	}
}
