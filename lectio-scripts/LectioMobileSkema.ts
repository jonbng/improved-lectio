import { LectioCookie } from "./LectioCookie";
import { LectioDate } from "./LectioDate";
import { LectioJSUtils } from "./LectioJSUtils";

export namespace LectioMobileSkema {

	//TodayDate angives
	export function Initialize(TodayDate: string) {

		// Initially hides toggle-buttons when not needed
		function hideDagsbmToggleButtons() {
			const mobilskemaTops = document.querySelectorAll<HTMLElement>('.mobilskema-1dag-skematop');
			for (const mobilskemaTop of mobilskemaTops) {
				if (mobilskemaTop.offsetHeight >= mobilskemaTop.scrollHeight) {
					mobilskemaTop.querySelector<HTMLElement>('.dagsbm-expand-btn')!.style.display = 'none';
					mobilskemaTop.classList.remove('skematop-indicate-moreinfo');
				}
			}
		};
		hideDagsbmToggleButtons();


		// If no cookies or choose today
		let Currentdate = LectioDate.ParseExact(TodayDate);

		// If cookies: Choose cookies for Currentdate overwrite
		const lastSelectedMobileSkemaDate = LectioCookie.getCookie("lastSelectedMobileSkemaDate");
		if (lastSelectedMobileSkemaDate !== undefined) {
			Currentdate = getLectioDateFromSkemaOrWeekElementId(lastSelectedMobileSkemaDate);
		}

		// Set selected date
		if (setNewSelectedDateOrLoadNewPage(Currentdate)) {
			scrolltoWeek(Currentdate);
			scrolltoSkemadag(Currentdate);
		}

		{
			// Skema swipe
			const mobilskemaOuterContainer = document.querySelector(".mobilskema-1dag-outerContainer");
			const dateObserver = new IntersectionObserver(onDateIntersection, {
				root: mobilskemaOuterContainer,
				threshold: .75,
			});

			const MobilSkemaContents = document.querySelectorAll('.mobilskema-1dag');
			MobilSkemaContents.forEach(content => {
				dateObserver.observe(content);
			});

			function onDateIntersection(entries: any) {
				entries.forEach((entry: any) => {
					if (entry.isIntersecting) {
						if (entry.target.id === undefined) {
							throw "Observed element is undefined"
						}
						const currentSelectedDay: LectioDate = getLectioDateFromCurrentSelectedDay();
						const newSelectedDay: LectioDate = getLectioDateFromSkemaOrWeekElementId(entry.target.id);
						if (!(currentSelectedDay.IsEqual(newSelectedDay))) {
							if (setNewSelectedDateOrLoadNewPage(newSelectedDay)) {
								scrolltoWeek(newSelectedDay);
							};
						}
					}
				}
				)
			};
		}

		{
			// Ugevælgeren - week swipe
			const weekOuterContainer = document.querySelector(".mobilskema-header-container");
			const weekObserver = new IntersectionObserver(onWeekIntersection, {
				root: weekOuterContainer,
				threshold: .75
			});

			const MobilSkemaWeeks = document.querySelectorAll('.week');
			MobilSkemaWeeks.forEach(week => {
				weekObserver.observe(week);
			});

			function onWeekIntersection(entries: any) {
				entries.forEach((entry: any) => {
					if (entry.isIntersecting) {
						const currentSelectedDay: LectioDate = getLectioDateFromCurrentSelectedDay();
						const currentSelectedWeek = getWeekSwipeElement(currentSelectedDay)?.parentElement?.id;
						const newSelectedWeek: string = entry.target.id;

						if (currentSelectedWeek === undefined || newSelectedWeek === undefined) {
							throw "Observed element is undefined"
						}

						if (newSelectedWeek !== currentSelectedWeek) {
							const newSelectedDay =
								newSelectedWeek > currentSelectedWeek
									? currentSelectedDay.AddDays(7)
									: currentSelectedDay.AddDays(-7);
							if (setNewSelectedDateOrLoadNewPage(newSelectedDay)) {
								scrolltoSkemadag(newSelectedDay);
							}
						}
					}
				}
				)
			};
		}
	}

	function getWeekSwipeElement(dato: LectioDate): HTMLElement | null {
		const id = dato.ToDDMMYYYY();
		const h_id = "h-" + id;
		const elem = document.getElementById(h_id);
		return elem;
	}

	function getSkemaSwipeElement(dato: LectioDate): HTMLElement | null {
		const id = dato.ToDDMMYYYY();
		const elem = document.getElementById(id);
		return elem;
	}

	function getLectioDateFromSkemaOrWeekElementId(elementId: string): LectioDate {
		if (elementId === undefined || elementId === null)
			throw "function getLectioDateFromSkemaOrWeekElementId took null input: " + elementId;
		if (elementId.length > 10) {
			throw "function getLectioDateFromSkemaOrWeekElementId took string with a length longer than 10: " + elementId;
		}
		//Check if elementId is neither a weekswipe elementid or skemaswipe elementid
		const ddmmyyyy = (elementId.length === 10)
			? elementId.substring(2)
			: elementId;
		const day = parseInt(ddmmyyyy.slice(0, 2), 10);
		const month = parseInt(ddmmyyyy.slice(2, 4), 10);
		const year = parseInt(ddmmyyyy.slice(4, 8), 10);

		if (isNaN(day) || isNaN(month) || isNaN(year)) {
			throw "function getLectioDateFromSkemaOrWeekElementId took invalid input: " + elementId
		}

		const lectioDate = LectioDate.Create(year, month, day);
		return lectioDate;
	}

	export function getLectioDateFromCurrentSelectedDay(): LectioDate {
		if (getCurrentSelectedElement() === undefined) {
			throw "Selected-date is undefined"
		}
		const selID = getCurrentSelectedElement()?.id;
		const dd = getLectioDateFromSkemaOrWeekElementId(selID);
		return dd;
	}

	function getCurrentSelectedElement(): HTMLElement {
		if (document.getElementsByClassName("selected-day").length > 1) {
			throw "There is more than 1 selected date";
		}
		const current = document.getElementsByClassName("selected-day")[0] as HTMLElement;
		return current;
	}


	function scrolltoWeek(dato: LectioDate) {
		if (dato === null || dato === undefined) {
			throw "function scrolltoWeek took null input:" + dato;
		}
		const weekOuterContainer = document.querySelector<HTMLElement>(".mobilskema-header-container")!;
		const weekElement: HTMLElement | null | undefined = getWeekSwipeElement(dato)?.parentElement;
		LectioJSUtils.AssertNotNullOrUndefined(weekElement, 'weekelement');
		const targetLeft =
			$(weekElement).offset()!.left
			- $(weekOuterContainer).offset()!.left
			+ $(weekOuterContainer).scrollLeft()!;
		$(weekOuterContainer).scrollLeft(targetLeft);
	}

	function scrolltoSkemadag(dato: LectioDate) {
		if (dato === null || dato === undefined) {
			throw "function scrolltoSkemadag took null input:" + dato;
		}
		const mobilskemaOuterContainer = document.querySelector<HTMLElement>(".mobilskema-1dag-outerContainer")!;
		const skemaElement: HTMLElement = getSkemaSwipeElement(dato) as HTMLElement;
		const targetLeft = $(skemaElement).offset()!.left
			- $(mobilskemaOuterContainer).offset()!.left
			+ $(mobilskemaOuterContainer).scrollLeft()!;
		$(mobilskemaOuterContainer).scrollLeft(targetLeft);
	}


	//Check if the new date is generated set new selected date.
	//If the new date is not generated reload and create the new date.
	function setNewSelectedDateOrLoadNewPage(newDate: LectioDate) {

		//Save cookie if date is not today's date
		if (newDate.IsEqual(LectioDate.FromDate(new Date()).RemoveTime())) {
			LectioCookie.deleteCookieGlobal("lastSelectedMobileSkemaDate");
		}
		else {
			LectioCookie.setCookieMobileSkema("lastSelectedMobileSkemaDate", newDate.ToDDMMYYYY());
		}

		const newChosenDay = getWeekSwipeElement(newDate);
		if (newChosenDay !== null) {
			const currentSelectedElement = getCurrentSelectedElement();
			currentSelectedElement?.classList.remove("selected-day");
			newChosenDay.classList.add("selected-day");
			return true;
		}

		else {
			// Reload new period by cookie
			window.location.href = new URL(window.location.href).href;
			return false;
		}
	}

	export function navigateToDay(elementId: string) {
		const day = getLectioDateFromSkemaOrWeekElementId(elementId);
		if (setNewSelectedDateOrLoadNewPage(day)) {
			scrolltoWeek(day);
			scrolltoSkemadag(day);
		}
	}

	// On click opens and closes dagsbm
	let isExpanded = false;
	export function ToggleDagsbm(elementId: string) {

		const parent = document.getElementById(elementId);
		const skemaTop = parent!.querySelector<HTMLElement>('.mobilskema-1dag-skematop')!;
		const button = parent?.querySelector('.dagsbm-expand-btn');
		const icon = button?.querySelector<HTMLElement>('.ls-fonticon');
		const topContentHeight = skemaTop!.scrollHeight;
		if (isExpanded) {
			skemaTop.style.removeProperty('height');
			icon!.innerText = 'expand_more';
			skemaTop.classList.add('skematop-indicate-moreinfo');

		} else {
			skemaTop.style.height = topContentHeight + 'px';
			icon!.innerText = 'expand_less';
			skemaTop.classList.remove('skematop-indicate-moreinfo');

		}
		skemaTop?.classList.toggle('skematop-indicate-moreinfo');
		isExpanded = !isExpanded;
	};
}