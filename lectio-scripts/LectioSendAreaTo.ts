"use strict";

/// <reference types="jquery"/>
/// <reference types="jqueryui"/>

import { LectioDeferred, LectioJSUtils } from './LectioJSUtils';
import { CommandRegistry } from "./CommandRegistry";

import { GuiMisc } from './GuiMisc';
import { canvas } from 'modernizr';

type PrintArgs = {
	Subcommand: string,
	CtrlToPrint: string,
	IncludeDateTimeTag: boolean,
	TitleForPrint: string,
};

export namespace LectioSendAreaTo {

	let lastWindowDeferred: LectioDeferred<{}> | null = null;
	const firstEditorReady = LectioJSUtils.CreateDeferred<{}>();
	export let LastData: string | null = null;
	export let LastCss: string | null = null;
	export let LastDataTimestamp: number | null = null;


	function CleanElement(container: JQuery): void {
		// Fjern overflødigt
		$('[data-lectiocontextcard]', container).removeAttr('data-lectiocontextcard');
		$('[data-rowdebug]', container).removeAttr('data-rowdebug');
		$('[title]', container).removeAttr('title');

		// Fjern asp.net validator-tekster.
		$(':input', container).
			filter(f => f.hasOwnProperty('Validators')).
			each((ix, elem) => {
				(elem as any).Validators.remove();
				(elem as any).Validators = null;
			});

		// Remove SELECT boxes
		$("select", container).
			each((ix, elem) => {

				// Bemaerk at browsere ikke kloner den den valgte vaerdi for select hvis den skifter værdi efter load.
				const val: string = $(elem).find('option:selected').text();
				const txt: JQuery = val !== "" ? $('<span />').text(val) : $('<span />').html("&nbsp;");
				$(elem).replaceWith(txt);
			});

		// Fjern knapper og lignende, der fravælger at komme med.
		$('.lf-excel-exclude', container).remove();

		// Fjern billeder.
		$('img', container).remove();

		// Fjern paginerings-links/-raekker.
		$('tr.paging', container).remove();

		// Fjern font-ikoner
		$('span.ls-fonticon', container).remove();

		// Fjern kontekstmenu.
		$('div.lec-context-menu', container).remove();

		// Disse billeder float'er og splitter cellen hvis de ikke fjernes.
		container.find('.s2skemabrikIcons').remove();
		container.find('.validator').remove();

		// Remove hyperlinks
		$('a', container)
			.each((ix, elem) => {
				$(elem).replaceWith($('<span />').text($(elem).text()));
			});

		// Remove nested spans, since they result in extra spaces
		$('span>span:only-child', container)
			.each((ix, elem) => {
				$(elem).parent().html($(elem).html());
			});

		// INPUT
		$('input', container)
			.each((ix, elem) => {
				const elem2: JQuery = $(elem);
				let replacementText: string;
				switch (elem2.attr('type')) {
				case "checkbox":
					replacementText = elem2.prop('checked') ? "Ja" : "Nej";
					break;
				case "text":
					replacementText = LectioJSUtils.GetAssertedType(elem, HTMLInputElement, "input").value;
					break;
				default:
					replacementText = "";
				}
				elem2.replaceWith($('<span />').text(replacementText));
			});

		// TEXTAREA
		$('textarea', container)
			.each((ix, elem) => {
				const newhtml: string = LectioJSUtils.GetAssertedType(elem, HTMLTextAreaElement, "textarea").value.replace('<', '&lt;').replace(/\n/g, "<br />") + "<br />";
				$(elem).replaceWith($('<span />').html(newhtml));
			});

		$('ul[lectio-behavior~=copy-as-table]', container).each((_, ul) => {
			const table = $('<table class="list lf-grid"></table>');
			$(ul).children().each((_, item) => {
				const td = $('<td></td>').append($(item).children());
				const row = $('<tr></tr>').append(td);
				row.appendTo(table);
			});
			$(ul).replaceWith(table);
		});
		// Dette er stamklasselisten, hvor dom-en er opdelt i rækker, og vi gerne vil have den kopieret som een lang liste.
		$('*[lectio-behavior~=copy-as-table]', container).each((_, listContainer) => {
			const table = $('<table class="list lf-grid"></table>');

			const items = $(listContainer).children().children();
			items.each((_, item) => {
				const td = $('<td></td>').append($(item));
				const row = $('<tr></tr>').append(td);
				row.appendTo(table);
			});
			$(listContainer).replaceWith(table);
		});

		$("ul", container).each((_, ul) => {
			const newtext = $("<span/>").html($("li", ul).map((_, li) => li.innerText).get().join('<br/>'));
			$(ul).replaceWith(newtext);
		});

		// Dette forhindrer at br-elementer forårsager nye rækker i excel ...
		// $('br', container).css('mso-data-placement', 'same-cell');
		// .. men browserne har det med at fjerne det. Laver det senere, efter vi har fået html'en ...
		// .. og hvis vi ikke også fjerner white-space: nowrap, kommer der slet ikke nogen linieskift i celler.
		$('td[style]', container).css('white-space', '');
		$('th[style]', container).css('white-space', '');
		$('.nowrap', container).removeClass('nowrap');

		// Fjern super-kolonneroverskrifter.
		// stamklassefravaer er god at tjekke mod.
		$('table.lf-grid', container).each((tableIndex, table) => {
			const secondRow = $('tr:eq(1)', table);
			if (secondRow.length === 0) {
				return;
			}
			const secondRowHeaders = secondRow.find('th').toArray();
			const firstRow = $(table).find('tr:eq(0)');
			if (secondRowHeaders.length > 0) {
				firstRow.find('th').each((cellIndex, cell) => {
					const colspan = parseInt($(cell).attr('colSpan') || '0', 10);
					if (colspan > 1) {
						let secondRowSubcells: JQuery<any>;
						const hasRowspan = parseInt($(cell).attr('rowSpan') || '0', 10) > 1;
						if (!hasRowspan) {
							secondRowSubcells = $(secondRowHeaders.splice(0, colspan));
						} else {
							const arr: JQuery[] = [];
							for (let ii = 0; ii < colspan; ii++) {
								arr.push($("<th />").eq(0));
							}
							secondRowSubcells = $(arr);
						}
						secondRowSubcells.insertAfter($(cell));

						// Kopiér superoverskrifter til overskriftscellerne.
						secondRowSubcells.each((_, subcell) => {
							$(subcell).prepend($("<br />"));
							$(subcell).prepend($('<span />').text($.trim($(cell).text())));
						});

						$(cell).remove();
					}
				});
				firstRow.find('th').attr('rowSpan', '1');
			} else {
				firstRow.find('th[rowSpan]').attr('rowSpan', '1');
			}

			if (secondRow.find('*').length === 0) {
				secondRow.remove();
			}
		});

		// kører flere gange for at fange rekursion, fx div i div.
		for (let i = 0; i < 10; i++) {
			let gotsomething = 0;
			// Stop Excel i at lave nye rækker pga. linieskift.
			$('table.lf-grid ul > li', container)
				.each((ix: number, elem: Element) => {
					gotsomething++;
					const txt = $(elem).text();
					$(elem).replaceWith($("div").text((txt)));
				});
			$('table.lf-grid ul', container)
				.each((ix: number, elem: Element) => {
					gotsomething++;
					const html = $(elem).html();
					$(elem).replaceWith(html);
				});

			// Burde håndtere flere liste-tabel-css-klasser.
			$('table.lf-grid div:not(:first-child)', container).before('<br />');
			$('table.lf-grid div', container)
				.each((ix, elem) => {
					gotsomething++;
					$(elem).replaceWith($(elem).html());
				});
			if (gotsomething === 0)
				break;
		}

		// Override contents of table-cells on print
		$('td[print-background-color]', container).each((ix, elem) => {
			$(elem).css("background-color", $(elem).attr("print-background-color")!)
		});
		$('td[print-innerhtml]', container).each((ix, elem) => {
			$(elem).html($(elem).attr("print-innerhtml")!)
		});

		$('[style=""]', container).removeAttr('style');
		$('[class=""]', container).removeAttr('class');
		$('[class=" "]', container).removeAttr('class');
		$('[class="tooltip"]', container).removeAttr('class');

		// Laver tables indes i tabeller om til tekst, så de passer i én celle (én linje pr. række).
		$("td table", container)
			.each((_, tableElem: Element) => {
				const newRows: string[] = [];
				const rows = $("tr", tableElem);
				if (rows.length > 1) {
					rows.each((_, rowElem: Element) => {
						const newCells: string[] = [];
						$(rowElem).find("td,th").each((_, cellElem: Element) => {
							newCells.push($(cellElem).text());
						});
						newRows.push(newCells.join("&emsp;&emsp;").trim());
					});
					tableElem.outerHTML = (newRows.join("<br/>").trim());
				}
			});

		// Fjern elementer der har stylen 'display: none'
		{
			// Denne fejler på find("*") hvis indholdet er meget stort - er et generelt JQuery problem, som ikke er fikset i JQuery pt. STM 44328
			// Se f.eks. aktivitetsindberetning fuldtid -> Detaljer på en stor erhvervsskole
			//	$(container).find("*").filter(function (_, e) {
			//		return $(e).css("display") === "none";
			//	}).remove();
			const cont = container.get(0)!;
			const elems = cont.querySelectorAll('*');
			for (let i = 0, len = elems.length; i < len; i++) {
				const ee = $(elems[i]);
				if (ee.css("display") === "none")
					ee.remove();
			}

		}
	}

	function GetCleanHtml(element: JQuery): string {
		if (!element || element.length !== 1) {
			throw new Error('"Vil kun tage ét element."');
		}


		// Pakker den ind, så css-selectors nemmere fanger indhold.
		const container = $('<div/>');
		element.appendTo(container);
		CleanElement(container);

		const newElement = ExcelAddSeperatingRowsAroundMainTables(container);
		const rawhtml = LectioJSUtils.GetOuterHtml(newElement);
		// disse css-ting er browserne ikke meget for at slippe ind i deres css/dom, så vi håndterer dem her, tilsidst.
		const fixedHtml = rawhtml.replace(/(<br \/>|<br>)/gi, "<br style='mso-data-placement: same-cell;' />");
		return fixedHtml;
	}

	function ExcelAddSeperatingRowsAroundMainTables(container: JQuery): Element {
		// Indfør ekstra linie før og efter tabel for hensigstmæssig brug af Ctrl-L i Excel.
		// lf-grid class bruges af lectio-gridview, som benyttes når der ønskes sortering af søjler.
		// Dette er sammenfaldende med vores ønske om at kunne benytte Ctrl-L i Excel.
		// Hvis lf-grid synes at mangle, bør det overvejes at ændre til lectio-gridview
		const newElement = $('<div/>');
		container.appendTo(newElement);
		// <br/> interageren med <div> tolkes ikke entydigt af excel. Derfor indføres enkelt-række-tabeller
		$('.lf-grid', newElement).before('<table><tr><td></td></tr></table>');
		$('.lf-grid', newElement).after('<table><tr><td></td></tr></table>');
		return LectioJSUtils.GetNotNullValue(newElement.get(0));
	}

	function ExcelAddHeaderHtmlString(htmlString: string): string {
		const title = LectioJSUtils.GetLectioMainTitle(); //null;//"BLA<>&:;#¤%/\\\"\'*.,-_$£@!+?´|~´|¨^{[()]}BLA"
		return '<strong>' + LectioJSUtils.HtmlEncode(title) + '</strong><br/>\n' + htmlString; //sæt sidetitel ind øverst excel ark.
	}

	function Excel(areaId: string): void {
		const elem = document.getElementById(areaId);
		if (!elem)
			throw new Error('ikke fundet');

		// Dette er sammenfaldende med vores ønske om at kunne benytte Ctrl-L i Excel
		const clone = $(elem).clone();

		const html1 = GetCleanHtml(clone);
		const html = ExcelAddHeaderHtmlString(html1);

		LectioJSUtils.CopyStringToClipboard(html);
	}



	export async function CopyToExcel(ctx: CommandRegistry.CommandExecutionContext): Promise<{}> {
		let areaIdEffective: string;
		if (ctx.Argument) {
			areaIdEffective = ctx.Argument;
		} else {
			const element = await CommandRegistry.PromptUserForElementSelection({
				prompt: 'Klik på en tabel eller et område.',
				promptTitle: 'Kopiér til Excel',
				selector: 'table[id]',
			});
			if (element === 'notfound')
				return 'notfound';
			areaIdEffective = element.id;
		}

		if (areaIdEffective == null)
			return {};
		ctx.ArgumentDerivedByCommand = areaIdEffective;
		Excel(areaIdEffective);

		LectioJSUtils.ShowInformation('Dataene er nu kopieret til udklipsholderen og kan indsættes i MS Excel.');

		return {};
	}

	// ********************
	// Print
	// ********************

	let isInitialized = false;

	export function InitializeGlobal(): void {
		if (isInitialized)
			return;
		isInitialized = true;
		function mkexec(scaleTo: ScalePrintTo | null, showPrintDialog: boolean)
			: CommandRegistry.CommandDefinition['execute'] {
			return async ctx => {
				let printargs: PrintArgs;
				if (ctx.Argument) {
					printargs = JSON.parse(ctx.Argument) as PrintArgs;
				}
				else {
					const element = await CommandRegistry.PromptUserForElementSelection({
						prompt: 'Klik på en tabel eller et område.',
						promptTitle: 'Print',
						selector: 'table[id], .islandContent'
					});
					if (element === 'notfound')
						return 'notfound';
					const derivedArgs = {
						CtrlToPrint: element.id,
						IncludeDateTimeTag: true,
						Subcommand: 'woe',
						TitleForPrint: document.title
					};
					ctx.ArgumentDerivedByCommand = JSON.stringify(derivedArgs);
					printargs = derivedArgs;
				}
				XXX_GeneratePrintWindow(printargs.CtrlToPrint, true, printargs.IncludeDateTimeTag, scaleTo, showPrintDialog, printargs.TitleForPrint);
				return {};
			};
		}

		CommandRegistry.RegisterCommand({
			id: 'PrintA2',
			title: 'Print med tilpasset bredde til A2',
			execute: mkexec('A2', true),
		});
		CommandRegistry.RegisterCommand({
			id: 'PrintA3',
			title: 'Print med tilpasset bredde til A3',
			execute: mkexec('A3', true),
		});
		CommandRegistry.RegisterCommand({
			id: 'PrintA4',
			title: 'Print med tilpasset bredde til A4',
			execute: mkexec('A4', true),
		});
		CommandRegistry.RegisterCommand({
			id: 'PrintPreview',
			title: 'Vis udskriftsvenlig udgave',
			execute: mkexec(null, false),
		});
		CommandRegistry.RegisterCommand({
			id: 'PrintDefault',
			title: 'Print',
			execute: mkexec(null, true),
		});
		CommandRegistry.RegisterCommand({
			id: 'CopyToExcel',
			title: 'Kopiér til Excel',
			execute: LectioSendAreaTo.CopyToExcel
		});


		GuiMisc.InitTableFilter();
	}

	export function ScaleDocument(document: Document, paperWidth: string): void {
		LectioJSUtils.AssertArgument(typeof (paperWidth) === "string");
		LectioJSUtils.AssertArgument(paperWidth === "A4" || paperWidth === "A3" || paperWidth === "A2");

		let allowedWidth = 1000; //For A4
		let fontsize = 90; //% ALSO DEFINED IN lectioPrint.css!!!

		if (paperWidth === "A3") {
			allowedWidth = allowedWidth * Math.sqrt(2);
		} else if (paperWidth === "A2")
			allowedWidth = allowedWidth * 2;

		const bodyele = $('body', document);
		const containerElement = $('#printcontainerDiv', document);
		if (containerElement[0]) {
			let docWidth = containerElement[0].clientWidth;

			while (docWidth > allowedWidth * 1.10) { // vi tillader 10%
				const scale = allowedWidth / docWidth;
				const newFontSize = Math.round(fontsize * scale) + "%";

				bodyele.css("font-size", newFontSize);

				const newWidth = containerElement[0].clientWidth;
				if (newWidth > allowedWidth)
					fontsize *= scale;
				docWidth = newWidth;
				if (fontsize < 0)
					throw new Error("fontsize");
			}
		}
	}


	type ScalePrintTo = 'A2' | 'A3' | 'A4';


	function XXX_GeneratePrintWindow(
		areaId: string,
		isForPrint: boolean,
		isIncludePrintDate: boolean,
		scaleTo: ScalePrintTo | null,
		showPrintDialog: boolean,
		title: string
	): Promise<{}> | null {

		if (typeof (isForPrint) !== 'boolean') {
			throw new Error("isForPrint");
		}
		const areaobj = $('#' + areaId);
		if (areaobj.length === 0) {
			return null;
		}

		if (scaleTo) {
			if (typeof (scaleTo) !== 'string') {
				throw new Error("scaleTo");
			}
			if (scaleTo !== "A3" && scaleTo !== "A4" && scaleTo !== "A2") {
				throw new Error("scaleTo");
			}
		}

		// Flg. before- og afterprint indført aht. scroll-fikserede kolonner, som vi gerne vil have ikke-fikserede på udskriften.
		$(window).trigger('beforeprint');

		// Identificer ting der (pr. css?) er skjult, saa vi kan fjerne dem
		// fra klonen, som vi laver om et oejeblik.
		// const indicesToRemove: number[] = [];
		const indicesToRemove: { [index: number]: string | undefined } = {};

		let elementBeforeCount = 0;
		const beforeLog: string[] = [];
		{
			const elem = areaobj.get(0)!;
			const toremove: [e: Element, idx: number][] = [];

			let eidx1 = -1;
			const enter = (parent: Element): void => {
				let currc = parent.firstElementChild;
				while (currc) {
					eidx1++;
					elementBeforeCount++;
					beforeLog.push(currc.nodeName);
					if (eidx1 > 100000)
						throw new Error('stor1');
					if (window.getComputedStyle(currc).display === 'none' &&
						currc.nodeName !== 'STYLE') {
						toremove.push([currc, eidx1]);
						indicesToRemove[eidx1] = currc.nodeName;
					}
					else {
						enter(currc);
					}
					currc = currc.nextElementSibling;
				}
			};
			enter(elem);
			console.table(toremove);
		}

		const areaClone = areaobj.clone();

		// Jquery clone er med til at kopiere HTML-DOM'en.
		// Indholdet af et canvas er ikke en del af DOM'en, der goere et cloned canvas altid vil vaere tom.
		areaobj.find('canvas').each(function () {
			// Vi gemmer canvas'et, som et img i stedet for canvas. 
			const canvasId = this.id;

			// Burde ikke ske at der er flere elementer med samme canvasId...
			const cloneCanvas = $(areaClone).find(`#${canvasId}`).get(0);
			if (cloneCanvas === undefined) {
				console.debug(`CanvasId'et "${canvasId}" er ikke i den clonede vaerdi?`);
				throw new Error("CanvasId'et findes ikke?");
			}

			// TODO hvis det bliver for tungt at lave dataurl, kan toBlob anvendes; dog sker det i async som skaber andre problemer ift. print (window.open). 
			const img = new Image();
			img.src = this.toDataURL('image/png');
			$(cloneCanvas).replaceWith($(img));
		});

		$(window).trigger('afterprint');
		areaClone.find('script').remove();

		// Fjern de ovenfor identificerede ting.
		let elementAfterCount = 0;
		const afterLog: string[] = [];
		if (true) {
			let eidx2 = -1;
			const enter = (parent: Element): void => {
				let currc = parent.firstElementChild;
				while (currc) {
					eidx2++;
					elementAfterCount++;
					afterLog.push(currc.nodeName);
					if (eidx2 > 100000)
						throw new Error('stor2');
					const expectedNodeNameToRemove = indicesToRemove[eidx2];
					if (expectedNodeNameToRemove) {
						const snap = currc;
						let skipRemove = false;
						if (snap.nodeName !== expectedNodeNameToRemove) {
							console.debug(`Fandt ikke forventet nodename paa index ${eidx2}: Forventede ${expectedNodeNameToRemove}, fandt ${snap.nodeName}. Mere info herunder.`);
							console.debug('before', beforeLog.slice(0, elementAfterCount));
							console.debug('after', afterLog.slice(0, elementAfterCount));
							const ignore = expectedNodeNameToRemove === 'SCRIPT';
							if (ignore) {
								eidx2--;
								elementAfterCount--;
								skipRemove = true;
							}
							else
								throw new Error(`forkert elementnavn: forventede ${expectedNodeNameToRemove}, var ${snap.nodeName}.`);
						}
						currc = currc.nextElementSibling;
						if (!skipRemove){
							snap.remove();
							console.debug(`Removed element: ${snap.className}`)
						}
					} else {
						enter(currc);
						currc = currc.nextElementSibling;
					}
				}
			};
			enter(areaClone.get(0)!);
		};


		const burnStateToDom = (area: JQuery) => {
			$("input,button", area).each((ix, el) => {
				el.setAttribute('value', $(el).val()!.toString());
			});
			$("textarea[data-print-behavior~=expand-all]", area)
				.each((ix, elem) => {
					const txt: string = LectioJSUtils.GetAssertedType(elem, HTMLTextAreaElement, "textarea").value;
					$(elem).replaceWith($("<span/>").text(txt).css("white-space", "pre-line").css("border", "1px solid black").css("display", "inline-block"));
				});
			$("textarea", area).each((ex, elem) => {
				$(elem).html(LectioJSUtils.GetAssertedType(elem, HTMLTextAreaElement, "textarea").value);
			});
			$("input:radio,input:checkbox", area).each((ix, el) => {
				if ($(el).is(":checked"))
					el.setAttribute('checked', 'checked');
				else el.removeAttribute('checked');
			});
			$("option", area).each((ix, el) => {
				if ($(el).is(":selected"))
					el.setAttribute('selected', 'selected');
				else
					el.removeAttribute('selected');
			});

			// Raphael - LectioGantt workaround - Fill contains url of page
			// compare each gradientId value fill attribute value against
			// when it maches a new fill value is generated without current url
			// only with id value from linearGradient element
			const svg = $("svg", area);
			if (svg.length > 0) {
				const gIds: string[] = [];
				const g = $("linearGradient", svg);
				if (g.length > 0) {
					g.each((ix, el) => {
						const v = $(el).attr("id");
						gIds[ix] = v === undefined ? "" : v;
					});
				}

				const r = $("rect", svg);
				if (r.length > 0) {
					r.each((ix, re) => {
						const f = $(re).attr("fill");
						if (typeof f !== typeof undefined && f !== undefined) {
							gIds.forEach((i, index) => {
								const m = f.match(i);
								if (m === null) {
									return;
								} else {
									re.setAttribute('fill', "url('#" + m.toString() + "')");
								}
							});
						}
					});
				}
			}

			return area;
		};
		$('head style').clone().prependTo($(areaClone));

		const burned = burnStateToDom($(areaClone));

		const isContainer = burned.prop("tagName") !== "TABLE"; //We dont want to lose the table tag
		let sanitizedHtml: string;
		if (!isContainer) {
			sanitizedHtml = burned[0].outerHTML; //possibly it is ok to always use outerHTML, indenpendently of the the containing element (almost universal browser support)
			if (!sanitizedHtml) {
				sanitizedHtml = burned.wrap("<table>").parent().html();
			}
		} else {
			sanitizedHtml = burned.html();
		}

		if (!sanitizedHtml) {
			alert('Denne funktionalitet virker ikke i den browser du bruger');
			return null;
		}
		const title2 = title ? title : LectioJSUtils.GetLectioMainTitle();
		const timestamp = new Date().valueOf();
		const sendToArgs = {
			"sendtotarget": isForPrint ? "printer" : "excel",
			"lectiomaintitle": title2 ? title2 : "",
			"includeprintdate": isIncludePrintDate ? "1" : "0",
			"scaleto": scaleTo ? scaleTo : "",
			"timestamp": timestamp,
			"showPrintDialog": showPrintDialog ? "1" : "0",
		};
		LastData = sanitizedHtml;
		LastCss = $('style[lec-cssalsoforprint]').text();
		LastDataTimestamp = timestamp;

		// Vi regner printoperationen for værende færdig når enten printvinduet mener at vi er det, eller når vi selv får fokus igen.
		// Det lader til at IE < 9 giver fokus tilbage til det åbnede vindue, inden window.open-vinduet melder at det er færdigt.
		lastWindowDeferred = LectioJSUtils.CreateDeferred();

		const popupwin = window.open(LectioJSUtils.GetBaseSchoolURL() + "/print.aspx?" + jQuery.param(sendToArgs), "_newtab");
		if (popupwin == null) {
			return lastWindowDeferred.promise();
		}
		const msgtopost = {
			MsgType: 'SendToData',
			LastData: LastData,
			LastCss: LastCss,
			LastDataTimestamp: LastDataTimestamp
		};
		const msghandler: (e: MessageEvent<any>) => any = e => {
			if (e.origin !== window.origin)
				return;
			switch (e.data['MsgType']) {
			case 'NotifySendToWindowReady':
				popupwin.postMessage(msgtopost, window.origin);
				break;
			case 'NotifySendToDone':
				window.removeEventListener('message', msghandler);
				break;
			default:
				break;
			}
		};
		window.addEventListener('message', msghandler);

		return lastWindowDeferred.promise();
	}

	export function PrinterDefault(ctrltoprint: string): any {
		const a = $('#' + ctrltoprint).data('DefaultPrintAction');
		return a();
	}
}
