import {LectioCluetips} from './LectioCluetips';

export class SkemaView {
	private static lastID: string | null = null;
	private static timeout: number | null = null;
	private static delay = 400;

	public static DisplaySkema(atElement: HTMLElement, id: string, year: number, datestart: string, dateend: string, timestart: string, timeend: string, scenarieId: string | null = null): void {
		if (SkemaView.timeout) {
			window.clearTimeout(SkemaView.timeout);
		}
		SkemaView.timeout = window.setTimeout(() => { SkemaView.DisplaySkemaNow(atElement, id, year, datestart, dateend, timestart, timeend, scenarieId); }, SkemaView.delay);
	}

	public static DisplaySkemaNow(atElement: HTMLElement, id: string, year: number, datestart: string, dateend: string, timestart: string, timeend: string, scenarieId: string | null = null): void {
		if (id === SkemaView.lastID) {
			return;
		}
		SkemaView.lastID = id;
		const skemaurl = 'AktivitetSkemaInline.aspx?id=' + id
			+ '&year=' + year
			+ '&datestart=' + datestart
			+ '&timestart=' + timestart
			+ '&dateend=' + dateend
			+ '&timeend=' + timeend
			+ (scenarieId ? '&scenarie=' + scenarieId : '')
			+ ' #skemacontainer';
		const at = $(atElement);
		at.load(skemaurl, () => {
			LectioCluetips.Initialize(); //STM 32406
		});
	}
}
