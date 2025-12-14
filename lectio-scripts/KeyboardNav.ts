import { CommandRegistry, LectioKeyCode } from "./lectiolib";
import { LectioJSUtils } from "./LectioJSUtils";
import { LectioContextMenu } from "./LectioContextMenu";

export class KeyboardNav {
	static Initialize() {
		$(document.body).on('keydown', e => {
			if (e.altKey || e.ctrlKey)
				return;
			const inp = $(e.target);
			if (!inp.is(':input'))
				return;

			// Hvis vi står i et grid, vil vi gerne gå til næste række, uagtet
			// om der er indre tabeller.
			// Hvis vi ikke står i et grid, vil vi gerne gå til næste række i
			// den inderste tabel.
			// Masseredigering af lønposter er god at teste med.
			let path = inp.parentsUntil('table.lf-grid');
			if (path.get(-1)!.tagName.toUpperCase() === 'HTML') {
				path = inp.parentsUntil('.lf-keyboardnav');
				if (path.get(-1)!.tagName.toUpperCase() === 'HTML')
					return;
			}

			const tbody = path.get(-1) as HTMLTableSectionElement;
			const tr = path.get(-2) as HTMLTableRowElement;
			const td = path.get(-3) as HTMLTableCellElement;

			let rowDelta: number;
			let isArrow = false;
			switch (e.which) {
			case LectioKeyCode.ENTER:
				rowDelta = e.shiftKey ? -1 : 1;
				break;
			case LectioKeyCode.DOWN:
				rowDelta = 1;
				isArrow = true;
				break;
			case LectioKeyCode.UP:
				rowDelta = -1;
				isArrow = true;
				break;
			default:
				return;
			}

			// Visse inputtyper scroller siden, når der bruges piletaster. Det
			// bør de stadig gøre.
			if (isArrow && (inp.is(':checkbox') || inp.is(':radio')))
				return;

			// Piletaster åbner combobokse.
			if (isArrow && (inp.is('select') || inp.is('option')))
				return;

			// Både enter og piletaster har en udmærket funktion i textarea...
			if (inp.is('textarea'))
				return;

			// Forhindr den i at blive til en keypress, som vil foraarsage
			// postback (for enters vedkommende). Goer det uanset om vi kan
			// rykke, for at en raekke hvorfra vi ikke kan rykke laengere ikke
			// opfoerer sig anderledes.
			e.preventDefault();

			if (tr.rowIndex + rowDelta < tbody.rows.length && tr.rowIndex + rowDelta >= 0) {
				const nextRow = (tbody.parentElement! as HTMLTableElement).rows[tr.rowIndex + rowDelta];

				// Håndtering af grupperingskolonner: Forventer at de er ude til
				// venstre, så flg. simple celleindeksdelta er nok.
				const cellIndexDelta = nextRow.cells.length - tr.cells.length;

				if (td.cellIndex + cellIndexDelta >= nextRow.cells.length)
					return;
				const sameColCell = nextRow.cells[td.cellIndex + cellIndexDelta];

				const ele = inp!.get(0);
				if (!ele)
					return;

				// søge efter samme inputfelt i den valgte række i tilfælde af
				// flere kontroller. Det gør vi ud fra dens indeks.
				const inputIndex = $(td).find(':input').indexOf(ele);
				const inputCandidates = $(sameColCell).find(':input');
				const nextInput = inputCandidates.get(inputIndex);

				if (!nextInput)
					return;

				// Burde sørge for at den ikke havner nedenunder gem-knapperne.
				$(nextInput)!.focus();
			}

			// Stregkodescanneren slås lidt med os her: Den har behov for at få
			// enter-tasten, som vi her ikke opdager kommer fra scanneren, men
			// æder blot event-en. Derfor orienterer vi den her, så den
			// alligevel kan reagere.
			inp.trigger('KeyboardNavEnterSuppressed');
		});
	}
}

function* nextkey() {
	const twoChordSets = 5;
	const alpha = 'hkyuopnm,qwertzxcvbasdgjf';
	for (const k1 of alpha.slice(0, alpha.length - twoChordSets))
		yield k1;
	for (let i = 0; i < twoChordSets; i++) {
		for (const k2 of alpha)
			yield alpha[alpha.length - (i + 1)] + k2;
	}
}

enum KeyModifier {
	SHIFT = 1 << 0,
	ALT = 1 << 1,
	META = 1 << 2,
	CTRL = 1 << 3,
}
function GetKeyModifiers(e: KeyboardEvent): KeyModifier | 0 {
	let mod: KeyModifier | 0 = 0;
	// let mod = null satisfies KeyModifier | null;
	if (e.shiftKey)
		mod = (mod ?? 0) || KeyModifier.SHIFT;
	if (e.altKey)
		mod = (mod ?? 0) || KeyModifier.ALT;
	if (e.metaKey)
		mod = (mod ?? 0) || KeyModifier.META;
	if (e.ctrlKey)
		mod = (mod ?? 0) || KeyModifier.CTRL;
	return mod;
}

type EMAction = 'click' | 'cc' | { type: 'openwin', url: string };

const startEasyMotion = (mode: 'default' | 'extended') => {
	// const selectors: string[] = '.lf-grid'.split(',');
	const selectors: string[] = 'input,textarea,select,a,img[data-role=cb],*[islandHeaderContainer],.lf-grid'.split(',');
	// const selectors: string[] = 'input,textarea,select,a,img[data-role=cb]'.split(',');
	if (mode === 'extended')
		selectors.push('*[data-lectiocontextcard]');

	const vis = document
		.querySelectorAll<HTMLElement>(selectors.join(','))
		.filter(i => {
			// a-elementer der blot markerer et sted paa siden, er det ikke sikkert
			// at vi vil have knap paa. Sker paa afsnitsoverskrifter i
			// forloebsmaterialevisning.
			if (i instanceof HTMLAnchorElement && i.firstChild === null)
				return false;
			const cs = window.getComputedStyle(i);
			const seemsvisible = cs.display !== 'none'
				&& !i.getAttribute('aria-hidden')
				&& i.offsetParent !== null // betyder ikke-synlig.
				&& i.className.indexOf('hidetabinputbutton') === -1;

			// Disablede elementer filtreres ikke fra her. Se laengere nede under
			// tildeling af genvejstaster.
			if (!seemsvisible)
				return false;
			const isdatepicker = $(i).parents('.ui-datepicker').length !== 0;
			if (isdatepicker)
				return false;
			const iseditortoolbar = $(i).parents('.cke_toolbar').length !== 0;
			if (iseditortoolbar)
				return false;
			return true;
		});

	const makeContainerPredicate = (container: Element) => (ele: Element) =>
		(ele.compareDocumentPosition(container) & Node.DOCUMENT_POSITION_CONTAINS) !== 0;
	// burde ogsaa tjekke horisontal placering.
	const inview = vis
		.filter(i =>
			i.getBoundingClientRect().top >= 0 &&
			i.getBoundingClientRect().top < window.outerHeight - 20);

	const filtered = inview;

	// Det vurderes at de foerste input-felter i "indholdet" ofte er dem man vil
	// hen til.
	// Hvad er resten? Knapperne i toppen af siden.
	const contentAncestors = document.querySelectorAll('.ls-master-pageheader, #contenttable')
		.map(el => makeContainerPredicate(el));
	if (contentAncestors.length) {
		const isInTab = (ele: HTMLElement) => {
			for (const pred of contentAncestors) {
				if (pred(ele))
					return true;
			}
			return false;
		};
		filtered.sort((x, y) => (isInTab(x) ? 0 : 1) - (isInTab(y) ? 0 : 1));
	}

	const key2ele = createKeysAndLabelElements(filtered);

	const keyhist: string[] = [];
	const keydown = (kevt: KeyboardEvent) => {
		if (kevt.key === 'Escape') {
			// "Escape", "Meta" o.l. isf. "k" o.l..
			endKeyParty();
		}
	};


	const keypress = (kevt: KeyboardEvent) => {
		keyhist.push(kevt.key.toLowerCase());
		const strhist = keyhist.join('');
		const item = key2ele[strhist];
		if (!item) {
			const canBeCompleted = Object
				.keys(key2ele)
				.filter(key => key.startsWith(strhist)).length !== 0;
			if (canBeCompleted)
				kevt.preventDefault();
			else
				endKeyParty();
			return;
		}

		const remainAfterAction = true;
		kevt.preventDefault();

		const element = item.input;
		const actions: EMAction[] = [];
		{
			const hasContextCard = (element: HTMLElement) =>
				$(element).is('*[data-lectiocontextcard]');

			let a1: EMAction | null;
			if (item.input instanceof HTMLInputElement)
				a1 = 'click';
			else if (item.input instanceof HTMLButtonElement || item.input instanceof HTMLAnchorElement
				|| item.input instanceof HTMLSelectElement || item.input instanceof HTMLTextAreaElement)
				a1 = 'click';
			else if (item.input instanceof HTMLImageElement &&
				$(item.input).is('img[data-role=cb]'))
				a1 = 'click';
			else
				a1 = null;
			if (a1)
				actions.push(a1);

			const href =
				element instanceof HTMLAnchorElement &&
					element.href.match(/^https:/)
					? element.href
					: null;
			if (href)
				actions.push({ type: 'openwin', url: href })

			if (hasContextCard(item.input) || (
				item.input instanceof HTMLInputElement &&
				LectioContextMenu.IsContextCardLectioDropdown(item.input)))
				actions.push('cc');
		}

		switch (GetKeyModifiers(kevt)) {
		case KeyModifier.SHIFT: {
			const [a1, a2] = actions;
			if (a2)
				doAction(a2, element);
			else if (a1)
				doAction(a1, element);
			break;
		}
		case 0:
			if (actions.length)
				doAction(actions[0], element);
			break;
		default:
			// Det kan vaere problematisk at bruge de andre modifiers til at
			// justere vores opfoersel, for de konflikter nemt med
			// eksisterende lectio- og browser-genvejstaster.
			break;
		}

		endKeyParty();
		item.label.remove();
		if (!remainAfterAction)
			startEasyMotion(mode);
	};

	window.addEventListener('keypress', keypress, { capture: true });
	window.addEventListener('keydown', keydown);
	const endKeyParty = () => {
		window.removeEventListener('keypress', keypress);
		window.removeEventListener('keydown', keydown);
		for (const key in key2ele)
			key2ele[key]!.label.remove();
	};
}

function createKeysAndLabelElements(elements: HTMLElement[]): {
	[shortcut: string]: ({ label: HTMLElement, input: HTMLElement } | null)
} {
	const key2ele: {
		[shortcut: string]: ({
			label: HTMLElement, input: HTMLElement
		} | null)
	} = {};

	// Tildel genvejstaster.
	const keygen = nextkey();
	let count = 0;
	for (const inp of elements) {
		count++;
		const keyenum = keygen.next();
		if (keyenum.done) {
			console.warn('enum done?? count=' + count);
			break;
		}
		const shortcut = keyenum.value;

		// Vil gerne have at fanebladsgenvejstaster er nogenlunde stabile, saa
		// for at undgaa at de skifter ift. nuvaerende faneblad optager
		// disablede elementer her en genvejstast, uanset om genvejstasten pt.
		// kan bruges.
		const isDisabled = inp.getAttribute('disabled') === 'disabled';
		if (isDisabled)
			continue;

		// Brug span isf. fx div, saa browseren ikke gaar i spaaner for de
		// knapper der ligger i spans.
		const label = document.createElement('span');
		// Store bogstaver, for det kan vaere svaert at se forskel paa fx. l, j
		// og i, saerligt naar de kombineres med andre bogstaver.
		label.innerText = shortcut.toUpperCase();
		label.className = 'ls-nav-motion';

		// labels til links direkte i td-elementer kommer til at staa
		// lidt for langt nede (1.2em margin-top), hvis vi ikke tilpasser
		// det lidt her.
		if (inp instanceof HTMLAnchorElement && inp.parentElement instanceof HTMLTableCellElement)
			label.setAttribute('ls-nav-label-hint', 'a-in-td');
		else {
			const cs = window.getComputedStyle(inp);
			if (cs.position === 'absolute') {
				// Antager at det er en skemabrik. Vi er i forvejen absolut pos,
				// saa arver bare top og left fra brikken.
				label.style.top = cs.top;
				label.style.left = cs.left;
			}
		}

		// I tab headers saetter vi dem ind i a-elementet, for at de bliver vist
		// korrekt ved headeren: Det kraever en ancestor der er
		// ikke-position-static eller ikke-display-inlieller
		// ikke-display-inline-block.
		if (inp.parentElement!.parentElement!.classList.contains('lectioTabToolbar'))
			inp.appendChild(label);
		else
			inp.parentElement!.insertBefore(label, inp);

		key2ele[shortcut] = { label: label, input: inp };
	}

	return key2ele;
}


const doAction = (action: EMAction, element: HTMLElement) => {
	// For tjekbokse i det mindste, vil vi gerne baade have fokus og trykket.
	// Med fokus kan man tabbe sig direkte til det foerste input-felt efter
	// tjekboksen.
	element.focus();
	switch (action) {
	case 'click':
		element.click();
		break;
	case 'cc':
		triggerContextMenuEvent(element);
		break;
	default:
		if ('type' in action) {
			switch (action.type) {
			case 'openwin':
				window.open(action.url);
				break;
			default:
				LectioJSUtils.AssertNever(action.type, 'action.type');
				break;
			}
			break;
		}
		LectioJSUtils.AssertNever(action, 'action');
		break;
	}
}

function triggerContextMenuEvent(element: HTMLElement) {
	const cs = element.getBoundingClientRect();
	// "+5" eller lignende er noedvendigt for kontekstkort paa subnav-elevnavne:
	// Hvis den ikke er der, siger elementFromPoint i contextcard at klikket
	// sker paa elev-billed-container-elementet.
	const clientX = cs.left + 5;
	const clientY = cs.top + 5;
	const pagey = cs.top + document.defaultView!.scrollY;
	const pagex = cs.left + document.defaultView!.scrollX;
	if (document.createEvent) {
		const ev = document.createEvent('HTMLEvents');
		ev.initEvent('contextmenu', true, false);
		const aev = ev as any;
		aev.pageX = pagex;
		aev.pageY = pagey;
		aev.clientX = clientX;
		aev.clientY = clientY;
		element.dispatchEvent(ev);
	}
}

$(() => {
	CommandRegistry.RegisterCommand({
		id: 'navigation.easymotion',
		title: 'EasyMotion',
		execute: () => {
			const ae = document.activeElement;
			if (ae instanceof HTMLInputElement)
				ae.blur();
			setTimeout(() => {
				startEasyMotion('default');
			}, 10);
		},
		skipAddToHistory: true
	}, 'alt+1');

	CommandRegistry.RegisterCommand({
		id: 'navigation.easymotionEx',
		title: 'EasyMotion med flere knapper',
		execute: () => {
			const ae = document.activeElement;
			if (ae instanceof HTMLInputElement)
				ae.blur();
			setTimeout(() => {
				startEasyMotion('extended');
			}, 10);
		},
		skipAddToHistory: true
	}, 'shift+alt+1');

	CommandRegistry.RegisterCommand({
		id: 'blur',
		title: 'Forlad fokus',
		execute: () => {
			const ae = document.activeElement;
			if (ae instanceof HTMLSelectElement
				|| ae instanceof HTMLTextAreaElement
				|| ae instanceof HTMLInputElement)
				ae.blur();
		},
		skipAddToHistory: true
	}, 'alt+2');
});