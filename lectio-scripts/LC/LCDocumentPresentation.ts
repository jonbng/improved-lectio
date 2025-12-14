import { CssUtil, LectioCSSRule } from '../CssUtil';
import { LCDocumentPresentationAudioPlayer } from './LCDocumentPresentationAudioPlayer';
import { LectioJSUtils, LectioKeyCode } from '../LectioJSUtils';
import { HtmlUtilities } from "../HtmlUtilities";

type PresentationEventData = {
	Type: string,
	SlideNo: number;
};

/**
 * "pseudo" i "pseudo slide" henviser til at indhold mellem to slides (to
 * section-elementer) ogsaa repraesentere her.
 */
type PseudoSlideInfo = {
	readonly isRealSlide: true;
	readonly elementIndex: number;
} | {
	readonly isRealSlide: false;
	readonly elementStartIndex: number;
	readonly elementCount: number;
};

const SlideWidth = 600;
const SlideHeight = (3.0 / 4.0) * 600;
function GetSlideCssForView() {
	return {
		'overflow-y': 'auto',
		'overflow-x': 'hide'
	};
}


type PresentationCommand =
	'fullscreen_enter' |
	'navigate_previous' |
	'navigate_next';

export function GetConsecutive<TItem, TCategory>(
	items: ArrayLike<TItem>,
	selector: (item: TItem) => TCategory):
	({
		readonly startIndex: number,
		readonly count: number,
		readonly category: TCategory
	})[] {

	let current: TCategory | null = null;
	let startIndex = 0;
	const arr: ({ startIndex: number, count: number, category: TCategory })[] = [];
	for (let i = 0; i < items.length; i++) {
		const quotient = selector(items[i]);
		if (current !== null && quotient !== current) {
			arr.push({ startIndex: startIndex, count: i - startIndex, category: current });
			startIndex = i;
		}
		current = quotient;
	}

	if (items.length)
		arr.push({ startIndex: startIndex, count: items.length - startIndex, category: current! });

	return arr;
}

function GetPseudoSlideInfos(parent?: HTMLElement): readonly PseudoSlideInfo[] {
	let sectionCounter = 0;
	const conslist = GetConsecutive(parent!.children,
		e => {
			if (e instanceof HTMLElement && e.localName === 'section') {
				if (e.getAttribute('lec-slide-variant') === 'pseudo')
					return 'ignore';
				sectionCounter++;
				return sectionCounter % 2 === 0 ? 'sec-a' : 'sec-b';
			} else
				return 'non-section';
		});
	return conslist.
		filter(r => r.category !== 'ignore').
		map(r => {
			const isSection = r.category !== 'non-section';
			const info: PseudoSlideInfo = isSection ? { isRealSlide: true, elementIndex: r.startIndex }
				: { isRealSlide: false, elementStartIndex: r.startIndex, elementCount: r.count };
			return info;
		});
}

type Rectangle = { x: number, y: number, width: number, height: number };
type ContentRelativeBox = {
	position: 'right top',
} & Rectangle;

export function InstantiateContentRelativeBox(relativeTo: HTMLElement, box: ContentRelativeBox): Rectangle {
	// getBoundingClientRect giver padding box.
	const rect = relativeTo.getBoundingClientRect();
	const cs = window.getComputedStyle(relativeTo);

	const padLeft = parseInt(cs.paddingLeft || '0', 10);
	const padTop = parseInt(cs.paddingTop || '0', 10);
	const padRight = parseInt(cs.paddingRight || '0', 10);
	const padBottom = parseInt(cs.paddingBottom || '0', 10);

	switch (box.position) {
		case 'right top':
			return {
				x: rect.left + rect.width - padRight + box.x,
				y: rect.top + padTop + box.y,
				width: box.width,
				height: box.height,
			};
		default:
			const n: never = box.position;
			throw new Error('bad ContentRelativeBox.position: ' + box.position);
	}
}

export function RectangeContains(rect: Rectangle, x: number, y: number): boolean {
	if (!(x >= rect.x && x < rect.x + rect.width))
		return false;
	if (!(y >= rect.y && y < rect.y + rect.height))
		return false;
	return true;
}

export interface Katex {
	render: (tex: string, target: HTMLElement, options?: {}) => void;
	renderToString: (tex: string, options?: {}) => string;
}

const getkatex: () => Katex = () => (window as any)['katex'];
type KatexRenderResult<TData> = { type: 'ok', value: TData } | { type: 'error' };

function RenderKatexToElement(rawtex: string, ele: HTMLElement): KatexRenderResult<void> {
	const katex = getkatex();
	return RenderKatexToImpl(rawtex, (tex, options) => katex.render(tex, ele, options));
}

export function RenderKatexToString(rawtex: string): KatexRenderResult<string> {
	const katex = getkatex();
	return RenderKatexToImpl(rawtex, (tex, options) => katex.renderToString(tex, options));
}

type KatexRenderOptions = {

};

function RenderKatexToImpl<TReturn>(
	rawtex: string,
	impl: (tex: string, options: KatexRenderOptions) => TReturn
): KatexRenderResult<TReturn> {
	const tex = rawtex.match(/^\\\(/) ? rawtex.substr(2, rawtex.length - 4) : rawtex;

	let modtex: string | undefined = undefined;
	const warnAgg: (any[])[] = [];
	try {
		return {
			type: 'ok', value: impl(tex, {})
		};
	} catch (ex: any) {
		const smellsLikeAlign = !!ex.message.match(/No such environment: align\b/);
		if (smellsLikeAlign) {
			// Miljoet 'align' er ikke understoettet i katex (201902), og bliver det nok ikke.
			// Men det er nok ok, 'aligned' er understoettet, saa den proever vi at udskifte med.
			// https://github.com/KaTeX/KaTeX/issues/61
			// https://tex.stackexchange.com/questions/95402/what-is-the-difference-between-aligned-in-displayed-mode-and-starred-align
			// https://katex.org/docs/issues.html
			modtex = tex.replace(/{align}/g, '{aligned}');
			// Vi vil gerne undgaa at spamme konsollen, men beskeden kan vaere nyttig,
			// saa vi gemmer den til hvis der stadig er problemer.
			warnAgg.push(['Fejl fra KaTex, forsoeger at erstatte env align med aligned.', ex.message, tex]);
		}
		else {
			console.error("Fejl fra KaTex.", ex, tex);
			return { type: 'error' };
		}
	}

	try {
		return {
			type: 'ok', value: impl(modtex, {})
		};
	} catch (ex) {
		console.warn('Fejl fra KaTex efter tilretning af input.', ex, 'Advarselshistorik for denne formel:', warnAgg);;
	}

	return { type: 'error' };
}

export class LCDocumentPresentation {
	static AttachOnCopyIconClickListener(
		displayFragment: HTMLElement,
		handler: (args: { id: string }) => void
	): void {
		LectioJSUtils.AssertArgument(displayFragment instanceof HTMLElement, 'displayFragment instanceof HTMLElement');

		displayFragment.addEventListener('click', evt => {
			const target = evt.target;
			if (!(target instanceof HTMLElement))
				return;

			if (!(target.localName === 'h1' || target.localName === 'h2' || target.localName === 'h3'))
				return;

			const isAtRoot = target.parentElement === displayFragment;
			if (!isAtRoot)
				return;

			const box = InstantiateContentRelativeBox(target, {
				position: 'right top',
				x: -6,
				y: 0,
				width: 22,
				height: 22,
			});

			const isHit = RectangeContains(box, evt.x, evt.y);
			if (!isHit)
				return;
			const id = target.getAttribute('id');
			if (!id)
				throw new Error('rod-header uden ID?');
			LectioJSUtils.LogDebug('in box: ', isHit, box, evt);

			handler({ id: id });
		});
	}

	public static Init() {
		$(document).ready(() => {
			const css = GetSlideCssForView();
			const slides = $(".lc-document-slide");

			slides.css(css);
		});
	}

	public static Initialize() {
		const katex = getkatex();
		if (katex) {
			for (const ele of document.querySelectorAll<HTMLElement>('.lc-math-tex')) {
				RenderKatexToElement(ele.innerText, ele);
			}
		}

		LCDocumentPresentationAudioPlayer.Init();
	}

	public static GetAncestorSpacing(el: HTMLElement, depth?: number) {
		const cs = window.getComputedStyle(el);
		const rv = {
			tag: el.nodeName,
			class: el.className,
			paddingTop: cs.paddingTop,
			marginTop: cs.marginTop,
			height: cs.height,
		};
		const rest: (typeof rv)[] = el.parentElement && depth !== 0
			? this.GetAncestorSpacing(el.parentElement, depth ? depth - 1 : undefined)
			: [];
		return [...rest, rv];
	}

	public static InitializeDocument(presentationId: string): void {
		const alreadyExists = LCDocumentPresentation.currentSlideShows[presentationId];
		if (alreadyExists)
			throw new Error('Præsentationen er initaliseret.');

		const ss = new LCDocumentPresentation(presentationId);
		LCDocumentPresentation.currentSlideShows[presentationId] = ss;

		LCDocumentPresentation.SetSlideShowEnabled(presentationId, false);
		ss.SetFullScreenCommandState(false);

		window.addEventListener('message', msg => {
			if (msg.data && msg.data.area === 'LCDocumentPresentation') {
				const data = msg.data.data as PresentationEventData;
				const pres = LCDocumentPresentation.GetSinglePresentation();
				if (pres && pres.IsSlideMode()) {
					pres.ProcessIncoming(data);
				}
			}
		});
	}

	private SetFullScreenCommandState(isFullScreen: boolean) {
		if (isFullScreen) {
			this.topnavinner.show(0);
		} else {
			this.topnavinner.hide(0);
		}
	}

	private static SomethingIsFullScreen(): boolean {
		const ret = LCDocumentPresentation.GetFullScreenElement();
		return !!ret || $(document.body).hasClass('lc-display-maxview');
	}

	public static GetFullScreenElement(): Element {
		const ret = document.fullscreenElement
			|| (document as any)['mozFullScreenElement']
			|| (document as any).webkitFullscreenElement
			|| (document as any)['msFullscreenElement'];
		return ret;
	}

	private static fullScreenChangeSub: Rx.Subject<undefined> | null = null;
	private static fullScreenLeaveObs: Rx.Observable<undefined> | null = null;

	private static stylesheet: CSSStyleSheet;

	private UpdateFullScreenScale(): void {
		const canGoFullscreen = this.topnav.length !== 0;
		if (!canGoFullscreen) {
			// console.debug('LCDocumentPresentation.ts: Har ikke topnav - dropper fuldskaerm');
			return;
		}
		const unavailableHeight = this.topnav.height() as number;
		if (typeof unavailableHeight !== 'number') {
			LectioJSUtils.LogDebug('LCDocumentPresentation.ts: ikke tal?', unavailableHeight);
		}

		const width = window.innerWidth;
		const height = window.innerHeight;
		const slideBorderWidth = 1;
		const scaleX = (width - 2 * slideBorderWidth) / SlideWidth;
		const scaleY = (height - unavailableHeight) / SlideHeight;
		const scale = Math.min(scaleX, scaleY);

		let translateTransform = '';
		if (SlideWidth > width) {
			// Vi har sat skaleringen op til at ske med udgangspunkt i midten af
			// slides, saa hvis skaermen er smallere end standardslidebredden,
			// kommer slides til at staa horisontalt centreret paa
			// standardslidebredden, hvilket giver en uheldig venstremargin og
			// behov for at scrolle. Det korrigerer vi ved at rykke dem til
			// venstre.
			const translationAmount = (SlideWidth - width + slideBorderWidth) / 2 * -1;
			translateTransform = 'translateX(' + translationAmount + 'px)';
		}

		if (!LCDocumentPresentation.stylesheet)
			LCDocumentPresentation.stylesheet = CssUtil.CreateDynamicStylesheet('lc');
		const stylesheet = LCDocumentPresentation.stylesheet;
		const transformRuleContent = translateTransform + 'scale(' + scale + ')';
		let rules = stylesheet.rules || stylesheet.cssRules;

		for (let oldRuleIndex = rules.length - 1; oldRuleIndex >= Math.max(rules.length - 10, 0); oldRuleIndex--) {
			const rule = rules[oldRuleIndex] as LectioCSSRule;
			if (rule.selectorText.indexOf(this.presentationIdCons) !== -1) {
				stylesheet.deleteRule(oldRuleIndex);
			}
		}

		// I ikke-slidemode skalerer vi slides ned, når skærmbredden kræver det.
		// Men vi vil ikke skalere dem op.
		if (!this.IsSlideMode() && scale >= 1)
			return;

		// Safari mac opdaterer ikke rules.length, naar der ovenfor fjernes
		// regler. Derfor er denne gentildeling noedvendig.
		rules = stylesheet.rules || stylesheet.cssRules;

		// I fuldskaerm i ikke-slide-mode giver skalering afstand mellem
		// ikke-fuldhoejde-slides, og windows mobile 8 ie's scrollbar tror at
		// indholdet stadig er standard-slidebredde.
		// Det loeser zoom, men den har forskelligt fikspunkt i IE og webkit
		// (kan nok loeses med transform:translate), og fungerer ikke i firefox.
		const cssRuleSelector = '#' + this.presentationIdCons + '.lc-display-fullscreen section.lc-document-slide';
		const props = [
			'transform: ' + transformRuleContent,
			'-webkit-transform: ' + transformRuleContent
		];
		stylesheet.insertRule(cssRuleSelector + ' { ' + props.join('; ') + ' }', rules.length);
	}

	public ToggleFullscreen() {
		const fsEvents = 'webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange msfullscreenchange';

		if (!LCDocumentPresentation.fullScreenChangeSub) {
			LCDocumentPresentation.fullScreenChangeSub = new Rx.Subject();
			LCDocumentPresentation.fullScreenLeaveObs = LCDocumentPresentation.fullScreenChangeSub.where(_ => !LCDocumentPresentation.SomethingIsFullScreen());
			$(document).bind(fsEvents, e2 => {
				LCDocumentPresentation.fullScreenChangeSub!.onNext(undefined);
			});
		}

		// Enten bruger vi browser-api til fuldskaerm, eller ogsaa bruger vi
		// css. Ikke begge dele samtidigt.
		const browserHasFullscreenApi = ['requestFullscreen', 'msRequestFullscreen', 'mozRequestFullScreen', 'webkitRequestFullscreen', 'webkitRequestFullScreen', 'webkitEnterFullScreen']
			.filter(name => name in document.body).length !== 0;

		let fullScreenChangeSubscription: Rx.IDisposable | undefined;

		const enableFullScreenEnvironment = () => {
			this.SetFullScreenCommandState(true);

			this.presentation.addClass('lc-display-fullscreen');
			if (!browserHasFullscreenApi)
				$(document.body).addClass('lc-display-maxview');
			// IE (11) og chrome (43) returnerer ikke den fulde plads der er
			// tilgaengelig med det samme.
			// Blandt andet derfor lytter vi efter resize.
			// Derudover bruger vi resize-events til at haandtere at man skifter
			// orientering paa en tablet og lignende.

			this.UpdateFullScreenScale();

			// Endelig skalering:
			// - ved resize-event
			// - indtil man gaar ud af full screen.
			const stopSignal = LCDocumentPresentation.fullScreenLeaveObs!.take(1);

			Rx.Observable.fromEvent(window as any as Node, 'resize')
				.throttle(200)
				.takeUntil(stopSignal).subscribe(_ => this.UpdateFullScreenScale());
		};

		const disableFullScreenEnvironment = () => {
			this.SetFullScreenCommandState(false);

			this.presentation.removeClass('lc-display-fullscreen');
			$(document.body).removeClass('lc-display-maxview');
			if (fullScreenChangeSubscription)
				fullScreenChangeSubscription.dispose();
		};

		if (!LCDocumentPresentation.SomethingIsFullScreen()) {
			const onFullScreenChange = () => {
				const fullScreen = LCDocumentPresentation.SomethingIsFullScreen();

				if (fullScreen) {
					LCDocumentPresentation.SetSlideShowEnabled(this.presentationIdCons, true);
					enableFullScreenEnvironment();
				} else {
					disableFullScreenEnvironment();
					LCDocumentPresentation.SetSlideShowEnabled(this.presentationIdCons, false);
				}
			};

			fullScreenChangeSubscription = LCDocumentPresentation.fullScreenChangeSub.subscribe(onFullScreenChange);

			// const element = this.presentation[0];
			const element = this.presentation[0];
			const elementAny = element as any;
			if (!browserHasFullscreenApi) {
				enableFullScreenEnvironment();
			} else if (element.requestFullscreen) {
				element.requestFullscreen();
			} else if (elementAny.msRequestFullscreen) {
				elementAny.msRequestFullscreen();
			} else if (elementAny.mozRequestFullScreen) {
				elementAny.mozRequestFullScreen();
			} else if (elementAny.webkitRequestFullscreen) {
				elementAny.webkitRequestFullscreen(elementAny.ALLOW_KEYBOARD_INPUT);
			} else if (elementAny.webkitRequestFullScreen) {
				elementAny.webkitRequestFullScreen(elementAny.ALLOW_KEYBOARD_INPUT);
			} else if (elementAny.webkitEnterFullScreen) {
				elementAny.webkitEnterFullScreen(elementAny.ALLOW_KEYBOARD_INPUT);
			} else {
				throw new Error('Uventet fuldskaermshaandtering. SomethingIsFullScreen.');
			}

			// Soerg for at mellemrum, piletaster m.v. virker.
			this.presentation.focus();
		} else {
			const docany = document as any;
			if (!browserHasFullscreenApi) {
				disableFullScreenEnvironment();
			} else if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (docany.msExitFullscreen) {
				docany.msExitFullscreen();
			} else if (docany.mozCancelFullScreen) {
				docany.mozCancelFullScreen();
			} else if (docany.webkitExitFullscreen) {
				docany.webkitExitFullscreen();
			} else {
				throw new Error('Uventet fuldskaermshaandtering. !SomethingIsFullScreen.');
			}
		}
	}

	private static currentSlideShows: { [id: string]: LCDocumentPresentation } = {};

	public static GetSinglePresentation() {
		for (const p in this.currentSlideShows)
			return this.currentSlideShows[p];
		return null;
	}

	public static OpenProjectorWindow() {
		const pres = LCDocumentPresentation.GetSinglePresentation();
		if (!pres)
			return;

		const win = window.open(location.href, '', 'width=760,height=600');
		pres.projectorWindow = win;
	}

	public static SetSlideShowEnabled(presentationId: string, setEnabled: boolean) {
		const ss = LCDocumentPresentation.currentSlideShows[presentationId];
		if (!ss) {
			throw new Error('Ikke initialiseret.');
		}
		if (setEnabled) {
			LCDocumentPresentation.currentSlideShows[presentationId] = ss;
			ss.slideParent.addClass("lc-display-slidemode");
			ss.ShowSlide(0);
		} else
			ss.ExitSlideShow();

		ss.UpdateFullScreenScale();
	}

	private presentation: JQuery;
	/**
	 * Elementet der har har slides og "loest indhold" som boern.
	 */
	private slideParent: JQuery;
	private statusBar: JQuery;
	private topnav: JQuery;
	private topnavinner: JQuery;
	private topnavouter: JQuery;
	private slideControl: JQuery;
	private projectorWindow: Window | null = null;
	private presentationIdCons: string;

	private currentSlide: number = 0;

	constructor(presentationIdCons: string) {
		const presentation = $('#' + presentationIdCons);
		const slideParent = $("*[data-local-id=content]", presentation);

		this.presentationIdCons = presentationIdCons;
		this.presentation = presentation;
		this.slideParent = slideParent;

		const topnavouter = $('*[data-local-id=topnavouter]');
		const topnavinner = this.presentation.find('*[data-local-id=topnav]');

		if (topnavinner.length === 0) {
			console.debug(`Pres ${presentationIdCons}: Fandt ikke topnav - ingen knapper.`);
		}
		this.statusBar = topnavinner.find('*[data-local-id=navigation_page_status]');

		this.topnav = topnavinner.add(topnavouter);
		this.topnavouter = topnavouter;
		this.topnavinner = topnavinner;

		this.slideControl = this.presentation.find('*[data-local-id=slide_control]');

		this.topnav.on('click', '*[data-command]', event => {
			const cmd = event.currentTarget.getAttribute('data-command');
			switch (cmd) {
				case 'fullscreen_enter':
					this.ToggleFullscreen();
					setTimeout(() => LCDocumentPresentation.SetSlideShowEnabled(this.presentationIdCons, true), 100);
					break;
				case 'navigate_next':
					this.GoToNextSlide();
					break;
				case 'navigate_previous':
					this.GoToPreviousSlide();
					break;
				default:
					console.warn('Ukendt kommando "' + cmd + '".');
					return false;
			}

			event.preventDefault();
			event.stopPropagation();
			return true;
		});

		//this.presentation.on('mousewheel DOMMouseScroll', (e: JQueryInputEventObject, delta: number) => {
		// Venter med at kunne skift side med mus. Kraever at man stadig kan scrolle i slides med for meget indhold.
		//return true;
		//if (e.altKey || e.ctrlKey || e.shiftKey)
		//	return true;
		//if (delta > 0) {
		//	this.GoToPreviousSlide();
		//	e.preventDefault();
		//	return false;
		//} else {
		//	this.GoToNextSlide();
		//	e.preventDefault();
		//	return false;
		//}
		//return true;
		//});
		this.presentation.keydown(e => {
			// Bruger ikke pil op/ned og page up/down, fordi browsere bruger dem
			// til at navigere/scrolle med, og hverken slideshare eller
			// facebook bruger dem.
			switch (e.which) {
				//			case 33: //page up
				//			case 38: //up
				case LectioKeyCode.ESCAPE:
					{
						if (LCDocumentPresentation.SomethingIsFullScreen())
							this.ToggleFullscreen();

						e.preventDefault();
						return false;
					}
				case LectioKeyCode.LEFT:
					{
						if (!this.IsSlideMode()) {
							return false;
						}

						this.GoToPreviousSlide();
						e.preventDefault();
						return false;
					}

				//			case 34: //page down
				//			case 40: //down
				case LectioKeyCode.RIGHT:
					{
						if (!this.IsSlideMode()) {
							return false;
						}

						this.GoToNextSlide();
						e.preventDefault();
						return false;
					}
				default:
					return true;
			}
		});
	}

	private IsSlideMode(): boolean {
		return this.slideParent.hasClass("lc-display-slidemode");
	}

	private ExitSlideShow() {
		this.slideParent.removeClass("lc-display-slidemode");

		// Bruger visibility isf. display for at undgå at resten af knapperne
		// hopper rundt når knapperne kommer og går.
		this.slideControl.css('visibility', 'hidden');

		this.slideParent.removeClass('lc-presentation-content-slidemode');
	}

	private GetSlideCount(): number {
		return GetPseudoSlideInfos(this.slideParent.get(0)).length;
	}

	private IsFirstSlide(idx: number): boolean {
		return idx === 0;
	}

	private IsLastSlide(idx: number): boolean {
		return idx === this.GetSlideCount() - 1;
	}

	private GetSlideContent(idx: number): HTMLElement | DocumentFragment {
		const parent = this.slideParent.get(0);

		const infos = GetPseudoSlideInfos(parent);
		if (idx < 0 || idx >= infos.length)
			throw new Error('grimt indeks');
		const info = infos[idx];
		if (info.isRealSlide) {
			const section = parent!.children[info.elementIndex];
			if (!(section instanceof HTMLElement && section.localName === 'section'))
				throw new Error('ikke section.');
			return section;
		}

		// ok, vi skruer et fragment sammen af kloner af elementer.
		const f = document.createDocumentFragment();
		for (let i = info.elementStartIndex; i < info.elementStartIndex + info.elementCount; i++) {
			const ele = parent!.children[i];
			f.appendChild(ele.cloneNode(true));
		}
		return f;
	}

	private ShowSlide(idx: number) {
		this.slideParent.children('section[lec-slide-variant]').remove();
		this.slideParent.children('section').css('display', '');
		this.slideControl.css('visibility', '');

		const wholeSlideContent = this.GetSlideContent(idx);
		const isRealSlide = wholeSlideContent instanceof HTMLElement;
		if (isRealSlide)
			this.slideParent.addClass('lc-display-has-slide');
		else
			this.slideParent.removeClass('lc-display-has-slide');

		let slide: HTMLElement;
		if (wholeSlideContent instanceof HTMLElement) {
			slide = wholeSlideContent;
		} else {
			const parent = this.slideParent.get(0);
			const section = document.createElement('section');
			section.setAttribute('lec-slide-variant', 'pseudo');
			section.appendChild(wholeSlideContent);
			if (parent)
				parent.appendChild(section);
			slide = section;
		}

		slide.style.display = 'inherit';
		this.statusBar.html((idx + 1) + " / " + this.GetSlideCount());
		this.currentSlide = idx;

		const isFirstSlide = this.IsFirstSlide(idx);
		const isLastSlide = this.IsLastSlide(idx);
	}

	private Navigate(newSlide: number): void {
		this.ShowSlide(newSlide);
	}

	private IsCommandAvailable(cmd: PresentationCommand) {
		const ele = this.topnav.find('*[data-command=' + cmd + ']');
		if (ele.length === 0)
			console.warn('Kommando ' + cmd + ' ikke fundet.');
		ele.parent().is(':visible');
	}

	private SetCommandVisibility(cmd: PresentationCommand, visible: boolean) {
		const ele = this.topnav.find('*[data-command=' + cmd + ']');
		if (ele.length === 0)
			console.warn('Kommando ' + cmd + ' ikke fundet.');
		ele.parent().css('visibility', visible ? '' : 'hidden');
	}

	private SetCommandDisplay(cmd: PresentationCommand, display: boolean) {
		const ele = this.topnav.find('*[data-command=' + cmd + ']');
		if (ele.length === 0)
			console.warn('Kommando ' + cmd + ' ikke fundet.');
		ele.parent().css('display', display ? '' : 'none');
	}

	private GoToPreviousSlide(skipPublish: boolean = false): void {
		if (this.IsFirstSlide(this.currentSlide))
			return;

		this.Navigate(this.currentSlide - 1);
		if (!skipPublish)
			this.Publish({ Type: 'GoToSlide', SlideNo: this.currentSlide });
	}

	private GoToNextSlide(skipPublish: boolean = false): void {
		if (this.IsLastSlide(this.currentSlide))
			return;

		this.Navigate(this.currentSlide + 1);
		if (!skipPublish)
			this.Publish({ Type: 'GoToSlide', SlideNo: this.currentSlide });
	}

	private ProcessIncoming(data: PresentationEventData) {
		switch (data.Type) {
			case 'GoToSlide':
				const slideno = data.SlideNo;
				if (!this.IsSlideMode())
					break;
				this.Navigate(slideno);
				break;
			default:
				console.warn('Ukendt: ' + data.Type);
		}
	}

	private Publish(data: PresentationEventData) {
		const d = { area: 'LCDocumentPresentation', data: data };
		LectioJSUtils.LogDebug('Publish', d);
		if (window.opener && !window.opener.closed) {
			window.opener.postMessage(d, location.origin);
		}
		if (this.projectorWindow && !this.projectorWindow.closed) {
			this.projectorWindow.postMessage(d, location.origin);
		}
	}
}
