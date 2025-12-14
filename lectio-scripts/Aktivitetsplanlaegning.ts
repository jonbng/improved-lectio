import { EventMods, LectioJSUtils } from "./LectioJSUtils";

export namespace Aktivitetsplanlaegning {

	type BoxInfo = {
		box: HTMLElement,
		row: number,
		colStart: number,
		colEndInclusive: number,
	};
	type BoxInfoNullable = BoxInfo | null;

	type AktplanSetup = {
		postbackTarget: string,

		aktivitetsplan: HTMLElement,				// ContentDiv for aktivitetsplanen/kalenderen. Må gerne blive refreshed af postbacks, så event-listeners skal ikke ligge på dette element
		aktivitetsplanWrapper: HTMLElement,			// Element som indeholder aktivitetsplanen, og eksisterer på tværs af postbacks, så event-listeners ikke bliver fjernet af postbacks

		kalenderTabSetup: AktplanKalenderTabSetupNullable,
	};
	type AktplanSetupNullable = AktplanSetup | null;

	type AktplanKalenderTabSetup = {
		entityContainer: HTMLElement,
		indholdContainer: HTMLElement,
		kalenderContainer: HTMLElement,

		useOnClickNavigation: boolean,
		useOnBlur: boolean,
		useKeyboardNavigation: boolean,
		useDragAndDrop: boolean,

		boxByRowCache: Map<number, HTMLElement[]>,
	};
	type AktplanKalenderTabSetupNullable = AktplanKalenderTabSetup | null;

	export let aktplanSetup: AktplanSetup;

	function UpdateGlobalSetup(postbackTarget: string, aktivitetsplanId: string): void {
		const aktivitetsplan: HTMLElement | null = document.getElementById(aktivitetsplanId);
		LectioJSUtils.AssertNotNullOrUndefined(aktivitetsplan, "fandt ikke aktivitetsplan");

		const aktivitetsplanWrapper: HTMLElement | null = aktivitetsplan.parentElement;
		LectioJSUtils.AssertNotNullOrUndefined(aktivitetsplanWrapper, "fandt ikke aktivitetsplan parentelement?");

		aktplanSetup = {
			postbackTarget,
			aktivitetsplan,
			aktivitetsplanWrapper,

			kalenderTabSetup: aktplanSetup?.kalenderTabSetup ?? null,
		};
	}

	export namespace Kalender {

		export function Initialize(
			postbackTarget: string,
			aktivitetsplanId: string,
			useOnClickNavigation: boolean = true,
			useOnBlur: boolean = true,
			useKeyboardNavigation: boolean = true,
			useDragAndDrop: boolean = true): void {

			UpdateGlobalSetup(postbackTarget, aktivitetsplanId);

			const entityContainer: HTMLElement | null = aktplanSetup.kalenderTabSetup?.entityContainer
				?? aktplanSetup.aktivitetsplanWrapper.querySelector(`.${CssClasses.entityContainerClass}`);

			const indholdContainer: HTMLElement | null = aktplanSetup.kalenderTabSetup?.indholdContainer
				?? aktplanSetup.aktivitetsplanWrapper.querySelector(`.${CssClasses.indholdContainerClass}`);

			const kalenderContainer: HTMLElement | null = aktplanSetup.kalenderTabSetup?.kalenderContainer
				?? aktplanSetup.aktivitetsplanWrapper.querySelector(`.${CssClasses.kalenderContainerClass}`);

			if (!entityContainer || !indholdContainer || !kalenderContainer)
				return;

			aktplanSetup.kalenderTabSetup = {
				entityContainer: entityContainer,
				indholdContainer: indholdContainer,
				kalenderContainer: kalenderContainer,

				useOnClickNavigation: useOnClickNavigation,
				useOnBlur: useOnBlur,
				useKeyboardNavigation: useKeyboardNavigation,
				useDragAndDrop: useDragAndDrop,

				boxByRowCache: new Map<number, HTMLElement[]>(),
			};
			

			/* ****************************/
			/* **** On Click            ***/
			/* ****************************/
			if (!LectioJSUtils.HasBeenHere(aktplanSetup.aktivitetsplanWrapper, "AktplanKalender_onClick")) {


				/* ****************************/
				/* **** Entiteter           ***/
				/* ****************************/
				$(aktplanSetup.aktivitetsplanWrapper).on('click', `.${CssClasses.entityContainerClass} > div[data-entityid]:not([data-entityid=""])`,
					evt => {
						if (!aktplanSetup.kalenderTabSetup?.useOnClickNavigation)
							return;

						const entity: HTMLElement | null = evt.currentTarget;
						LectioJSUtils.AssertNotNullOrUndefined(entity, "Fandt ikke nogen entity...");

						const entityWasSelected: boolean = KalenderVisningUtilities.EntityIsSelected(entity)

						KalenderVisningUtilities.DeselectAndDehighlightAllEntities(aktplanSetup.aktivitetsplanWrapper);
						KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktplanSetup.aktivitetsplanWrapper);

						KalenderVisningUtilities.DehighlightAllWeeks(aktplanSetup.aktivitetsplanWrapper);

						if (entityWasSelected) {
							KalenderVisningUtilities.DoPostbackClearingAktplanDetails(postbackTarget);
						}
						else {
							if (KalenderVisningUtilities.IsSelectableEntity(entity)) {
								KalenderVisningUtilities.SelectEntity(entity);
								KalenderVisningUtilities.SelectAndHighlightEntitiesForBox(entity);
							}

							KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails(postbackTarget, entity);
						}
					});


				/* ****************************/
				/* **** Blue boxes          ***/
				/* **** Grey boxes          ***/
				/* **** White boxes         ***/
				/* ****************************/
				$(aktplanSetup.aktivitetsplanWrapper).on('click', `.${CssClasses.indholdContainerClass} > div:not(.${CssClasses.aktivitettypeOverskriftClass}):not(.${CssClasses.belastningBoxClass}):not(.${CssClasses.invisibleBoxesClass})`,
					evt => {
						if (!aktplanSetup.kalenderTabSetup?.useOnClickNavigation)
							return;

						const box: HTMLElement | null = evt.target;
						LectioJSUtils.AssertNotNullOrUndefined(box, "Fandt ikke nogen box...");

						KalenderVisningUtilities.DeselectAndDehighlightAllEntities(aktplanSetup.aktivitetsplanWrapper);
						KalenderVisningUtilities.HighlightEntitiesForBox(box);

						KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktplanSetup.aktivitetsplanWrapper);
						KalenderVisningUtilities.SelectBoxAndHighlightSimilarBoxes(box, aktplanSetup.aktivitetsplanWrapper);

						KalenderVisningUtilities.DehighlightAllWeeks(aktplanSetup.aktivitetsplanWrapper);
						KalenderVisningUtilities.HighlightWeekForBox(box);

						TastaturNavigation.Boxes.lastVisitedColumn = KalenderVisningUtilities.GetBoxInfo(box).colStart;

						if (KalenderVisningUtilities.IsBlueBox(box)) {
							KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails(postbackTarget, box);
						}
						else
							KalenderVisningUtilities.DoPostbackClearingAktplanDetails(postbackTarget);

						KalenderVisningUtilities.EnsureIsBoxVisible(box, aktplanSetup.aktivitetsplan);
					});


				/* ****************************/
				/* **** Belastning boxes    ***/
				/* ****************************/
				$(aktplanSetup.aktivitetsplanWrapper).on('click', `.${CssClasses.indholdContainerClass} > .${CssClasses.belastningBoxClass}`,
					evt => {
						if (!aktplanSetup.kalenderTabSetup?.useOnClickNavigation)
							return;

						const target: HTMLElement | null = evt.target;
						LectioJSUtils.AssertNotNullOrUndefined(target, "Fandt ikke nogen box...");

						const box: HTMLElement | null = target.tagName.toLowerCase() == "span"
							? target.parentElement
							: target;
						LectioJSUtils.AssertNotNullOrUndefined(box, "Fandt ikke nogen box...");

						KalenderVisningUtilities.DeselectAndDehighlightAllEntities(aktplanSetup.aktivitetsplanWrapper);
						KalenderVisningUtilities.HighlightEntitiesForBox(box);

						KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktplanSetup.aktivitetsplanWrapper);
						KalenderVisningUtilities.SelectBoxAndHighlightSimilarBoxes(box, aktplanSetup.aktivitetsplanWrapper);

						KalenderVisningUtilities.DehighlightAllWeeks(aktplanSetup.aktivitetsplanWrapper);
						KalenderVisningUtilities.HighlightWeekForBox(box);

						TastaturNavigation.Boxes.lastVisitedColumn = KalenderVisningUtilities.GetBoxInfo(box).colStart;

						if (KalenderVisningUtilities.IsBelastningBox(box))
							KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails_SpecificWeek(postbackTarget, box);

						KalenderVisningUtilities.EnsureIsBoxVisible(box, aktplanSetup.aktivitetsplan);
					});
			}


			/* ****************************/
			/* **** On Blur             ***/
			/* ****************************/
			if (!LectioJSUtils.HasBeenHere(aktplanSetup.aktivitetsplanWrapper, "AktplanKalender_onBlur")) {


				/* ****************************/
				/* **** Entities            ***/
				/* ****************************/
				$(aktplanSetup.aktivitetsplanWrapper).on('focusout', `.${CssClasses.entityContainerClass}`,
					evt => {
						if (!aktplanSetup.kalenderTabSetup?.useOnBlur)
							return;

						const newTarget: EventTarget | null | undefined = evt.relatedTarget;

						if (newTarget && newTarget instanceof Element) {
							const clickedOnElem: Element = newTarget;
							const isChildOfEntityContainer: boolean = clickedOnElem.closest(`.${CssClasses.entityContainerClass}`) != null;

							if (isChildOfEntityContainer)
								return;
						}

						KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktplanSetup.aktivitetsplanWrapper);
						KalenderVisningUtilities.DeselectAndDehighlightAllEntities(aktplanSetup.aktivitetsplanWrapper);
						KalenderVisningUtilities.DehighlightAllWeeks(aktplanSetup.aktivitetsplanWrapper);
					});


				/* ****************************/
				/* **** Boxes in general    ***/
				/* ****************************/
				$(aktplanSetup.aktivitetsplanWrapper).on('focusout', `.${CssClasses.indholdContainerClass}`,
					evt => {
						if (!aktplanSetup.kalenderTabSetup?.useOnBlur)
							return;

						const newTarget: EventTarget | null | undefined = evt.relatedTarget;

						if (newTarget && newTarget instanceof Element) {
							const clickedOnElem: Element = newTarget;
							const isChildOfIndholdContainer: boolean = clickedOnElem.closest(`.${CssClasses.indholdContainerClass}`) != null;

							if (isChildOfIndholdContainer)
								return;
						}

						KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktplanSetup.aktivitetsplanWrapper);
						KalenderVisningUtilities.DeselectAndDehighlightAllEntities(aktplanSetup.aktivitetsplanWrapper);
						KalenderVisningUtilities.DehighlightAllWeeks(aktplanSetup.aktivitetsplanWrapper);
					});
			}


			/* ****************************/
			/* **** Keyboard Navigation ***/
			/* ****************************/
			if (!LectioJSUtils.HasBeenHere(aktplanSetup.aktivitetsplanWrapper, "AktplanKalender_keyboardNavigation")) {


				/* ****************************/
				/* **** Entities            ***/
				/* ****************************/
				$(aktplanSetup.aktivitetsplanWrapper).on('keydown', `.${CssClasses.entityContainerClass}`,
					evt => {
						if (!aktplanSetup.kalenderTabSetup?.useKeyboardNavigation)
							return;

						TastaturNavigation.Entities.EventHandlers.OnKeyboardDown(evt, postbackTarget, aktplanSetup.aktivitetsplanWrapper);
					});


				/* ****************************/
				/* **** Boxes in general    ***/
				/* ****************************/
				$(aktplanSetup.aktivitetsplanWrapper).on('keydown', `.${CssClasses.indholdContainerClass}`,
					evt => {
						if (!aktplanSetup.kalenderTabSetup?.useKeyboardNavigation)
							return;

						TastaturNavigation.Boxes.EventHandlers.OnKeyboardDown(evt, postbackTarget, aktplanSetup.aktivitetsplanWrapper);
					});
			}


			/* ****************************/
			/* **** Drag and drop       ***/
			/* ****************************/
			if (!LectioJSUtils.HasBeenHere(aktplanSetup.aktivitetsplanWrapper, "AktplanKalender_dragAndDrop")) {


				/* ****************************/
				/* **** Blue boxes          ***/
				/* ****************************/
				{
					$(aktplanSetup.aktivitetsplanWrapper).on('dragstart', `.${CssClasses.indholdContainerClass}`,
						evt => {
							if (!aktplanSetup.kalenderTabSetup?.useDragAndDrop)
								return;

							if (!evt.originalEvent) {
								console.log("!evt.originalEvent");
								return;
							}

							DragAndDrop.Boxes.EventHandlers.OnDragStart(evt.originalEvent, postbackTarget, aktplanSetup.aktivitetsplanWrapper);
						});

					$(aktplanSetup.aktivitetsplanWrapper).on('dragend', `.${CssClasses.indholdContainerClass}`,
						evt => {
							if (!aktplanSetup.kalenderTabSetup?.useDragAndDrop)
								return;

							if (!evt.originalEvent) {
								console.log("!evt.originalEvent");
								return;
							}

							DragAndDrop.Boxes.EventHandlers.OnDragEnd(evt.originalEvent, postbackTarget, aktplanSetup.aktivitetsplanWrapper);
						});

					$(aktplanSetup.aktivitetsplanWrapper).on('dragenter', `.${CssClasses.indholdContainerClass}`,
						evt => {
							if (!aktplanSetup.kalenderTabSetup?.useDragAndDrop)
								return;

							if (!evt.originalEvent) {
								console.log("!evt.originalEvent");
								return;
							}

							DragAndDrop.Boxes.EventHandlers.OnDragEnter(evt.originalEvent, postbackTarget, aktplanSetup.aktivitetsplanWrapper);
						});

					$(aktplanSetup.aktivitetsplanWrapper).on('dragover', `.${CssClasses.indholdContainerClass}`,
						evt => {
							if (!aktplanSetup.kalenderTabSetup?.useDragAndDrop)
								return;

							if (!evt.originalEvent) {
								console.log("!evt.originalEvent");
								return;
							}

							DragAndDrop.Boxes.EventHandlers.OnDragOver(evt.originalEvent, postbackTarget, aktplanSetup.aktivitetsplanWrapper);
						});

					$(aktplanSetup.aktivitetsplanWrapper).on('drop', `.${CssClasses.indholdContainerClass}`,
						evt => {
							if (!aktplanSetup.kalenderTabSetup?.useDragAndDrop)
								return;

							if (!evt.originalEvent) {
								console.log("!evt.originalEvent");
								return;
							}

							DragAndDrop.Boxes.EventHandlers.OnDrop(evt.originalEvent, postbackTarget, aktplanSetup.aktivitetsplanWrapper);
						});
				}
			}
		}

		namespace KalenderVisningUtilities {

			/* ****************************/
			/* **** Global              ***/
			/* ****************************/
			/// Forsøger at hente et AnyLectioId fra et HTML-element
			export function GetLectioIdForEntityNullable(entity: HTMLElement): string | null {
				return entity.dataset.entityid ?? null;
			}

			/// Henter et AnyLectioId fra et HTML-element
			export function GetLectioIdForEntity(entity: HTMLElement): string {
				const id: string | null = GetLectioIdForEntityNullable(entity);

				LectioJSUtils.AssertNotNullOrEmpty(id, 'GetLectioIdForEntity');

				return id;
			}

			/// Sand hvis elementet kan vælges (i.e. hvis det har et AnyLectioId)
			export function IsSelectableBox(entity: HTMLElement): boolean {
				return GetLectioIdForEntityNullable(entity) != null;
			}

			/// Sand hvis en blå boks kan slippes over elementet
			export function IsDragAndDropTarget(entity: HTMLElement): boolean {
				return entity.classList.contains(CssClasses.fullWeekBoxClass)
					|| entity.classList.contains(CssClasses.partialLukkeWeekBoxClass)
					|| entity.classList.contains(CssClasses.lukkeWeekBoxClass)
					|| entity.classList.contains(CssClasses.invisibleBoxesClass)
					|| entity.classList.contains(CssClasses.blueBoxBaseClass);
			}

			/// Sand hvis en box er en usynlig box, kun til drag and drop
			export function IsInvisibleBox(entity: HTMLElement): boolean {
				return entity.classList.contains(CssClasses.invisibleBoxesClass);
			}

			/// Sand hvis boksen er en del af baggrunden i kalendervisningen (hvide, grå, usynlige kasser)
			export function IsBackgroundBox(entity: HTMLElement): boolean {
				return entity.classList.contains(CssClasses.fullWeekBoxClass)
					|| entity.classList.contains(CssClasses.partialLukkeWeekBoxClass)
					|| entity.classList.contains(CssClasses.lukkeWeekBoxClass)
					|| entity.classList.contains(CssClasses.invisibleBoxesClass);
			}

			/// Utility funktion til at lave postbacks til aktivitetsplanen
			export function DoPostback(postbackTarget: string | undefined, action: string, postbackArg: string): void {
				LectioJSUtils.AssertNotNullOrEmpty(postbackTarget, 'postbackTarget');
				window.__doPostBack(postbackTarget, action + ' ' + postbackArg);
			}

			/// Utility funktion til at checke om en belastning-box er tom
			export function IsEmptyBelastningBox(entity: HTMLElement): boolean {
				return entity.classList.contains(CssClasses.belastningBoxEmptyClass);
			}



			/* ****************************/
			/* **** Boxes in general    ***/
			/* ****************************/
			/// Scroller lodret og vandret i kalendervisningen for at sikre at en box er synlig
			export function EnsureIsBoxVisible(box: HTMLElement, aktivitetsplan: HTMLElement) {
				const paddingLeft: number = 10; // How much space to leave on the left side of the element after scrolling
				const paddingRight: number = 10; // How much space to leave on the right side of the element after scrolling

				const paddingTop: number = 10; // How much space to leave on the top of the element after scrolling
				const paddingBottom: number = 10; // How much space to leave on the bottom of the element after scrolling

				const extraPaddingWhenScrollbarIsVisible: number = 15; // Additional padding added when there is a scrollbar on the calendar

				{ // Scroll left-right
					const hasVerticalScrollbar: boolean = aktivitetsplan.scrollHeight > aktivitetsplan.clientHeight;

					const entityBar: HTMLElement | null = aktivitetsplan.querySelector(`.${CssClasses.entityContainerClass}`);
					const entityBarWidth: number = entityBar?.offsetWidth ?? 0;

					const boxLeft: number = box.offsetLeft;
					const boxRight: number = box.offsetLeft + box.offsetWidth;

					const kalenderLeft: number = aktivitetsplan.offsetLeft;
					const kalenderRight: number = aktivitetsplan.offsetLeft + aktivitetsplan.offsetWidth;

					const leftSideIsNotInView: boolean = boxLeft - paddingLeft - entityBarWidth < kalenderLeft + aktivitetsplan.scrollLeft;
					const rightSideIsNotInView: boolean = boxRight + paddingRight + (hasVerticalScrollbar ? extraPaddingWhenScrollbarIsVisible : 0) > kalenderRight + aktivitetsplan.scrollLeft;

					let scrollLeftOffset: number = 0;

					// Check if left side of the element is not in view
					if (leftSideIsNotInView)
						scrollLeftOffset = boxLeft - paddingLeft - entityBarWidth - kalenderLeft - aktivitetsplan.scrollLeft;

					// Check if right side of the element is not in view
					else if (rightSideIsNotInView)
						scrollLeftOffset = boxRight + paddingRight + (hasVerticalScrollbar ? extraPaddingWhenScrollbarIsVisible : 0) - kalenderRight - aktivitetsplan.scrollLeft;

					if (scrollLeftOffset != 0)
						aktivitetsplan.scrollLeft += scrollLeftOffset;
				}

				{ // Scroll up-down
					const hasHorizontalScrollbar: boolean = aktivitetsplan.scrollHeight > aktivitetsplan.clientHeight;

					const calendarBar: HTMLElement | null = aktivitetsplan.querySelector(`.${CssClasses.kalenderContainerClass}`);
					const calendarBarHeight: number = calendarBar?.offsetHeight ?? 0;

					const boxTop: number = box.offsetTop;
					const boxBottom: number = box.offsetTop + box.offsetHeight;

					const kalenderTop: number = aktivitetsplan.offsetTop;
					const kalenderBottom: number = aktivitetsplan.offsetTop + aktivitetsplan.offsetHeight;

					const topIsNotInView: boolean = boxTop - paddingTop - calendarBarHeight < kalenderTop + aktivitetsplan.scrollTop;
					const bottomIsNotInView: boolean = boxBottom + paddingBottom + (hasHorizontalScrollbar ? extraPaddingWhenScrollbarIsVisible : 0) > kalenderBottom + aktivitetsplan.scrollTop;

					let scrollTopOffset: number = 0;

					// Check if top of the element is not in view
					if (topIsNotInView)
						scrollTopOffset = boxTop - paddingTop - calendarBarHeight - kalenderTop - aktivitetsplan.scrollTop;

					// check if bottom of the element is not in view
					else if (bottomIsNotInView)
						scrollTopOffset = boxBottom + paddingBottom + (hasHorizontalScrollbar ? extraPaddingWhenScrollbarIsVisible : 0) - kalenderBottom - aktivitetsplan.scrollTop;

					if (scrollTopOffset != 0)
						aktivitetsplan.scrollTop += scrollTopOffset;
				}
			}

			/// Henter informationer ud om et box-element fra kalenderen
			export function GetBoxInfo(elem: HTMLElement): BoxInfo {
				const row: number = parseInt(elem.style.gridRow);
				const colStart: number = parseInt(elem.style.gridColumnStart);
				const colEndInclusive: number = elem.style.gridColumnEnd.substring(0, 4).toLowerCase() == "span"
					? colStart + parseInt(elem.style.gridColumnEnd.substring(5)) - 1
					: colStart;

				return {
					box: elem,
					row: row,
					colStart: colStart,
					colEndInclusive: colEndInclusive
				}
			}

			/// Sand hvis en box kan trækkes med drag and drop
			export function BoxIsDraggable(entity: HTMLElement): boolean {
				return IsBlueBox(entity);
			}

			/// Finder alle boxe som overlapper x og y koordinater
			export function GetAllBoxesFromPosition(aktivitetsplan: HTMLElement, x: number, y: number) {
				const entityInSameRow = GetAllEntities()
					.map(entity => {
						return {
							entity: entity,
							boundingBox: entity.getBoundingClientRect(),
						};
					})
					.sort((entity1, entity2) => entity1.boundingBox.top - entity2.boundingBox.top)
					.first(entity => entity.boundingBox.bottom > y)
					.entity;

				const correctRow = parseInt(entityInSameRow.style.gridRow);

				return GetAllBoxesInRow(aktivitetsplan, correctRow)
					.filter(elem => {
						const boundingBox = elem.getBoundingClientRect();
						return boundingBox.left <= x && boundingBox.right >= x;
					});
			}

			/// Til sortering af en liste af boxe, så boxene der starter længest til venstre visuelt ligger først
			export function SortBoxesLeftToRight(box1: HTMLElement, box2: HTMLElement): number {
				return SortBoxesLeftToRightImpl(GetBoxInfo(box1), GetBoxInfo(box2));
			}
			function SortBoxesLeftToRightImpl(box1: BoxInfo, box2: BoxInfo): number {
				return box1.colStart - box2.colStart;
			}

			/// Til sortering af en liste af boxe, så boxene der slutter længest til højre visuelt ligger først
			export function SortBoxesRightToLeft(box1: HTMLElement, box2: HTMLElement): number {
				return SortBoxesRightToLeftImpl(GetBoxInfo(box1), GetBoxInfo(box2));
			}
			function SortBoxesRightToLeftImpl(box1: BoxInfo, box2: BoxInfo): number {
				return box2.colEndInclusive - box1.colEndInclusive;
			}

			/// Returnerer den sidst fundne boks som overlapper det givne kolonnenummer i den givne række
			export function TryGetVisibleBoxFromRC(aktivitetsplan: HTMLElement, rowNum: number, colNum: number): HTMLElement | null {
				const matchingBoxes: HTMLElement[] = GetAllBoxesInRow(aktivitetsplan, rowNum)
					.filter(elem => {
						if (IsInvisibleBox(elem))
							return false;

						const boxInfo: BoxInfo = GetBoxInfo(elem);
						return boxInfo.colStart <= colNum && boxInfo.colEndInclusive >= colNum
					});

				if (matchingBoxes.length == 0)
					return null;

				// Vælger det sidste element for at få det der ligger "øverst" visuelt
				return matchingBoxes.last();
			}

			/// Returnerer baggrunds-boxen som overlapper det givne kolonnenummer i den givne række
			export function GetBackgroundBoxFromRC(aktivitetsplan: HTMLElement, rowNum: number, colNum: number): HTMLElement | null {
				const matchingBoxes = GetAllBoxesInRow(aktivitetsplan, rowNum)
					.filter(elem => {
						if (!IsBackgroundBox(elem))
							return false;

						const boxInfo: BoxInfo = GetBoxInfo(elem);
						return boxInfo.colStart <= colNum && boxInfo.colEndInclusive >= colNum;
					});

				if (matchingBoxes.length == 0)
					return null;

				return matchingBoxes.first();
			}

			/// Returnerer alle boxe som ligger i den givne række og overlapper med det givne kolonne-interval
			export function GetBoxesFromRCSpan(aktivitetsplan: HTMLElement, rowNum: number, colStart: number, colEndIncluded: number): HTMLElement[] {
				return GetAllBoxesInRow(aktivitetsplan, rowNum)
					.filter(elem => {
						const boxInfo: BoxInfo = GetBoxInfo(elem);
						return boxInfo.colStart <= colEndIncluded && boxInfo.colEndInclusive >= colStart
					});
			}

			/// Returnerer alle baggrunds-boxe som ligger i den givne række og overlapper med det givne kolonne-interval
			export function GetBackgroundBoxesFromRCSpan(aktivitetsplan: HTMLElement, rowNum: number, colStart: number, colEndIncluded: number): HTMLElement[] {
				return GetBoxesFromRCSpan(aktivitetsplan, rowNum, colStart, colEndIncluded)
					.filter(elem => IsBackgroundBox(elem));
			}

			/// Fjerner highlight og select fra alle boxes
			export function DeselectAndDehighlightAllBoxes(aktivitetsplan: HTMLElement): void {
				let selectedBox: HTMLElement | null = GetSelectedBox(aktivitetsplan);
				while (selectedBox) {
					DeselectBox(selectedBox);
					selectedBox = GetSelectedBox(aktivitetsplan);
				}

				const highlightedBoxes: HTMLElement[] = GetAllHighlightedBoxes(aktivitetsplan);
				for (const box of highlightedBoxes)
					DehighlightBox(box);
			}

			/// Sand hvis boxen allerede er selected
			export function BoxIsSelected(box: HTMLElement): boolean {
				return box.classList.contains(CssClasses.boxSelectedClass)
			}

			/// Sand hvis boxen allerede er highlighted
			export function BoxIsHighlighted(box: HTMLElement): boolean {
				return box.classList.contains(CssClasses.boxHighlightedClass)
			}

			/// Returnerer alle boxes
			export function GetAllBoxes(aktivitetsplan: HTMLElement): HTMLElement[] {
				return aktivitetsplan.querySelectorAll(`.${CssClasses.indholdContainerClass} > div:not(.${CssClasses.aktivitettypeOverskriftClass})`)
					.map(elem => elem as HTMLElement);
			}

			/// Returnerer alle boxes i en række
			export function GetAllBoxesInRow(aktivitetsplan: HTMLElement, rowNum: number): HTMLElement[] {
				LectioJSUtils.AssertNotNullOrUndefined(aktplanSetup.kalenderTabSetup, "kalendersetup var null");

				if (!aktplanSetup.kalenderTabSetup?.boxByRowCache.has(rowNum))
				{
					const boxes = aktivitetsplan.querySelectorAll(`.${CssClasses.indholdContainerClass} > div:not(.${CssClasses.aktivitettypeOverskriftClass})[data-row="${rowNum}"]`)
						.map(elem => elem as HTMLElement);
					aktplanSetup.kalenderTabSetup.boxByRowCache.set(rowNum, boxes);

					return boxes;
				}

				return aktplanSetup.kalenderTabSetup.boxByRowCache.get(rowNum) ?? [];
			}

			/// Returnerer alle highlightede boxes
			export function GetAllHighlightedBoxes(aktivitetsplan: HTMLElement): HTMLElement[] {
				return aktivitetsplan.querySelectorAll(`.${CssClasses.boxHighlightedClass}`)
					.map(elem => elem as HTMLElement);
			}

			/// Fjerner highlight fra en box
			export function DehighlightBox(box: HTMLElement): void {
				box.classList.remove(CssClasses.boxHighlightedClass);
			}

			/// Tilføjer highlighting til en box
			export function HighlightBox(box: HTMLElement): void {
				box.classList.add(CssClasses.boxHighlightedClass);
			}

			/// Returnerer den nuværende valgte box
			export function GetSelectedBox(aktivitetsplan: HTMLElement): HTMLElement | null {
				return aktivitetsplan.querySelector(`.${CssClasses.boxSelectedClass}`) as HTMLElement | null;
			}

			/// Returnerer alle nuværende valgte boxe
			export function GetSelectedBoxes(aktivitetsplan: HTMLElement): NodeListOf<HTMLElement> | null {
				return aktivitetsplan.querySelectorAll(`.${CssClasses.boxSelectedClass}`) as NodeListOf<HTMLElement> | null;
			}

			/// Fjerner select fra en box
			export function DeselectBox(box: HTMLElement): void {
				box.classList.remove(CssClasses.boxSelectedClass);
			}

			/// Tilføjer select til en box
			export function SelectBox(box: HTMLElement): void {
				box.classList.add(CssClasses.boxSelectedClass);
			}

			/// Returnerer alle boxes med det givne entityid
			export function GetAllBoxesWithEntityId(aktivitetsplan: HTMLElement, entityId: string): HTMLElement[] {
				return aktivitetsplan.querySelectorAll(`.${CssClasses.indholdContainerClass} > div[data-entityid="${entityId}"]`)
					.map(elem => elem as HTMLElement);
			}

			/// Vælger en box. Hvis boxen er en blå box highlightes også alle andre boxe med samme entityid
			export function SelectBoxAndHighlightSimilarBoxes(box: HTMLElement, aktivitetsplan: HTMLElement): void {
				SelectBox(box);

				if (IsBlueBox(box)) {
					const anyLectioId: string = GetLectioIdForEntity(box);

					const allBoxesWithSameEntityId: HTMLElement[] = GetAllBoxesWithEntityId(aktivitetsplan, anyLectioId);

					for (const box of allBoxesWithSameEntityId) {
						HighlightBox(box);
						HighlightEntitiesForBox(box);
					}
				}
			}



			/* ****************************/
			/* **** Weeks               ***/
			/* ****************************/
			/// Finder de uge-elementer i toppen af kalenderen som ligger i de valgte kolonner
			export function TryGetWeeksFromColSpan(colStart: number, colEndInclusive: number): HTMLElement[] {
				return GetAllWeeks()
					.filter(elem => {
						const boxInfo: BoxInfo = GetBoxInfo(elem);

						return boxInfo.colStart >= colStart && boxInfo.colEndInclusive <= colEndInclusive;
					});
			}

			/// Finder det første uge-element i toppen af kalenderen som ligger i de valgte kolonner
			export function TryGetWeekFromColSpan(colStart: number, colEndInclusive: number): HTMLElement | null {
				const weeks: HTMLElement[] = TryGetWeeksFromColSpan(colStart, colEndInclusive);

				if (weeks.length == 0)
					return null;

				LectioJSUtils.AssertArgument(weeks.length == 1);

				return weeks.first();
			}

			/// Highlighter den korresponderende uge/uger for en box i kalenderen
			export function HighlightWeekForBox(box: HTMLElement): void {
				// Markering af uger
				const boxInfo: BoxInfo = GetBoxInfo(box);

				const weeks: HTMLElement[] = TryGetWeeksFromColSpan(boxInfo.colStart, boxInfo.colEndInclusive);

				for (const week of weeks)
					HighlightWeek(week);
			}

			/// Returnerer alle uge-elementer i toppen af kalenderen
			export function GetAllWeeks(): HTMLElement[] {
				return document.querySelectorAll(`.${CssClasses.kalenderWeekContainerClass} > .${CssClasses.kalenderSingleWeekClass}`)
					.map(elem => elem as HTMLElement);
			}

			/// Fjerner highlight fra alle uge-elementer i toppen af kalenderen
			export function DehighlightAllWeeks(aktivitetsplan: HTMLElement): void {
				for (const week of GetAllWeeks())
					DehighlightWeek(week);
			}

			/// Fjerner highlight fra et enkelt uge-element i toppen af kalenderen
			export function DehighlightWeek(week: HTMLElement): void {
				week.classList.remove(CssClasses.weekHighlightedClass);
			}

			/// Tilføjer highlighting til et enkelt uge-element i toppen af kalenderen
			export function HighlightWeek(week: HTMLElement): void {
				week.classList.add(CssClasses.weekHighlightedClass);
			}



			/* ****************************/
			/* **** Blue boxes          ***/
			/* ****************************/
			/// Checker om en box er en blå box
			export function IsBlueBox(entity: HTMLElement): boolean {
				return IsSelectableBox(entity) && !IsBelastningBox(entity);
			}

			/// Laver postback og viser den blå box i aktivitetsplanens detalje-visning
			export function DoPostbackToShowAktplanEntityDetails_BlueBox(postbackTarget: string, box: HTMLElement): void {
				const anyLectioId: string = GetLectioIdForEntity(box);

				DoPostback(postbackTarget, "select_entity", anyLectioId);
			}

			/// Finder en usynlig box fra et events koordinater
			export function TryFindInvisibleBoxFromPosition(e: DragEvent, aktivitetsplan: HTMLElement): HTMLElement | null {
				return GetAllBoxesFromPosition(aktivitetsplan, e.clientX, e.clientY)
					.firstOrDefault(elem => IsInvisibleBox(elem))
					?? null;
			}



			/* ****************************/
			/* **** Belastning boxes    ***/
			/* ****************************/
			/// Forsøger at returnerer ugetal og årstal korresponderende til den givne belastnings-box
			export function GetWeekNumForWeekBoxNullable(entity: HTMLElement): string | null {
				return entity.dataset.singleweek ?? null;
			}

			/// Returnerer ugetal og årstal korresponderende til den givne belastnings-box
			export function GetWeekNumForWeekBox(entity: HTMLElement): string {
				const weekNum: string | null = GetWeekNumForWeekBoxNullable(entity);

				LectioJSUtils.AssertNotNullOrEmpty(weekNum, "GetWeekNumForWeekBox");

				return weekNum;
			}

			/// Returnerer ugetal og årstal korresponderende til den givne belastnings-box
			export function IsBelastningBox(entity: HTMLElement): boolean {
				return GetLectioIdForEntityNullable(entity) != null && GetWeekNumForWeekBoxNullable(entity) != null;
			}

			/// Laver postback og viser den valgte belastning-box i aktivitetsplanens detalje-visning
			export function DoPostbackToShowAktplanEntityDetails_SpecificWeek(postbackTarget: string, box: HTMLElement): void {
				const anyLectioId: string = GetLectioIdForEntity(box);

				const weekNum: string = GetWeekNumForWeekBox(box);

				const postbackVal: string = anyLectioId + "|" + weekNum;
				DoPostback(postbackTarget, "select_entity_single_week", postbackVal);
			}



			/* ****************************/
			/* **** Entities            ***/
			/* ****************************/
			/// Laver postback og viser den valgte entitet i aktivitetsplanens detalje-visning
			export function DoPostbackToShowAktplanEntityDetails(postbackTarget: string, entity: HTMLElement): void {
				const anyLectioId: string = GetLectioIdForEntity(entity);

				DoPostback(postbackTarget, "select_entity", anyLectioId);
			}

			/// Laver postback og fjerner indholdet af aktivitesplanens detalje-visning
			export function DoPostbackClearingAktplanDetails(postbackTarget: string): void {
				DoPostback(postbackTarget, "deselect_entity", "")
			}

			/// Giver alle entiteter for den samme entitet som i den givne række
			export function GetEntitiesFromRow(rowNum: number): HTMLElement[] | null {
				// EntityIds i denne række
				const entityId: string | undefined = GetEntityFromRow(rowNum)?.dataset.entityid;

				if (!entityId)
					return null;

				// Alle entiteter som har samme entityid som denne række
				const entities: HTMLElement[] = GetAllEntities()
					.filter(elem => elem.dataset.entityid == entityId);

				return entities;
			}

			/// Giver entiteten i den givne række
			export function GetEntityFromRow(rowNum: number): HTMLElement | null {
				const entities: HTMLElement[] = GetAllEntities()
					.filter(elem => elem.style.gridRow == rowNum.toString());

				if (entities.length == 0)
					return null;

				return entities.first();
			}

			/// Giver alle entiteter
			export function GetAllEntities(): HTMLElement[] {
				return document.querySelectorAll(`.${CssClasses.entityContainerClass} > .${CssClasses.entitySingleClass}`)
					.map(elem => elem as HTMLElement);
			}

			/// Vælger entiteten tilhørende en box i kalender-visningen
			export function SelectAndHighlightEntitiesForBox(box: HTMLElement): void {
				HighlightEntitiesForBox(box);

				const entity: HTMLElement | null = GetEntityFromRow(GetBoxInfo(box).row);

				LectioJSUtils.AssertNotNullOrUndefined(entity, "Entitet som skal vælges var null");

				SelectEntity(entity);
			}

			/// Highlighter alle entiteter tilhørende en box i kalender-visningen
			export function HighlightEntitiesForBox(box: HTMLElement): void {
				const rowNum: number = GetBoxInfo(box).row;
				const entities: HTMLElement[] | null = GetEntitiesFromRow(rowNum);

				if (entities)
					for (const entity of entities)
						HighlightEntity(entity);
			}

			/// Fjerner highlight og selection fra alle entiteter
			export function DeselectAndDehighlightAllEntities(aktivitetsplan: HTMLElement): void {
				const selectedEntity: HTMLElement | null = GetSelectedEntity(aktivitetsplan);
				if (selectedEntity)
					DeselectEntity(selectedEntity);

				const highlightedEntities: HTMLElement[] = GetAllHighlightedEntities(aktivitetsplan);
				for (const entity of highlightedEntities)
					DehighlightEntity(entity);
			}

			/// Sand hvis en entitet allerede er valgt
			export function EntityIsSelected(entity: HTMLElement): boolean {
				return entity.classList.contains(CssClasses.entitySelectedClass)
			}

			/// Sand hvis en entitet allerede er highlighted
			export function EntityIsHighlighted(entity: HTMLElement): boolean {
				return entity.classList.contains(CssClasses.entityHighlightedClass)
			}

			/// Returnerer alle highlightede entiteter
			export function GetAllHighlightedEntities(aktivitetsplan: HTMLElement): HTMLElement[] {
				return aktivitetsplan.querySelectorAll(`.${CssClasses.entityHighlightedClass}`)
					.map(elem => elem as HTMLElement);
			}

			/// Fjerner highlight fra en entitet
			export function DehighlightEntity(entity: HTMLElement): void {
				entity.classList.remove(CssClasses.entityHighlightedClass);
			}

			/// Tilføjer highlighting til en entitet
			export function HighlightEntity(entity: HTMLElement): void {
				entity.classList.add(CssClasses.entityHighlightedClass);
			}

			/// Returnerer den nuværende valgte entitet
			export function GetSelectedEntity(aktivitetsplan: HTMLElement): HTMLElement | null {
				return aktivitetsplan.querySelector(`.${CssClasses.entitySelectedClass}`) as HTMLElement | null;
			}

			/// Fjerner select fra en entitet
			export function DeselectEntity(entity: HTMLElement): void {
				entity.classList.remove(CssClasses.entitySelectedClass);
			}

			/// Tilføjer select fra en entitet
			export function SelectEntity(entity: HTMLElement): void {
				entity.classList.add(CssClasses.entitySelectedClass);
			}

			/// Sand hvis en entitet kan vælges
			export function IsSelectableEntity(entity: HTMLElement): boolean {
				return entity.classList.contains(CssClasses.entitySingleClass);
			}
		}

		namespace CssClasses {
			// Entitet-liste: Listen til venstre, med navnene på uddannelsesforløb, elevforløb, etc.
			export const entityContainerClass: string = "aktivitetsplan-visning-entity-container";
			export const entitySingleClass: string = "aktivitetsplan-visning-entity";
			export const entitySelectedClass: string = "aktivitetsplan-visning-entity-selected";
			export const entityHighlightedClass: string = "aktivitetsplan-visning-entity-highlighted";

			// Kalender-liste: ugetal, månedsnavne, årstal
			export const kalenderContainerClass: string = "aktivitetsplan-visning-kalender-container";
			export const kalenderWeekContainerClass: string = "aktivitetsplan-week-container";
			export const kalenderMonthContainerClass: string = "aktivitetsplan-month-container";
			export const kalenderYearContainerClass: string = "aktivitetsplan-year-container";
			export const kalenderSingleWeekClass: string = "aktivitetsplan-visning-week";
			export const weekHighlightedClass: string = "aktivitetsplan-visning-week-highlighted";
			export const weekSelectedClass: string = "aktivitetsplan-visning-week-selected";
			export const kalenderSingleMonthClass: string = "aktivitetsplan-visning-month";
			export const kalenderSingleYearClass: string = "aktivitetsplan-visning-year";

			// Indhold-liste: Kasser i kalenderen, både blå, hvide og grå
			export const indholdContainerClass: string = "aktivitetsplan-visning-indhold-container";
			export const boxSelectedClass: string = "aktivitetsplan-visning-indhold-selected";
			export const boxHighlightedClass: string = "aktivitetsplan-visning-indhold-highlighted";
			export const blueBoxBaseClass: string = "aktivitetsplan-visning-week-in-entity-interval";
			export const invisibleBoxesClass: string = "aktivitetsplan-visning-invisible-drag-drop";
			export const lukkeWeekBoxClass: string = "aktivitetsplan-visning-lukke-week";
			export const partialLukkeWeekBoxClass: string = "aktivitetsplan-visning-partial-lukke-week";
			export const fullWeekBoxClass: string = "aktivitetsplan-visning-full-week";
			export const aktivitettypeOverskriftClass: string = "aktivitetsplan-visning-week-title";
			export const belastningBoxClass: string = "aktivitetsplan-visning-entity-belastning";
			export const belastningBoxEmptyClass: string = "aktivitetsplan-visning-entity-belastning-empty";

			// Drag and drop af blå kasser
			export const dragAndDropHoverClass: string = "drop-over"; // Highlighting af de kasser, der aktuelt holdes over
			export const dragAndDropGlobalClass: string = "dragging"; // Klasse til hele kalenderen når der er et drag and drop i gang
		}

		namespace TastaturNavigation {

			export namespace Entities {

				export namespace EventHandlers {

					/* ****************************/
					/* **** Keyboard Navigation ***/
					/* **** Entitetsliste       ***/
					/* ****************************/
					/// Event handler: Keyboard-navigation i entitets-listen til venstre
					export function OnKeyboardDown(e: JQuery.KeyDownEvent, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						const currentlySelected: HTMLElement | null = KalenderVisningUtilities.GetSelectedEntity(aktivitetsplan);
						if (!currentlySelected)
							return;

						const currentlySelectedRowStr: string = currentlySelected.style.gridRow;
						if (currentlySelectedRowStr.length == 0)
							return;

						const currentlySelectedRow: number = parseInt(currentlySelectedRowStr);

						switch (e.key) {
							case "ArrowUp":
								KeyboardNavigationEntityUtilities.SelectEntityAboveFrom(currentlySelectedRow, postbackTarget, aktivitetsplan);
								break;
							case "ArrowDown":
								KeyboardNavigationEntityUtilities.SelectEntityBelowFrom(currentlySelectedRow, postbackTarget, aktivitetsplan);
								break;
							default:
								return;
						}

						e.preventDefault(); //Prevent the default action (scroll / move caret)
					}
				}

				namespace KeyboardNavigationEntityUtilities {

					/// Vælger entiteten i entitets-listen under den givne
					export function SelectEntityBelowFrom(rowNum: number, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						// Flytter fokus til et element under det aktuelt fokuserede

						const entityOneAway: HTMLElement[] | null = KalenderVisningUtilities.GetEntitiesFromRow(rowNum + 1);
						const entityTwoAway: HTMLElement[] | null = KalenderVisningUtilities.GetEntitiesFromRow(rowNum + 2);
						const entities: HTMLElement[] | null = entityOneAway ?? entityTwoAway;
						const rowOffset: number = entityOneAway ? 1 : 2;

						// Check om cellen er udvidet
						if (entities) {
							const entity: HTMLElement | null = KalenderVisningUtilities.GetEntityFromRow(rowNum + rowOffset);
							LectioJSUtils.AssertNotNullOrUndefined(entity, "entitet under var null");

							KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktivitetsplan);

							KalenderVisningUtilities.DeselectAndDehighlightAllEntities(aktivitetsplan);
							KalenderVisningUtilities.SelectEntity(entity);
							for (const entity of entities)
								KalenderVisningUtilities.HighlightEntity(entity);

							KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails(postbackTarget, entity);
						}
					}

					/// Vælger entiteten i entitets-listen over den givne
					export function SelectEntityAboveFrom(rowNum: number, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						// Flytter fokus til et element over det aktuelt fokuserede

						const entityOneAway: HTMLElement[] | null = KalenderVisningUtilities.GetEntitiesFromRow(rowNum - 1);
						const entityTwoAway: HTMLElement[] | null = KalenderVisningUtilities.GetEntitiesFromRow(rowNum - 2);
						const entities: HTMLElement[] | null = entityOneAway ?? entityTwoAway;
						const rowOffset: number = entityOneAway ? 1 : 2;

						// Check om cellen er udvidet
						if (entities) {
							const entity: HTMLElement | null = KalenderVisningUtilities.GetEntityFromRow(rowNum - rowOffset);
							LectioJSUtils.AssertNotNullOrUndefined(entity, "entitet over var null");

							KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktivitetsplan);

							KalenderVisningUtilities.DeselectAndDehighlightAllEntities(aktivitetsplan);
							KalenderVisningUtilities.SelectEntity(entity);
							for (const entity of entities)
								KalenderVisningUtilities.HighlightEntity(entity);

							KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails(postbackTarget, entity);
						}
					}
				}
			}

			export namespace Boxes {
				/// Sørger bla. for at man kan gå ind og ud af en stor blå boks og ende samme sted.
				export let lastVisitedColumn: number;

				export namespace EventHandlers {

					/* ****************************/
					/* **** Keyboard Navigation ***/
					/* **** Boxes in general    ***/
					/* ****************************/

					/// Event handler: Keyboard-navigation i kalender-visningen
					export function OnKeyboardDown(e: JQuery.KeyDownEvent, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						const currentlySelected: HTMLElement | null = KalenderVisningUtilities.GetSelectedBox(aktivitetsplan);
						if (!currentlySelected)
							return;

						const currentlySelectedRowStr: string = currentlySelected.style.gridRow;
						const currentlySelectedColStr: string = currentlySelected.style.gridColumn;
						if (currentlySelectedRowStr.length == 0 || currentlySelectedColStr.length == 0)
							return;

						const currentlySelectedRow: number = parseInt(currentlySelectedRowStr);
						const currentlySelectedCol: number = parseInt(currentlySelectedColStr);

						const mods: EventMods = {
							ctrlKey: e.ctrlKey,
							altKey: e.altKey,
							shiftKey: e.shiftKey,
							metaKey: e.metaKey,
							button: -1,
						};
						const lecMods = LectioJSUtils.GetEventModifiers(mods);
						const ctrl_pressed = lecMods === LectioJSUtils.GetCtrlKeyOSSpecific();

						switch (e.key) {
							case "ArrowUp":
								KeyboardNavigationBoxUtilities.SelectBoxAboveFrom(currentlySelectedRow, currentlySelectedCol, postbackTarget, aktivitetsplan);
								break;
							case "ArrowDown":
								KeyboardNavigationBoxUtilities.SelectBoxBelowFrom(currentlySelectedRow, currentlySelectedCol, postbackTarget, aktivitetsplan);
								break;
							case "ArrowLeft":
								if (ctrl_pressed)
									KeyboardNavigationBoxUtilities.SkipToSelectableBoxLeftFrom(currentlySelectedRow, currentlySelectedCol, postbackTarget, aktivitetsplan);
								else
									KeyboardNavigationBoxUtilities.SelectBoxLeftFrom(currentlySelectedRow, currentlySelectedCol, postbackTarget, aktivitetsplan);
								break;
							case "ArrowRight":
								if (ctrl_pressed)
									KeyboardNavigationBoxUtilities.SkipToSelectableBoxRightFrom(currentlySelectedRow, currentlySelectedCol, postbackTarget, aktivitetsplan);
								else
									KeyboardNavigationBoxUtilities.SelectBoxRightFrom(currentlySelectedRow, currentlySelectedCol, postbackTarget, aktivitetsplan);
								break;
							default:
								return;
						}

						e.preventDefault(); //Prevent the default action (scroll / move caret)
					}
				}

				namespace KeyboardNavigationBoxUtilities {

					/// Vælger boksen i kalendervisningen under den givne. Springer højest 1 ikke-valgbar box over
					export function SelectBoxBelowFrom(rowNum: number, colNum: number, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						const thisBlueBox: HTMLElement | null = KalenderVisningUtilities.TryGetVisibleBoxFromRC(aktivitetsplan, rowNum, colNum);
						LectioJSUtils.AssertNotNullOrUndefined(thisBlueBox, "blue box");
						const boxInfo: BoxInfo = KalenderVisningUtilities.GetBoxInfo(thisBlueBox);

						const boxOneAway: HTMLElement | null = KalenderVisningUtilities.TryGetVisibleBoxFromRC(aktivitetsplan, boxInfo.row + 1, lastVisitedColumn);
						const boxTwoAway: HTMLElement | null = KalenderVisningUtilities.TryGetVisibleBoxFromRC(aktivitetsplan, boxInfo.row + 2, lastVisitedColumn);

						const newBox: HTMLElement | null = boxOneAway ?? boxTwoAway;

						// Check om boxen blev fundet
						if (newBox) {
							LectioJSUtils.AssertNotNullOrUndefined(newBox, "blå kasse under var null");

							KalenderVisningUtilities.DeselectAndDehighlightAllEntities(aktivitetsplan);
							KalenderVisningUtilities.HighlightEntitiesForBox(newBox);

							KalenderVisningUtilities.DehighlightAllWeeks(aktivitetsplan);
							KalenderVisningUtilities.HighlightWeekForBox(newBox);

							if (KalenderVisningUtilities.IsSelectableBox(newBox)) {
								KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktivitetsplan);
								KalenderVisningUtilities.SelectBoxAndHighlightSimilarBoxes(newBox, aktivitetsplan);

								// Postback
								if (KalenderVisningUtilities.IsBelastningBox(newBox))
									KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails_SpecificWeek(postbackTarget, newBox)
								else if (KalenderVisningUtilities.IsBlueBox(newBox))
									KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails_BlueBox(postbackTarget, newBox);
							}
							else {
								KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktivitetsplan);
								KalenderVisningUtilities.SelectBox(newBox);
								KalenderVisningUtilities.HighlightBox(newBox);

								KalenderVisningUtilities.DoPostbackClearingAktplanDetails(postbackTarget);
							}

							KalenderVisningUtilities.EnsureIsBoxVisible(newBox, aktplanSetup.aktivitetsplan);
						}
					}

					/// Vælger boksen i kalendervisningen over den givne. Springer højest 1 ikke-valgbar box over
					export function SelectBoxAboveFrom(rowNum: number, colNum: number, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						const thisBox: HTMLElement | null = KalenderVisningUtilities.TryGetVisibleBoxFromRC(aktivitetsplan, rowNum, colNum);
						LectioJSUtils.AssertNotNullOrUndefined(thisBox, "thisBox");
						const boxInfo: BoxInfo = KalenderVisningUtilities.GetBoxInfo(thisBox);

						const boxOneAway: HTMLElement | null = KalenderVisningUtilities.TryGetVisibleBoxFromRC(aktivitetsplan, boxInfo.row - 1, lastVisitedColumn);
						const boxTwoAway: HTMLElement | null = KalenderVisningUtilities.TryGetVisibleBoxFromRC(aktivitetsplan, boxInfo.row - 2, lastVisitedColumn);

						const newBox: HTMLElement | null = boxOneAway ?? boxTwoAway

						// Check om boxen blev fundet
						if (newBox) {
							LectioJSUtils.AssertNotNullOrUndefined(newBox, "blå kasse over var null");

							KalenderVisningUtilities.DeselectAndDehighlightAllEntities(aktivitetsplan);
							KalenderVisningUtilities.HighlightEntitiesForBox(newBox);

							KalenderVisningUtilities.DehighlightAllWeeks(aktivitetsplan);
							KalenderVisningUtilities.HighlightWeekForBox(newBox);

							if (KalenderVisningUtilities.IsSelectableBox(newBox)) {
								KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktivitetsplan);
								KalenderVisningUtilities.SelectBoxAndHighlightSimilarBoxes(newBox, aktivitetsplan);

								// Postback
								if (KalenderVisningUtilities.IsBelastningBox(newBox))
									KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails_SpecificWeek(postbackTarget, newBox)
								else
									KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails_BlueBox(postbackTarget, newBox);
							}
							else {
								KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktivitetsplan);
								KalenderVisningUtilities.SelectBox(newBox);
								KalenderVisningUtilities.HighlightBox(newBox);

								KalenderVisningUtilities.DoPostbackClearingAktplanDetails(postbackTarget);
							}

							KalenderVisningUtilities.EnsureIsBoxVisible(newBox, aktplanSetup.aktivitetsplan);
						}
					}

					/// Vælger boksen i kalendervisningen til venstre for den givne. Springer ingen boxe over.
					export function SelectBoxLeftFrom(rowNum: number, colNum: number, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						const thisBox: HTMLElement | null = KalenderVisningUtilities.TryGetVisibleBoxFromRC(aktivitetsplan, rowNum, colNum);
						LectioJSUtils.AssertArgument(!!thisBox);
						const boxInfo: BoxInfo = KalenderVisningUtilities.GetBoxInfo(thisBox);

						const newBox: HTMLElement | null = KalenderVisningUtilities.TryGetVisibleBoxFromRC(aktivitetsplan, boxInfo.row, boxInfo.colStart - 1);

						// Check om boxen blev fundet
						if (newBox) {
							KalenderVisningUtilities.DeselectAndDehighlightAllEntities(aktivitetsplan);
							KalenderVisningUtilities.HighlightEntitiesForBox(newBox);

							KalenderVisningUtilities.DehighlightAllWeeks(newBox);
							KalenderVisningUtilities.HighlightWeekForBox(newBox);

							lastVisitedColumn = KalenderVisningUtilities.GetBoxInfo(newBox).colEndInclusive;

							if (KalenderVisningUtilities.IsSelectableBox(newBox)) {
								KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktivitetsplan);
								KalenderVisningUtilities.SelectBoxAndHighlightSimilarBoxes(newBox, aktivitetsplan);

								// Postback
								if (KalenderVisningUtilities.IsBelastningBox(newBox))
									KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails_SpecificWeek(postbackTarget, newBox);
								else
									KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails_BlueBox(postbackTarget, newBox);
							}
							else {
								KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktivitetsplan);
								KalenderVisningUtilities.SelectBox(newBox);

								KalenderVisningUtilities.DoPostbackClearingAktplanDetails(postbackTarget);
							}

							KalenderVisningUtilities.EnsureIsBoxVisible(newBox, aktplanSetup.aktivitetsplan);
						}
					}

					/// Vælger den første blå box eller belastningsbox i kalendervisningen til venstre for den givne. Springer alle ikke-blå boxe over.
					export function SkipToSelectableBoxLeftFrom(rowNum: number, colNum: number, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						const boxWithCorrectColEnd: HTMLElement | undefined = KalenderVisningUtilities.GetAllBoxesInRow(aktivitetsplan, rowNum)
							.filter(box => KalenderVisningUtilities.IsSelectableBox(box) && !KalenderVisningUtilities.IsEmptyBelastningBox(box))
							.sort((box1: HTMLElement, box2: HTMLElement) =>
								KalenderVisningUtilities.SortBoxesRightToLeft(box1, box2))
							.firstOrDefault(box => KalenderVisningUtilities.GetBoxInfo(box).colEndInclusive < colNum);

						if (boxWithCorrectColEnd) {
							const correctBoxInfo: BoxInfo = KalenderVisningUtilities.GetBoxInfo(boxWithCorrectColEnd);

							const newBox: HTMLElement | null = KalenderVisningUtilities.TryGetVisibleBoxFromRC(aktivitetsplan, correctBoxInfo.row, correctBoxInfo.colEndInclusive);

							if (newBox) {
								KalenderVisningUtilities.DeselectAndDehighlightAllEntities(aktivitetsplan);
								KalenderVisningUtilities.HighlightEntitiesForBox(newBox);

								KalenderVisningUtilities.DehighlightAllWeeks(newBox);
								KalenderVisningUtilities.HighlightWeekForBox(newBox);

								lastVisitedColumn = KalenderVisningUtilities.GetBoxInfo(newBox).colEndInclusive;

								KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktivitetsplan);
								KalenderVisningUtilities.SelectBoxAndHighlightSimilarBoxes(newBox, aktivitetsplan);

								// Postback
								if (KalenderVisningUtilities.IsBelastningBox(newBox))
									KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails_SpecificWeek(postbackTarget, newBox);
								else
									KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails_BlueBox(postbackTarget, newBox);

								KalenderVisningUtilities.EnsureIsBoxVisible(newBox, aktplanSetup.aktivitetsplan);
							}
						}
					}

					/// Vælger boksen i kalendervisningen til højre for den givne. Springer ingen boxe over.
					export function SelectBoxRightFrom(rowNum: number, colNum: number, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						const thisBox: HTMLElement | null = KalenderVisningUtilities.TryGetVisibleBoxFromRC(aktivitetsplan, rowNum, colNum);
						LectioJSUtils.AssertNotNullOrUndefined(thisBox, 'box');

						const boxInfo: BoxInfo = KalenderVisningUtilities.GetBoxInfo(thisBox);

						const newBox: HTMLElement | null = KalenderVisningUtilities.TryGetVisibleBoxFromRC(aktivitetsplan, boxInfo.row, boxInfo.colEndInclusive + 1);

						// Check om boxen blev fundet
						if (newBox) {
							KalenderVisningUtilities.DeselectAndDehighlightAllEntities(aktivitetsplan);
							KalenderVisningUtilities.HighlightEntitiesForBox(newBox);

							KalenderVisningUtilities.DehighlightAllWeeks(aktivitetsplan);
							KalenderVisningUtilities.HighlightWeekForBox(newBox);

							lastVisitedColumn = KalenderVisningUtilities.GetBoxInfo(newBox).colStart;

							if (KalenderVisningUtilities.IsSelectableBox(newBox)) {
								KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktivitetsplan);
								KalenderVisningUtilities.SelectBoxAndHighlightSimilarBoxes(newBox, aktivitetsplan);

								// Postback
								if (KalenderVisningUtilities.IsBelastningBox(newBox))
									KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails_SpecificWeek(postbackTarget, newBox);
								else
									KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails_BlueBox(postbackTarget, newBox);
							}
							else {
								KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktivitetsplan);
								KalenderVisningUtilities.SelectBox(newBox);

								KalenderVisningUtilities.DoPostbackClearingAktplanDetails(postbackTarget);
							}

							KalenderVisningUtilities.EnsureIsBoxVisible(newBox, aktplanSetup.aktivitetsplan);
						}
					}

					/// Vælger den første blå box eller belastningsbox i kalendervisningen til højre for den givne. Springer alle ikke-blå boxe over.
					export function SkipToSelectableBoxRightFrom(rowNum: number, colNum: number, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						const thisBox: HTMLElement | null = KalenderVisningUtilities.TryGetVisibleBoxFromRC(aktivitetsplan, rowNum, colNum);
						LectioJSUtils.AssertNotNullOrUndefined(thisBox, 'box');

						const boxInfo: BoxInfo = KalenderVisningUtilities.GetBoxInfo(thisBox);

						const boxWithCorrectColStart: HTMLElement | undefined = KalenderVisningUtilities.GetAllBoxesInRow(aktivitetsplan, rowNum)
							.filter(box => KalenderVisningUtilities.IsSelectableBox(box) && !KalenderVisningUtilities.IsEmptyBelastningBox(box))
							.sort((box1: HTMLElement, box2: HTMLElement) =>
								KalenderVisningUtilities.SortBoxesLeftToRight(box1, box2))
							.firstOrDefault(box => KalenderVisningUtilities.GetBoxInfo(box).colStart > boxInfo.colEndInclusive);

						if (boxWithCorrectColStart) {
							const correctBoxInfo: BoxInfo = KalenderVisningUtilities.GetBoxInfo(boxWithCorrectColStart);

							const newBox: HTMLElement | null = KalenderVisningUtilities.TryGetVisibleBoxFromRC(aktivitetsplan, correctBoxInfo.row, correctBoxInfo.colStart);

							if (newBox) {
								KalenderVisningUtilities.DeselectAndDehighlightAllEntities(aktivitetsplan);
								KalenderVisningUtilities.HighlightEntitiesForBox(newBox);

								KalenderVisningUtilities.DehighlightAllWeeks(newBox);
								KalenderVisningUtilities.HighlightWeekForBox(newBox);

								lastVisitedColumn = KalenderVisningUtilities.GetBoxInfo(newBox).colStart;

								KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktivitetsplan);
								KalenderVisningUtilities.SelectBoxAndHighlightSimilarBoxes(newBox, aktivitetsplan);

								// Postback
								if (KalenderVisningUtilities.IsBelastningBox(newBox))
									KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails_SpecificWeek(postbackTarget, newBox);
								else
									KalenderVisningUtilities.DoPostbackToShowAktplanEntityDetails_BlueBox(postbackTarget, newBox);

								KalenderVisningUtilities.EnsureIsBoxVisible(newBox, aktplanSetup.aktivitetsplan);
							}
						}
					}
				}
			}
		}

		namespace DragAndDrop {

			export namespace Boxes {

				/* ****************************/
				/* **** Drag and drop       ***/
				/* **** Blue boxes          ***/
				/* **** Type definitions    ***/
				/* ****************************/

				/// Detaljer om hvor et drag and drop kommer fra
				type PositionDetails = Readonly<{
					colStart: number,
					colEndInclusive: number,
					row: number,
				}>;
				type PositionDetailsNullable = PositionDetails | null;

				/// Et element
				type Box = HTMLElement;
				type BoxNullable = Box | null;

				/// Info om et element: box og positionDetails
				type HoveredInfo = Readonly<{
					positionDetails: PositionDetails,
					box: Box
				}>;
				type HoveredInfoNullable = HoveredInfo | null;

				/// Array af HoveredInfo
				type HoveredInfos = HoveredInfo[];
				type HoveredInfosNullable = HoveredInfos | null;

				/// Detaljer om et drag and drop
				type AktplanDragData = Readonly<{
					details: string,
					id: string,
					startingPosition: PositionDetails,
					dropGranularity: 'week',
				}>;
				type AktplanDragDataNullable = AktplanDragData | null;



				/* ****************************/
				/* **** Drag and drop       ***/
				/* **** Blue boxes          ***/
				/* **** Global variables    ***/
				/* ****************************/

				/// Detaljer om et igangværende drag and drop
				let ongoingDragData: AktplanDragDataNullable;

				/// Grafik til visning ved musen under et igangværende drag and drop
				let ongoingDragImageElement: HTMLElement | null;

				// Key til JS dataTransfer, til drag and drop
				const dataTransferKey: string = "text/lec-aktplandata";

				let dragOverLastElemBoundingRect: DOMRect | null = null;

				export namespace EventHandlers {
					/* ****************************/
					/* **** Drag and drop       ***/
					/* **** Blue boxes          ***/
					/* **** Event handlers      ***/
					/* ****************************/

					/// Kører når et drag and drop starter
					export function OnDragStart(e: DragEvent, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						LectioJSUtils.AssertNotNullOrUndefined(e, 'e');
						LectioJSUtils.AssertType(e.target, HTMLElement);

						const selectedBox: HTMLElement | null = e.target.closest(`.${CssClasses.blueBoxBaseClass}`);
						if (!selectedBox || !KalenderVisningUtilities.BoxIsDraggable(selectedBox))
							return;

						if (!KalenderVisningUtilities.BoxIsSelected(selectedBox)) {
							KalenderVisningUtilities.DeselectAndDehighlightAllBoxes(aktivitetsplan);
							KalenderVisningUtilities.SelectBoxAndHighlightSimilarBoxes(selectedBox, aktivitetsplan);
						}

						const entityid: string | null = selectedBox.getAttribute('data-entityid');
						LectioJSUtils.AssertNotNullOrEmpty(entityid, 'id');

						const details: string = selectedBox.innerText;

						const hoveredPositionDetails: PositionDetailsNullable = DragAndDropUtilities.TryGetPositionDetails_todrag(e.target, aktivitetsplan);
						LectioJSUtils.AssertNotNullOrUndefined(hoveredPositionDetails, 'hoveredPositionDetails');

						const dt: DataTransfer | null = e.dataTransfer;
						LectioJSUtils.AssertNotNullOrUndefined(dt, 'dt');

						const data: AktplanDragData = DragAndDropUtilities.CreateAndAssignOngoingDragData(dt, details, entityid, hoveredPositionDetails);

						DragAndDropUtilities.CreateAndAssignCustomDragImageElement(e.target, data.details, dt);

						aktivitetsplan.classList.add(CssClasses.dragAndDropGlobalClass);
					}

					/// Kører når et drag and drop slutter (ikke når der slippes)
					export function OnDragEnd(e: DragEvent, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						ongoingDragData = null;
						ongoingDragImageElement?.remove();
						ongoingDragImageElement = null;

						aktivitetsplan.querySelectorAll(`.${CssClasses.dragAndDropHoverClass}`).jQueryPartial().removeClass(CssClasses.dragAndDropHoverClass);
						aktivitetsplan.classList.remove(CssClasses.dragAndDropGlobalClass);
					}

					/// Kører når et drag and drop trækkes ind over et nyt element
					export function OnDragEnter(e: DragEvent, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						if (!(e.target instanceof HTMLElement))
							return;

						LectioJSUtils.AssertNotNullOrUndefined(e?.dataTransfer, 'dt');
						if (!DragAndDropUtilities.DataTransferHasAktplanData(e.dataTransfer))
							return;

						e.preventDefault();
						e.dataTransfer.dropEffect = DragAndDropUtilities.ComputeDropEffect(e);

						const dragdata = ongoingDragData;
						LectioJSUtils.AssertNotNullOrUndefined(dragdata, 'dragenter uden data?');

						const target: HTMLElement | null = KalenderVisningUtilities.IsBlueBox(e.target)
							? KalenderVisningUtilities.TryFindInvisibleBoxFromPosition(e, aktivitetsplan)
							: e.target;

						if (!target)
							return;

						const hoveredInfos: HoveredInfosNullable = DragAndDropUtilities.TryGetAllPositionDetails_hover(target, dragdata, aktivitetsplan);

						DragAndDropUtilities.UpdateMarkings(aktivitetsplan, dragdata, hoveredInfos);
					}

					/// Kører hele tiden når et drag and drop holdes over et element
					export function OnDragOver(e: DragEvent, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						if (!(e.target instanceof HTMLElement))
							return;

						LectioJSUtils.AssertNotNullOrUndefined(e?.dataTransfer, 'dt');
						if (!DragAndDropUtilities.DataTransferHasAktplanData(e.dataTransfer))
							return;

						e.preventDefault();
						e.dataTransfer.dropEffect = DragAndDropUtilities.ComputeDropEffect(e);

						if (dragOverLastElemBoundingRect && dragOverLastElemBoundingRect.left < e.clientX && dragOverLastElemBoundingRect.right > e.clientX && dragOverLastElemBoundingRect.top < e.clientY && dragOverLastElemBoundingRect.bottom > e.clientY)
							return;

						const dragdata: AktplanDragDataNullable = ongoingDragData;
						LectioJSUtils.AssertNotNullOrUndefined(dragdata, 'dragover uden data?');

						const target: HTMLElement | null = KalenderVisningUtilities.IsBlueBox(e.target)
							? KalenderVisningUtilities.TryFindInvisibleBoxFromPosition(e, aktivitetsplan)
							: e.target;

						if (!target)
							return;

						dragOverLastElemBoundingRect = target.getBoundingClientRect();

						const hoveredInfos: HoveredInfosNullable = DragAndDropUtilities.TryGetAllPositionDetails_hover(target, dragdata, aktivitetsplan);

						if (dragdata) {
							const boxInfo: BoxInfo = KalenderVisningUtilities.GetBoxInfo(target);

							if (boxInfo.colStart >= dragdata.startingPosition.colStart && boxInfo.colStart <= dragdata.startingPosition.colEndInclusive)
								DragAndDropUtilities.UpdateMarkings(aktivitetsplan, dragdata, hoveredInfos);
						}
					}

					/// Kører når et drag and drop slippes
					export function OnDrop(e: DragEvent, postbackTarget: string, aktivitetsplan: HTMLElement): void {
						dragOverLastElemBoundingRect = null;

						if (!(e.target instanceof HTMLElement))
							return;

						LectioJSUtils.AssertNotNullOrUndefined(e?.dataTransfer, 'dt');

						const str: string = e.dataTransfer.getData(dataTransferKey);
						LectioJSUtils.AssertNotNullOrEmpty(str, 'drop uden data?');

						const data: AktplanDragDataNullable = JSON.parse(str);
						LectioJSUtils.AssertNotNullOrUndefined(data?.id, 'data?.id');

						const target: HTMLElement | null = KalenderVisningUtilities.IsBlueBox(e.target)
							? KalenderVisningUtilities.TryFindInvisibleBoxFromPosition(e, aktivitetsplan)
							: e.target;

						if (!target)
							return;

						const hoveredPositionDetails: PositionDetailsNullable = DragAndDropUtilities.TryGetSinglePositionDetails_hover(target, data, aktivitetsplan);
						LectioJSUtils.AssertNotNullOrUndefined(hoveredPositionDetails, 'drop uden uge?');

						const weekBox: HTMLElement | null = KalenderVisningUtilities.TryGetWeekFromColSpan(hoveredPositionDetails.colStart, hoveredPositionDetails.colStart + 7);
						LectioJSUtils.AssertNotNullOrUndefined(weekBox, 'Kunne ikke finde uge?');

						DragAndDropUtilities.DoPostbackOnBoxDropped(postbackTarget, data.id, weekBox, e);

						e.preventDefault();
					}
				}

				namespace DragAndDropUtilities {

					/* ****************************/
					/* **** Drag and drop       ***/
					/* **** Blue boxes          ***/
					/* **** Utility functions   ***/
					/* ****************************/

					/// Utility function til sortering af en liste af WeekKeyParts, så boxene længest til venstre visuelt ligger først
					function SortWeekKeyPartsLeftToRight(key1: PositionDetails, key2: PositionDetails): number {
						return key1.colStart - key2.colStart;
					}

					/// Laver og gemmer nyt AktplanDragData i datatransfer og i ongoingDragData
					export function CreateAndAssignOngoingDragData(dt: DataTransfer, details: string, entityid: string, positionDetails: PositionDetails): AktplanDragData {
						const data: AktplanDragData = {
							details: details,
							id: entityid,
							startingPosition: positionDetails,
							dropGranularity: 'week',
						};

						dt.setData(dataTransferKey, JSON.stringify(data));
						dt.effectAllowed = 'copyMove';

						ongoingDragData = data;

						return data;
					}

					/// Laver postback og flytter en box til et nyt sted
					export function DoPostbackOnBoxDropped(postbackTarget: string, anyLectioId: string, box: HTMLElement, e: DragEvent): void {
						KalenderVisningUtilities.DoPostback(postbackTarget, 'box_drop', JSON.stringify({
							anyLectioId: anyLectioId,
							newStartWeek: KalenderVisningUtilities.GetWeekNumForWeekBox(box),
							operation: ComputeDropEffect(e),
						}));
					}

					///// Fjerner eksisterende markeringer af hvor et drag and drop holdes over
					//export function RemoveExistingMarkings(aktivitetsplan: HTMLElement, dragdata: AktplanDragData, hoveredInfos: HoveredInfosNullable): HTMLElement[] {
					//	const markedModuleElements: HTMLElement[] = aktivitetsplan.querySelectorAll(`.${CssClasses.dragAndDropHoverClass}`)
					//		.map(elem => elem as HTMLElement)
					//		.sort((box1: HTMLElement, box2: HTMLElement) =>
					//			KalenderVisningUtilities.SortBoxesLeftToRight(box1, box2)); // Sorter, så første element er det helt til venstre

					//	if (markedModuleElements.length) {
					//		const kp2: HoveredInfosNullable = TryGetAllPositionDetails_hover(markedModuleElements[0], dragdata, aktivitetsplan);

					//		if (!hoveredInfos || (kp2 && !Matches(hoveredInfos[0].positionDetails, kp2[0].positionDetails, dragdata.dropGranularity)))
					//			markedModuleElements.forEach(elem => elem.classList.remove(CssClasses.dragAndDropHoverClass));
					//	}

					//	return markedModuleElements;
					//}

					///// Tilføjer markeringer af hvor et drag and drop holdes over
					//export function SetNewMarkings(aktivitetsplan: HTMLElement, dragdata: AktplanDragData, hoveredInfos: HoveredInfosNullable, markedModuleElements: HTMLElement[]) {
					//	const markedWeekElementsKey: HoveredInfosNullable = markedModuleElements.length
					//		? TryGetAllPositionDetails_hover(markedModuleElements[0], dragdata, aktivitetsplan)
					//		: null;

					//	if (!hoveredInfos
					//		|| !markedWeekElementsKey
					//		|| !Matches(hoveredInfos[0].positionDetails, markedWeekElementsKey[0].positionDetails, dragdata.dropGranularity)) {
					//		switch (dragdata.dropGranularity) {
					//			case 'week':
					//				hoveredInfos?.forEach(over_week => over_week.box?.classList.add(CssClasses.dragAndDropHoverClass));
					//				break;
					//			default:
					//				LectioJSUtils.AssertNever(dragdata.dropGranularity, 'dg');
					//		}
					//	}
					//}

					export function UpdateMarkings(aktivitetsplan: HTMLElement, dragdata: AktplanDragData, hoveredInfos: HoveredInfosNullable) {
						const markedModuleElements: { box: HTMLElement, boxInfo: BoxInfo }[] = aktivitetsplan.querySelectorAll(`.${CssClasses.dragAndDropHoverClass}`)
							.map(elem => elem as HTMLElement)
							.sort((box1: HTMLElement, box2: HTMLElement) =>
								KalenderVisningUtilities.SortBoxesLeftToRight(box1, box2)) // Sorter, så første element er det helt til venstre
							.map(box => {
								return {
									box: box,
									boxInfo: KalenderVisningUtilities.GetBoxInfo(box),
								}
							});

						hoveredInfos?.filter(elem => !markedModuleElements.firstOrDefault(markedElem => markedElem.boxInfo.row == elem.positionDetails.row && markedElem.boxInfo.colStart == elem.positionDetails.colStart && markedElem.boxInfo.colEndInclusive == elem.positionDetails.colEndInclusive))
							.forEach(elem => elem.box.classList.add(CssClasses.dragAndDropHoverClass));

						markedModuleElements.filter(markedElem => !hoveredInfos?.firstOrDefault(elem => markedElem.boxInfo.row == elem.positionDetails.row && markedElem.boxInfo.colStart == elem.positionDetails.colStart && markedElem.boxInfo.colEndInclusive == elem.positionDetails.colEndInclusive))
							.forEach(markedElem => markedElem.box.classList.remove(CssClasses.dragAndDropHoverClass));


					}

					/// Sand hvis der er gemt drag and drop data i et events datatransfer
					export function DataTransferHasAktplanData(dt: DataTransfer): boolean {
						return dt.types.indexOf(dataTransferKey) !== -1;
					}

					/// Forsøger at få start-informationer til et drag and drop
					export function TryGetPositionDetails_todrag(box: HTMLElement, aktivitetsplan: HTMLElement): PositionDetailsNullable {
						if (!KalenderVisningUtilities.IsBlueBox(box))
							return null;

						return GetPositionDetailsFromBox(box);
					}

					/// Forsøger at få informationer om et elementer som skal highlightes fordi et drag and drop holdes over det.
					/// Er specifikt det element, som en blå box skal ligge i efter der slippes
					export function TryGetSinglePositionDetails_hover(target: HTMLElement, dragdata: AktplanDragData | undefined, aktivitetsplan: HTMLElement): PositionDetailsNullable {
						if (!KalenderVisningUtilities.IsDragAndDropTarget(target))
							return null;

						if (!dragdata)
							return null;

						const box: HTMLElement | null = KalenderVisningUtilities.IsBlueBox(target)
							? KalenderVisningUtilities.GetBackgroundBoxFromRC(aktivitetsplan, dragdata.startingPosition.row, KalenderVisningUtilities.GetBoxInfo(target).colStart)
							: target;

						if (!box)
							return null;

						return GetPositionDetailsFromBox(box);
					}

					/// Forsøger at få informationer om de elementer som skal highlightes fordi et drag and drop holdes over dem
					/// En liste af alle boxes der skal highlightes
					/// Sorteret fra venstre til højre
					export function TryGetAllPositionDetails_hover(target: EventTarget | null, dragdata: AktplanDragDataNullable, aktivitetsplan: HTMLElement): HoveredInfosNullable {
						LectioJSUtils.AssertNotNullOrUndefined(target, 'target');
						if (!(target instanceof HTMLElement))
							return null;

						const elem: HTMLElement = target;

						if (!KalenderVisningUtilities.IsDragAndDropTarget(elem))
							return null;

						if (!dragdata)
							return null;

						const boxInfo: BoxInfo = KalenderVisningUtilities.GetBoxInfo(elem);

						const realStartCol: number = boxInfo.colStart == 1
							? 0
							: boxInfo.colStart;

						const boxes: HTMLElement[] = KalenderVisningUtilities.GetBackgroundBoxesFromRCSpan(aktivitetsplan, dragdata.startingPosition.row, realStartCol, realStartCol + dragdata.startingPosition.colEndInclusive - dragdata.startingPosition.colStart);

						return boxes
							.map(box => {
								return {
									box: box,
									positionDetails: GetPositionDetailsFromBox(box),
								};
							})
							.sort((box1: HoveredInfo, box2: HoveredInfo) =>
								SortWeekKeyPartsLeftToRight(box1.positionDetails, box2.positionDetails));
					}

					/// Laver PositionDetails for en box
					function GetPositionDetailsFromBox(box: HTMLElement): PositionDetails {
						const boxInfo: BoxInfo = KalenderVisningUtilities.GetBoxInfo(box);

						return {
							colStart: boxInfo.colStart,
							colEndInclusive: boxInfo.colEndInclusive,
							row: boxInfo.row,
						}
					}

					/// Laver den boks der vises ved siden af musen under et drag and drop, med e.g. betegnelsen af det flyttede element
					export function CreateAndAssignCustomDragImageElement(box: HTMLElement, info: string, dt: DataTransfer): void {
						const elem: HTMLDivElement = document.createElement('div');
						elem.style.position = 'absolute';
						elem.style.top = '-1000px';
						elem.classList.add("drag-element");

						const boxclone: Node = box.cloneNode(true);
						LectioJSUtils.AssertType(boxclone, HTMLElement);

						const infoele: HTMLDivElement = document.createElement('div');
						infoele.className = 'ls-drag-info';
						infoele.textContent = info;
						infoele.style.padding = "0 20px";
						infoele.style.whiteSpace = "nowrap";

						elem.appendChild(infoele);
						ongoingDragImageElement = elem;
						box.parentElement!.appendChild(elem);

						dt.setDragImage(elem, 0, 0);
					}

					/// Beregner hvad der skal ske med den blå box der bliver drag and droppet når der slippes
					export function ComputeDropEffect(e: DragEvent): 'move' | 'none' {
						switch (LectioJSUtils.GetEventModifiers(e)) {
							case '':
								return 'move';
							default:
								return 'none';
						}
					}

					/// Check om to position details repræsenterer samme position i kalender-visningen
					function Matches(kp1: PositionDetails, kp2: PositionDetails, dropGranularity: AktplanDragData['dropGranularity']): boolean {
						switch (dropGranularity) {
							case 'week':
								return kp1.colStart === kp2.colStart
									&& kp1.colEndInclusive === kp2.colEndInclusive
									&& kp1.row == kp2.row;
							default:
								LectioJSUtils.AssertNever(dropGranularity, 'dd');
						}
					}
				}
			}
		}
	}
}
