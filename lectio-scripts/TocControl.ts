/// <reference types="jquery"/>
/// <reference types="modernizr"/>
/// <reference types="bootstrap"/>

import 'rx-lite';
import { LectioFeatureDetection } from './LectioFeatureDetection';
import { LectioJSUtils } from './LectioJSUtils';

export namespace TocControl {

	function IE11IsDoubleInitialization(element: HTMLElement): boolean {
		// Beskyttelse mod dobbelt initialisering i materialevaelger i IE 11. Sker ikke konsekvent...
		const attrib = 'lec-nodoubleinit';
		if (element.getAttribute(attrib))
			return true;
		element.setAttribute(attrib, 'si');
		return false;
	}

	export function InitializeTocExpansion(containerSelector: string): void {
		const tocContainer = document.querySelector<HTMLElement>(containerSelector);
		if (!tocContainer)
			throw new Error('TOC container findes ikke. Selector: ' + containerSelector);

		if (IE11IsDoubleInitialization(tocContainer))
			return;

		$(containerSelector).on('click', '[data-role=toggle-expansion]', function (evt) {
			const $this = $(this);
			const container = $this.parents('.ls-materialboxToc-section-header').next();
			const menus = container.find('ul.ls-materialboxToc-foldablelist, div.ls-homework-note');

			if ($this.is('[data-expansion-action=expand]')) {
				menus.show(300);
				$this.attr('data-expansion-action', 'collapse');
			} else {
				menus.hide(300);
				$this.attr('data-expansion-action', 'expand');
			}
		});
	}

	let updateTocHeightPublic: (() => void) | undefined;

	let isToggling = false;
	export function toggleOpenClose(doClose: boolean): void {
		if (isToggling)
			return;

		const tc = $('.ls-tocContainer-outer');
		const tcInner = $('.ls-tocContainer-inner');
		const width = tc.css("width");
		if (doClose || width != "0px") {
			isToggling = true;
			tcInner.fadeOut(100);
			tc.animate({ "width": "0px" }, 300, function () {
				tc.hide();
				isToggling = false;
			});

		}
		else {
			isToggling = true;
			tc.show();
			tc.animate({ "width": "280px" }, 300, function () {
				tcInner.fadeIn(100);
				isToggling = false;
			});
		}
		tc.addClass('ls-tocContainer-noautotoggle');
		$('.toggleTocElementImg').toggleClass('toggleTocElementImgClosed');
		updateTocHeightPublic!();
	}

	function getscrollx(): number {
		return window.visualViewport ? window.visualViewport.pageLeft : window.pageXOffset;
	}

	function getscrolly(): number {
		return window.visualViewport ? window.visualViewport.pageTop : window.pageYOffset;
	}

	function isInViewport(element: Element): boolean {
		const html = document.documentElement;
		const rect = element.getBoundingClientRect();

		return !!rect &&
			rect.bottom >= 20 &&
			rect.right >= 0 &&
			rect.left <= html.clientWidth &&
			rect.top <= html.clientHeight - 20;
	}

	export function findInViewPotentielEndPoints(indholdElemList: readonly Element[]): string[] {
		const filteredArray = new Array<string>();
		for (const ele of indholdElemList) {
			if (isInViewport(ele)) {
				const dttid = ele.getAttribute('data-to-toc-id');
				if (!dttid)
					throw new Error("Liste er ikke hvad vi forventer.")
				filteredArray.push(dttid);
			}
		};

		return filteredArray;
	}

	let lastTocReadMarkerStyle: string | undefined;

	export function moveTocReadMarker(
		tocElem: Element,
		allContentElementIds: readonly string[],
		readMarkerDiv: HTMLElement
	): void {
		function isVisible(e: HTMLElement) {
			return e.offsetWidth > 0 || e.offsetHeight > 0;
		}

		if (!isVisible(readMarkerDiv)) {
			lastTocReadMarkerStyle = undefined;
			return;
		}
		if (allContentElementIds.length === 0) {
			lastTocReadMarkerStyle = undefined;
			return;
		}

		const first = getFirstTocElement(tocElem, allContentElementIds);
		const last = getFirstTocElement(tocElem, [...allContentElementIds].reverse());
		if (!(first && last)) {
			// 20220331 Lader til at naar dette sker, indehodldet
			// allContentElementIds eet element, og det er et UnknownID (at
			// doemme ud fra antal cifre).
			// Saa det maa vel ske naar der kun er eet nyt/ikke-gemt dokument
			// som indhold, som ikke er i toc-en. Det er helt iorden, ikke
			// nogen grund til at tage paa vej over det.
			if (allContentElementIds.length === 1)
				return;

			throw new Error(`ikke 2: ${allContentElementIds.join(", ")}`);
		}

		const top = first.offsetTop;
		const bottom = getBottom(last);
		const height = bottom - top;

		const topplacement = top;
		const style =
			'position: relative;' +
			'height: ' + height + 'px;' +
			'width: 2px;' +
			'margin: 0;' +
			'padding: 0;' +
			'padding-right: 1px;' +
			'background-image: linear-gradient(to bottom, #60AFFE, #60AFFE 100%, #f7f7f7 100%);' +
			'top: ' + topplacement + 'px';

		// Undgaa at fedte med dom-en, hvis det er den samme style som sidst.
		// Aht. perf. 20220330.
		if (style === lastTocReadMarkerStyle)
			return;
		lastTocReadMarkerStyle = style;

		readMarkerDiv.setAttribute('style', style);

		function getBottom(te2: HTMLElement) {
			const hight = $(te2).height();
			if (!hight)
				throw new Error("hight?")

			return te2.offsetTop + hight;
		}
	}

	function getFirstTocElement(
		tocElem: Element,
		tocReferenceIds: readonly string[],
	): HTMLElement | undefined {
		for (const id of tocReferenceIds) {
			const elem = tocElem.querySelector("[data-toc-reference-id^='" + id + "']");
			if (!elem)
				continue;

			if (elem instanceof HTMLElement)
				return elem;
			throw new Error('wtf ikke hmlelement?');
		}
		return undefined;
	}

	export function init(): void {
		const tc = $('.ls-tocContainer-outer');
		const mq = matchMedia('(min-width: 768px)');

		const updatebtn = () => $('.toggleTocElementImg').toggleClass('toggleTocElementImgClosed', !tc.is(':visible'));
		updatebtn();
		mq.addListener(() => {
			if (!mq.matches) {
				// Naar toc-en skjules i et relativt smalt vindue med h-scroll, rykker lc-indholdet til
				// venstre og ofte delvist ud af vinduet. Vi hopper med.
				const cosplay = getscrollx();
				window.scrollBy(-1 * cosplay, 0);
			}
			updatebtn();
		});

		function getPosOnPageY(ele: HTMLElement) {
			return getscrolly() + ele.getBoundingClientRect().top;
		}

		const tocinner = $(".ls-tocContainer-inner")[0];
		const toolbar = $(".toolbar")[0];
		const tocOriginalY = getPosOnPageY(tocinner);
		const toolbarOriginalY = getPosOnPageY(toolbar);

		// toc-en skal have viewportens hoejde, minus ...
		// 1: hvad toolbaren tager.
		// 2: synlig (!) afstand fra bund af kombineret toc-og-indholds-kasse til bund af side.
		//    Hvis vi ikke fratraekker denne del, ryger toppen af toc-en ud over toppen af viewport
		//    eller bunden af toc-en forbliver til bund af viewport (IE, hvor vi bruger position static).
		const getReservePastEndDistance = () => {
			const diff = window.innerHeight - tocinner.parentElement!.getBoundingClientRect().bottom;
			return diff > 0 ? diff : 0;
		};
		const updateTocHeight = () => {
			if (!$(tocinner).is(':visible') || LectioJSUtils.IsMobile())
				return;
			const toolbarHeight = $(toolbar).height()!;
			//stm 44752: Kommenteret ud da den var med til at faa skaermen til at ryste.
			//$(tocinner).css('height', 'calc(95vh - ' + Math.floor(toolbarHeight + getReservePastEndDistance()) + 'px)');
			$(tocinner).css('top', Math.floor(toolbarHeight));
		};
		updateTocHeightPublic = updateTocHeight;
		// toolbarens hoejde kan vi foerst aflaese naar editoren er (mere) initialiseret.
		setTimeout(updateTocHeight, 1000);

		// Scroll-listeren, hvis formaal det er at holde den bund-afstand vi fratraekker toc-hoejden.
		// Naturligvis skal den vaere effektiv, hvilket bl.a. goer at den er 'passive'.
		let timeouthandle: number | undefined;
		let oldPastEndDistance = getReservePastEndDistance();
		window.addEventListener('scroll', evt => {
			const res = getReservePastEndDistance();
			if (res === oldPastEndDistance)
				return;
			oldPastEndDistance = res;
			if (timeouthandle !== undefined) {
				clearTimeout(timeouthandle);
				timeouthandle = undefined;
			}
			timeouthandle = requestAnimationFrame(() => {
				timeouthandle = undefined;
				updateTocHeight();
			});
		}, { passive: true });



		const allContentElements: readonly Element[] = Array.from(document.querySelectorAll("[data-to-toc-id]"));
		if (allContentElements.length !== 0) {
			const tcele = tc[0];
			if (!tcele)
				throw new Error("ingen tc?");
			const readMarker = tcele.querySelector('#ReadMarker');
			if (readMarker) {
				LectioJSUtils.AssertType(readMarker, HTMLElement);
				moveTocReadMarker(tcele, findInViewPotentielEndPoints(allContentElements), readMarker)
				window.addEventListener("scroll", () => {
					moveTocReadMarker(tcele, findInViewPotentielEndPoints(allContentElements), readMarker)
				}, { passive: true });
			}
		}
		const tocContainer = document.querySelector('.ls-tocContainer-inner');

		LectioJSUtils.GetNotNullValue(tocContainer)
			.addEventListener('click', e => {
				LectioJSUtils.AssertType(e.target, HTMLElement);

				const href = e.target.getAttribute('href');
				if (!href) {
					return;
				}

				if (!href.match(/^#/)) {
					// Til normale links.
					return;
				}

				// hvis der klikkes på en af knapperne
				if (e.target.matches(".ls-toc-item-buttons *")) {
					return;
				}

				e.preventDefault();
				e.stopPropagation();

				const id = href.substring(1);
				const ele = document.getElementById(id);
				if (!ele)
					throw new Error('fandt ikke ele "' + id + '".');

				const existingHash = window.location.hash
				if (existingHash == href) {
					ele.scrollIntoView();
					fixScrollToHash();
				}


				window.location.hash = href;

				// lille hack: vi lukker toc'en på små skærme efter man har navigeret i den.
				if ($(window).width()! <= 414 && !LectioJSUtils.IsMobile()) {
					toggleOpenClose(true);
				}
			});

		function getscrollingelement(ele: HTMLElement): HTMLElement {
			const list: HTMLElement[] = [];
			let curr: Element = ele;
			do {
				const ss = window.getComputedStyle(curr).overflowY;
				if (curr instanceof HTMLElement &&
					(ss === 'scroll' || ss === 'auto')
				) {
					// 202205: dissehersens er er en eller anden grund
					// scrollbare iflg. denne css-egenskab, men 1) vi scroller
					// dem ikke 2) er det ikke mest en fejl?
					const ignore =
						curr.classList.contains('ls-phase-activity') ||
						curr.classList.contains('ls-phase-material');

					if (!ignore)
						list.push(curr);
				}
				if (!curr.parentElement)
					break;
				curr = curr.parentElement;
			}
			while (curr)


			// Dette er html-elementet.
			if (list.length === 0)
				return (document as any).scrollingElement as HTMLElement;

			return list[list.length - 1];
		}

		if (window.location.hash) {
			fixScrollToHash();
		}

		window.addEventListener('hashchange', event => {
			fixScrollToHash();
		});

		function fixScrollToHash() {
			// Vil gerne have at naar man hopper/navigerer til en overskrift,
			// at den saa ikke vises helt i toppen af skaermen, men istedet lidt
			// laengere nede.
			// Det er helt noedvendigt paa aktivitetsforsiden (202205), hvor
			// toppen af skaermen er optaget af editorens toolbar. Andre steder
			// kunne vi nok godt lade vaere med at goere noget, men det er vel
			// udmaerket at denne opfoersel er nogenlunde konsistent paa tvaers
			// af sider.

			const hash = window.location.hash;
			if (!hash)
				return;
			if (!hash.startsWith('#'))
				throw new Error('ikke hash?');

			const id = hash.substring(1);
			const linktargetele = document.getElementById(id);
			if (!linktargetele)
				return;

			const se = getscrollingelement(linktargetele);

			// 202205 RH: Nogle headere har meget padding/margin over sig.
			// Andre har meget lidt. Vi vil gerne have at de alle ender samme
			// sted paa skaermen, saa man ved hvor man kan finde den overskrift
			// man hopper til.  Derfor tager vi her overskriftens padding og
			// margin ud af ligningen.
			function parsepixels(value: string) {
				if (!value.endsWith('px'))
					throw new Error('ender ikke med "px".');

				const v = parseFloat(value.slice(0, -2));
				if (isNaN(v))
					throw new Error('kan ikke parse float.');
				return v;
			}
			const cs = window.getComputedStyle(linktargetele);

			// Denne scroll-delta-beregning er ikke helt aabenlys:
			// I forloebsmaterialeeditoren vil vi nok gerne have at
			// den dropdown vi viser i margin/padding, ogsaa er synlig/ikke er
			// scrollet ovenud af skaermen.
			// Afhaengig af overskriftsvarianten lader den til at befinde sig i
			// margin eller padding. Se fx. aktivitetsoverskrift vs
			// lektieoverskrift i forloebsmaterialeditor.
			const margin = parsepixels(cs.marginTop);
			const padding = parsepixels(cs.paddingTop);
			const delta = padding == 0 ? 0 : margin;
			if (!((window.innerHeight + se.scrollTop) >= se.scrollHeight)) {
				LectioJSUtils.LogDebug('Toc: onhashchange, scroll');
				if (se instanceof HTMLBodyElement)
					window.scrollBy(0, -100 + delta);
				else
					se.scrollBy(0, -100 + delta);
			}
		}

		// IE forstaar ikke 'position: sticky', saa her er noget fallback den kan tygge paa.
		if (!LectioFeatureDetection.IsIE())
			return;

		const setfixed = (fixed: boolean) => {
			const toolbarHeight = $(toolbar).height()!;

			$(tocinner).css('position', fixed ? 'fixed' : 'inherit');
			$(tocinner).css('width', fixed ? '280px' : '');
			$(tocinner).css('top', fixed ? toolbarHeight + 'px' : '');
			$(toolbar).css('position', fixed ? 'fixed' : 'inherit');
			$(toolbar).css('width', fixed ? '280px' : '');
			// Saetter bgcolor, for ved scroll til bund af side gaar toc ned til bund af side, dvs.
			// ud over sin kasse/laengere ned end indholds-kassen.
			// Man kunne nok godt lave noget mere kompliceret her, men er det besvaeret vaerd?
			$(tocinner).css('background-color', fixed ? 'inherit' : '');
		};

		Rx.Observable.fromEvent(window, 'scroll')
			.select(() => {
				const sy = getscrolly();
				const needsFixed = sy >= tocOriginalY! || sy >= toolbarOriginalY!;
				return needsFixed;
			})
			.distinctUntilChanged()
			.subscribe(needsFixed => {
				setfixed(needsFixed);
			});
	}
}
