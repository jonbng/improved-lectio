import { LectioJSUtils } from "./LectioJSUtils";

export namespace LectioMasterMobile {

	export function mobileAddBgcolorToPageHead() {
		// scroll mobil-event ift. bgfarve på header.
		const contentTable = document.getElementById("contenttable");
		const masterSubNavContainer = document.getElementsByClassName("ls-master-pageheader")[0];
		if (!(contentTable && masterSubNavContainer))
			return;

		contentTable.addEventListener('scroll', () => {
			// contenttable bliver scrollet
			if (contentTable.scrollTop !== 0 && !(masterSubNavContainer.classList.contains("ls-mobile-scrolling"))) {
				masterSubNavContainer.classList.add("ls-mobile-scrolling");
			}
			// contenttable er ved dens orginale position
			if (contentTable.scrollTop === 0 && masterSubNavContainer.classList.contains("ls-mobile-scrolling")) {
				masterSubNavContainer.classList.remove("ls-mobile-scrolling");
			}
		});
	}

	export function mobileScrollToSubNav() {
		const subnavs = document.getElementsByClassName("ls-subnav-active");
		if (subnavs.length === 0)
			return;

		const subnavContainer = LectioJSUtils.GetAssertedType(document.getElementById('s_m_HeaderContent_subnavigator_navigatortbl'), HTMLElement);

		// Scroller til den sidste aktivesub
		const lastAktiveSub = subnavs[subnavs.length - 1];
		if (!(subnavContainer && lastAktiveSub))
			throw "Der er ingen aktive subnav eller subnavcontainer.";

		const targetLeft = $(lastAktiveSub).offset()!.left + (($(lastAktiveSub).width() as number) / 2) + $(subnavContainer).scrollLeft()!;
		$(subnavContainer).scrollLeft(targetLeft - (window.innerWidth / 2));
	}

	export function mobileScrollToTab() {
		const tabContainer = document.querySelector(".lectioTabToolbar");
		if (!tabContainer)
			return;

		const activeTab = tabContainer.querySelector("[disabled='disabled']");
		if (!(tabContainer && activeTab)) {
			console.warn("Der er ingen aktive tabs.");
			return;
		}

		const targetLeft = $(activeTab).offset()!.left + (($(activeTab).width() as number) / 2) + $(tabContainer).scrollLeft()!;
		if ($(tabContainer).children().length > 2)
			$(tabContainer).scrollLeft(targetLeft - (window.innerWidth / 2));
	}

	export function showModal(callBackFunc: () => void, shouldCloseOnClick: boolean) {
		const modalBaggrund = document.querySelector('#modalBackgroundID');
		if (!modalBaggrund)
			throw "Der er ingen modalbaggrund element";

		$(modalBaggrund).off('click');
		$(modalBaggrund).on('click', (() => {
			if (shouldCloseOnClick) {
				document.getElementById('modalBackgroundID')?.classList.toggle('show-modal');
				callBackFunc();
			}
		}));

		modalBaggrund.classList.toggle('show-modal');
	}

	export function ShowMobilMereSheet() {

		const mobilMereLinks = document.getElementById("mobilMereSheetMenuList")!.getElementsByTagName("DIV");
		const MobilMereLinkRows = Math.round($(mobilMereLinks).filter((i, e) => $(e).is(':visible')).length / 2);

		document.documentElement.style.setProperty('--TotalMobilMereLinks', MobilMereLinkRows.toString());

		const mereSheet = document.querySelector('#mobilMereSheetMenu')!;
		mereSheet.classList.add('show-mere-sheet-menu');
		LectioMasterMobile.showModal(() => { mereSheet.classList.remove('show-mere-sheet-menu'); }, true);
	}

	export function ToggleMobileDrawer(elementId: string) {
		const drawer = document.getElementById(elementId);
		if (!drawer) {
			console.error(`No element found with id: ${elementId}`);
			return;
		}

		if (drawer.classList.toggle("show-mobile-page-drawer")) {
			LectioMasterMobile.showModal(() => ToggleMobileDrawer(elementId), true);
		}
	}
}