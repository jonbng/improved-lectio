import { LectioContextMenu, LectioContextMenuItemData } from "./LectioContextMenu";
import { LectioJSUtils, Tagged, STagged } from "./LectioJSUtils";

export namespace Skolehjem {
	type BookingId = Tagged<'bookingid', number>;
	type AfdelingId = Tagged<'afdelingid', number>;
	export function InitializeGanttTable(table: HTMLTableElement, afdId: AfdelingId, postbackPlacering: (argument: string) => void) {
		function GetSelectedBookingId(): BookingId | undefined {
			const radios = $('input[type=radio][data-role=skh-booking-radio]').toArray()
				.map(ele => LectioJSUtils.GetAssertedType(ele, HTMLInputElement, 'radio'));
			const sellist = radios.filter(radio => radio.checked);
			if (sellist.length === 0)
				return undefined;
			if (sellist.length > 1)
				throw new Error('mere end een radio?');
			return sellist[0].value as BookingId;
		}

		// eval('debugger');
		$(table).on('click', 'gd', e => {
			const ele = e.target.nodeName === 'GD' ? e.target : $(e.target).parents('gd').first().get(0);
			LectioJSUtils.AssertArgument(ele.nodeName == 'GD', 'forventede gd-element.');
			// eval('debugger');

			const rowele = $(ele).parents('garlow, gahry').first().get(0);
			LectioJSUtils.AssertNotNullOrUndefined(rowele, 'rowele null');
			const hitinfo = (() => {
				if (rowele!.localName === 'gahry')
					return 'headerstuff';
				if (rowele!.localName === 'garlow')
					return 'vrow';
				throw new Error('ukendt ele');
			})();
			if (hitinfo !== 'vrow')
				return;

			// find info for valgt raekke/celle.
			const vaerelseId = ele.getAttribute('data-skh-v-id');
			type BookingInfo = { Id: BookingId, Name: string };
			const bis: BookingInfo[] = JSON.parse(ele.getAttribute('data-skh-book-infos') || '[]');

			// const tr = LectioJSUtils.GetAssertedType(, HTMLTableRowElement, 'skal TR.');
			const vname = (rowele!.firstElementChild! as HTMLElement).innerText;
			const selBookId = GetSelectedBookingId();

			const menuitems: LectioContextMenuItemData[] = [];
			if (selBookId) {
				const pladsinfosraw = JSON.parse(LectioJSUtils.GetNotNullValue(rowele!.getAttribute('data-skh-p-info'), 'p-info')) as string[];
				const pladsinfos = pladsinfosraw.map(str => {
					const [id, kode] = str.split(/ /);
					return { id, kode };
				})
				menuitems.push(...pladsinfos.map(pi => ({
					caption: 'Placér valgt booking i ' + vname + ' ' + pi.kode,
					action: () => {
						LectioJSUtils.LogDebug('doit', selBookId, pi.id, pi.kode);
						postbackPlacering(`${selBookId},${pi.id}`);
					},
				})));
			}
			menuitems.push(...bis.map(bi => ({
				caption: 'Rediger bookning: ' + bi.Name,
				url: LectioJSUtils.GetBaseSchoolURL() + '/stamdata/skolehjem/booking_rediger.aspx?id=' + bi.Id
			})));
			if (vaerelseId) {
				menuitems.push({
					caption: 'Opret booking i ' + vname,
					url: LectioJSUtils.GetBaseSchoolURL() + '/stamdata/skolehjem/booking_rediger.aspx?vaerelse_id=' + vaerelseId + '&id=-1'
				});
			}
			if (menuitems.length && e.originalEvent)
				LectioContextMenu.ShowContextMenuEx(e.originalEvent, menuitems, undefined);
		});
		$(document).on('click', 'input[type=radio][data-role=skh-booking-radio]', e => {
			// find booking-id for valgt booking-radio.
			const rb = LectioJSUtils.GetAssertedType(e.target, HTMLInputElement, 'radio');
			LectioJSUtils.LogDebug('radio...', rb);
			const selBookId = LectioJSUtils.GetNotNullValue(GetSelectedBookingId());

			$(table).find('garlow').removeAttr('class');
			$(table).find('garlow').removeAttr('data-skh-p-info');
			$(table).find('garlow').removeAttr('title');

			LectioJSUtils.PostCurrentPageApi('GetGanttPladsColors', { bookingId: selBookId, afdelingId: afdId })
				.then(response => response.json())
				.then((vaerelseIds: readonly [number, string, string[], string][]) => {
					let hitcount = 0;
					for (const [vid, csssuf, pladsInfos, info] of vaerelseIds) {
						const cbx = $(table).find(`garlow[data-skh-v-id=${vid}]`);
						if (cbx.length === 0) {
							throw new Error(`Har modtaget vaerelsesinfo for vaerelse med id ${vid}, men vaerelset blev ikke fundet i dom-en.`);
						}
						cbx.attr('class', 'ls-skh-v-' + csssuf);
						LectioJSUtils.GetAssertedType(cbx.get(0)!.firstElementChild, HTMLElement, 'htmlelement').title = info;
						cbx.attr('data-skh-p-info', JSON.stringify(pladsInfos));
						if (cbx.length)
							hitcount++;
					}
					LectioJSUtils.LogDebug('color hit count:', hitcount);
				}).catch(err => {
					console.error('Fejl under hent vaerelsesfarvaer mhp. placeringsguide.', err);
					setTimeout(() => {
						throw new Error('Fejl under hent vaerelsesfarvaer mhp. placeringsguide.');
					}, 20);
				});
		});
	}

	export function highlightFarvekode(elem: HTMLElement) {
		highlightSkolehjem(elem, "data-plads-status");
	}

	export function unhighlightFarvekode(elem: HTMLElement) {
		unhighlightSkolehjem(elem, "data-plads-status");
	}

	export function highlightIkon(elem: HTMLElement) {
		highlightSkolehjem(elem, "data-plads-icon");
	}

	export function unhighlightIkon(elem: HTMLElement) {
		unhighlightSkolehjem(elem, "data-plads-icon");
	}

	function highlightSkolehjem(elem: HTMLElement, dataAttrName: string) {
		if (!elem.hasAttribute(dataAttrName))
			return;

		const icon = elem.getAttribute(dataAttrName);
		if (!icon)
			return;

		const pladserToHighlight = document.querySelectorAll(".skolehjemoverblik-plads[" + dataAttrName + "=\"" + icon + "\"]");

		for (let j = 0; j < pladserToHighlight.length; j++) {
			pladserToHighlight[j].classList.add("highlight");
		}
	}

	function unhighlightSkolehjem(elem: HTMLElement, dataAttrName: string) {
		if (!elem.hasAttribute(dataAttrName))
			return;

		const icon = elem.getAttribute(dataAttrName);
		if (!icon)
			return;

		const pladserToHighlight = document.querySelectorAll(".skolehjemoverblik-plads[" + dataAttrName + "=\"" + icon + "\"]");

		for (let j = 0; j < pladserToHighlight.length; j++) {
			pladserToHighlight[j].classList.remove("highlight");
		}
	}
}