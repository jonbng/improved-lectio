import { LectioJSUtils } from './LectioJSUtils';
import { JSErrorHandling } from './JSErrorHandling';
import { LectioTimeSpan } from './LectioTimeSpan';
import { LectioContextMenuItemData } from './LectioContextMenu';
import { LectioDate } from './LectioDate';

type skemaxx = {
	readonly isLoggedIn: boolean;
	readonly lektionAvailable: boolean;
	readonly aaAvailable: boolean;
	readonly privAppAvailable: boolean;
	readonly goBackUrl: string;
	readonly postbackTarget: string | null | undefined;
	readonly teacherId: string;
	readonly aaLink: string;
	readonly lektionLink: string;

	readonly skemaInfo: {
		readonly type: 'notFlipped';
		readonly SkemaStartTime: Date;
		readonly SkemaEndTime: Date;
	}
	| {
		readonly type: 'flipped';
		readonly moduleToTime: {
			readonly [key: string]: string;
		}
	}
	| {
		readonly type: 'onlyBrik';
	};
};

export namespace SkemaMenu {

	let skemadata: skemaxx | undefined;

	export function Initialize(skemadataArg: skemaxx) {
		LectioJSUtils.AssertArgumentPresent(skemadataArg, 'Ikke nogen skemadata?');
		skemadata = skemadataArg;
	}

	export function TryGetVisibleNonContextCardTextNode(ele: HTMLElement): Text | null {
		// hvad: skemabrikker har (202407) en masse html, hvoraf noget ikke er synligt.
		// Vi finder her en tekstnode der 1) er synlig 2) er hoejest muligt i traet,
		// saa der naeppe er kontekstkort paa den.
		let rv: Text | null = null;
		function ff(ele: HTMLElement) {
			for (const c of ele.childNodes) {
				if (c instanceof HTMLElement) {
					const s = window.getComputedStyle(c);
					if (s.display === 'none' || c.hasAttribute('data-lectiocontextcard'))
						continue;
					for (const c2 of c.childNodes) {
						ff(c);
						if (rv)
							break;
					}
				}
				if (c instanceof Text && c.nodeValue?.trim()) {
					rv = c;
					break;
				}
			}
		}
		ff(ele);
		return rv;
	}

	function getClickInfo(skemadata: skemaxx, e: Event): { time: string, date: string } | null {
		if (!skemadata)
			throw new Error('skemadata');

		if (skemadata.isLoggedIn === false
			|| (skemadata.lektionAvailable === false
				&& skemadata.privAppAvailable === false
				&& skemadata.aaAvailable === false))
			return null;

		switch (skemadata.skemaInfo.type) {
		case 'notFlipped': {
			LectioJSUtils.AssertArgument('pageY' in e, 'pagey');

			const pageY = (e as MouseEvent).pageY;
			const mouseY = pageY - $('div.s2skemabrikcontainer').position().top;

			const skemaModulHeight = $('div.s2skemabrikcontainer').height() || 1;
			const info = skemadata.skemaInfo;
			const skemaModulMinutes =
				(info.SkemaEndTime.getHours() - info.SkemaStartTime.getHours()) * 60
				+ info.SkemaEndTime.getMinutes() - info.SkemaStartTime.getMinutes()
			const secondsPrPixel = skemaModulMinutes / skemaModulHeight * 60;

			const totalSeconds = (mouseY * secondsPrPixel)
				+ info.SkemaStartTime.getHours() * 60 * 60
				+ info.SkemaStartTime.getMinutes() * 60; //seconds
			let hours = Math.floor(totalSeconds / (60 * 60));
			let minutes = Math.floor((totalSeconds - hours * 60 * 60) / 60);
			if (hours > 23) {
				hours = 23;
				minutes = 45;
			}

			if (isNaN(hours) || isNaN(minutes)) {
				JSErrorHandling.reportJSError(
					"STM15815 Javascriptfejl - ny aa/lektion/privat:"
					+ " totalSec: " + totalSeconds
					+ " mouseY: " + mouseY
					+ " info.SkemaStartTime.getHours(): " + info.SkemaStartTime.getHours()
					+ " info.SkemaStartTime.getMinutes(): " + info.SkemaStartTime.getMinutes()
					+ " info.SkemaEndTime.getHours(): " + info.SkemaEndTime.getHours()
					+ " info.SkemaEndTime.getMinutes(): " + info.SkemaEndTime.getMinutes());
				hours = 8;
				minutes = 0;
			}
			const target = e.target;
			LectioJSUtils.AssertType(target, Element);

			const dtstr = target.closest('[data-date]')?.getAttribute('data-date');
			LectioJSUtils.AssertNotNullOrUndefined(dtstr, 'dtstr');

			return {
				date: dtstr,
				time: LectioTimeSpan.Create(hours, minutes).ToLectioTimeSpanString(),
			};
		}
		case 'flipped': {
			const target = e.target;
			LectioJSUtils.AssertType(target, HTMLElement);
			const dateModuleString = target.closest('.skemaweekSkemabrikContainer')?.getAttribute('data-key');
			if (!dateModuleString)
				return null;
			const parts = dateModuleString.split(/\s+/);
			let dtstr: string | undefined;
			let modstr: string | undefined;
			for (const part of parts) {
				{
					const m = part.match(/^D([0-9-]+)$/);
					if (m) {
						dtstr = m[1];
						continue;
					}
				}
				{
					const m = part.match(/^M([0-9]+)$/);
					if (m) {
						modstr = part;
						continue;
					}
				}
			}
			LectioJSUtils.AssertNotNullOrEmpty(dtstr, 'dtstr');
			LectioJSUtils.AssertNotNullOrEmpty(modstr, 'modstr');
			const timestr = skemadata.skemaInfo.moduleToTime[modstr];
			LectioJSUtils.AssertNotNullOrEmpty(timestr, 'timestr');

			return {
				date: dtstr,
				time: timestr,
			};
		}
		case 'onlyBrik':
			return {
				date: "",
				time: "",
			};
		default:
			LectioJSUtils.AssertNever(skemadata.skemaInfo, 'type');
			throw new Error('boo');
		}
	}

	export function CreateContextMenuItems(
		shorts: readonly string[],
		evt: Event,
		stuff:
			{ type: 'get-context-menu-element', contextMenuElement: HTMLElement }
			| { type: 'inline-shorts', inlineShortsElement: HTMLElement },
		prevurl: string | undefined,
	): LectioContextMenuItemData[] | 'nej' {
		LectioJSUtils.AssertNotNullOrUndefined(evt, 'evt');

		let ci_cached: ReturnType<typeof getClickInfo> | undefined;
		const getparams = () => {
			LectioJSUtils.AssertNotNullOrUndefined(skemadata, 'skemadata');
			ci_cached ??= getClickInfo(skemadata, evt);

			LectioJSUtils.AssertNotNullOrUndefined(ci_cached, 'dt_cached');
			return { ci: ci_cached, skemadata };
		};

		const getSkemadata = () => {
			return skemadata;
		};

		const target = evt.target;
		LectioJSUtils.AssertType(target, HTMLElement);
		if (target.classList.contains('skemaweekWeek') || target.classList.contains('skemaweekWeekDay') || target.closest('.skemaweekModuleContainer') != null) {
			// target er ikke en del af en skemabrik container (e.g. ugeoverskrifter). Kontekstmenu fjernet
			return 'nej';
		}

		function dopb(action: string, args: string | undefined): void {
			const pbtarget = getSkemadata()?.postbackTarget;
			LectioJSUtils.AssertNotNullOrEmpty(pbtarget, 'pbtarget');
			window.__doPostBack(pbtarget, action + ' ' + args);
		}

		const encodedprevurl = prevurl ? "&prevurl=" + encodeURIComponent(prevurl) : "";

		const rv: LectioContextMenuItemData[] = [];
		function mkLinkItem(caption: string, href: string, image?: string, icon?: string, prio?: number, placement?: number): void {
			rv.push({
				caption,
				url: LectioJSUtils.GetBaseSchoolURL() + '/' + href,
				imagePath: image,
				iconPath: icon,
				prio,
				placement
			});
		}

		function mkLinkItem_cb(caption: string, action: () => void, icon?: string, prio?: number): void {
			rv.push({
				caption,
				action: action,
				iconPath: icon,
				prio,
			});
		}

		function mkLinkItemEx(caption: string, short: string, image?: string, icon?: string, prio?: number,): void {
			const ps = getparams();
			const pbtarget = ps.skemadata.postbackTarget;
			LectioJSUtils.AssertNotNullOrEmpty(pbtarget, 'pbtarget');
			const postbackArg = JSON.stringify({ date: ps.ci.date, time: ps.ci.time })
			const dopost = () => window.__doPostBack(
				pbtarget,
				short + ' ' + postbackArg);
			rv.push({ caption: caption, action: dopost, imagePath: image, iconPath: icon, prio: prio });
		};

		const brikidUrlEnc =
			(stuff.type === 'get-context-menu-element'
				? stuff.contextMenuElement.previousElementSibling
				: stuff.inlineShortsElement
			)?.getAttribute('data-brikid');

		const absid: () => string = () => {
			const mm = brikidUrlEnc?.match(/^ABS([0-9]{5,15})$/);
			if (!mm)
				throw new Error('contextmenu: Kompakt version, men kan ikke finde element der har absenseid.');
			return mm[1];
		};

		const prhid: () => string = () => {
			const mm = brikidUrlEnc?.match(/^PRH([0-9]{5,15})$/);
			if (!mm)
				throw new Error('contextmenu: Kompakt version, men kan ikke finde element der har absenseid.');
			return mm[1];
		};

		const brikid: () => string = () => {
			if (!brikidUrlEnc)
				throw new Error('contextmenu: Kompakt version, men kan ikke finde element der har brikid.');
			return brikidUrlEnc;
		}

		const isInSkemaBrik = evt.target instanceof Element && !!evt.target.closest('.s2skemabrik');

		let checkLengthGeqZero = true;

		for (const short of shorts) {
			const reparts = short.match(/(\w+)(\/(.+))?/);
			const [shortx, opts] = reparts ? [reparts[1], reparts[3]] : [short, null]

			switch (shortx) {
			case 'AF':
				mkLinkItem('Aktivitetsforside', 'aktivitet/aktivitetforside2.aspx?absid=' + absid(), '', 'event');
				break;
			case 'AE':
				mkLinkItem('Rediger aktivitet', 'aktivitet/aktivitetrediger.aspx?action=edit&id=' + absid() + encodedprevurl, '', 'edit');
				break;
			case 'AEM':
				mkLinkItem('Rediger flere', 'aktivitet/aktivitetredigermange.aspx?mode=normal&id=' + absid() + encodedprevurl, '', 'edit');
				break;
			case 'AEN':
				mkLinkItem('Kopiér aktivitet', 'aktivitet/aktivitetrediger.aspx?action=create&id=' + absid() + encodedprevurl, '', 'content_copy');
				break;
			case 'AR':
				mkLinkItem('Find vikar', 'aktivitet/aktivitetfindvikar.aspx?id=' + absid() + encodedprevurl, '', 'person_search');
				break;
			case 'AEA':
				mkLinkItem('Registrér fravær', 'ActivityAbsenceRegistration.aspx?id=' + absid() + encodedprevurl, '', 'event_available');
				break;
			case 'SL':
				mkLinkItem('Log', 'aktivitet/AktivitetLog.aspx?id=' + absid() + encodedprevurl, '', 'history');
				break;
			case 'PRH':
				mkLinkItem('Prøvehold', 'proevehold.aspx?type=proevehold&ProeveholdId=' + prhid() + encodedprevurl, '', 'group');
				break;
			case 'ADDFIL':
				mkLinkItem_cb(
					'Tilføj til filter',
					() => dopb('brik_add_to_filter', brikid()),
					"filter_alt", 1);
				break;
			case 'OPSCL':
				mkLinkItem_cb(
					'Lektion i scenarie',
					() => dopb('opret_scenarie_lektion_from_brik', brikid()),
					'add', 1);
				break;
			case 'OPSCA':
				mkLinkItem_cb(
					'Anden aktivitet i scenarie',
					() => dopb('opret_scenarie_aa_from_brik', brikid()),
					'add', 1);
				break;
			case 'SEL':
				mkLinkItem_cb(
					'Vælg',
					() => dopb('select_brik', brikid()),
					'check_circle', 1);
				break;
			case 'OPCOPY':
				mkLinkItem_cb(
					'Kopiér brik i scenarie',
					() => dopb('kopier_brik_i_scenarie', brikid()),
					'content_copy', 1);
					break;
			case 'SCFINDVIKAR':
				mkLinkItem_cb(
					'Find vikar i scenarie',
					() => dopb('find_vikar_i_scenarie', brikid()),
					'person_search', 1);
				break;
			case 'opret_lektion': {
				const url = getparams().skemadata.lektionLink + "&date=" + getparams().ci.date + "&time=" + getparams().ci.time + "&prevurl=" + getparams().skemadata.goBackUrl;
				mkLinkItem('Lektion', url, '', 'add', 0, 1);
				break;
			}
			case 'opret_aa': {
				const url = getparams().skemadata.aaLink + "&date=" + getparams().ci.date + "&time=" + getparams().ci.time + "&prevurl=" + getparams().skemadata.goBackUrl;
				mkLinkItem('Anden aktivitet', url, '', 'add', 0, 1);
				break;
			}
			case 'opret_pa': {
				const url = "privat_aftale.aspx?date=" + getparams().ci.date + "&time=" + getparams().ci.time + "&prevurl=" + getparams().skemadata.goBackUrl;
				mkLinkItem('Privat aftale', url, '', 'add', 0, 1);
				break;
			}
			case 'opret_scenarie_lektion_bydate': {
				if (!isInSkemaBrik) {
					mkLinkItemEx('Lektion i scenarie', shortx, '', 'add', 1);
				}
				else {
					checkLengthGeqZero = false;
				}
				break;
			}
			case 'opret_scenarie_aa_bydate': {
				if (!isInSkemaBrik) {
					mkLinkItemEx('Anden aktivitet i scenarie', shortx, '', 'add', 1);
				}
				else {
					checkLengthGeqZero = false;
				}
				break;
			}
			default:
				throw new Error('Ukendt menupunkt "' + shortx + '".');
			}
		}

		if (checkLengthGeqZero)
			LectioJSUtils.AssertArgument(rv.length > 0, 'vx.length > 0 - hvad skal det betyde?');

		return rv;
	}
}