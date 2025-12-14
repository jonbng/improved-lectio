/// <reference path="../v2/CustomTypes/jquery.cluetip.d.ts"/>

import * as LectioJSUtils from './LectioJSUtils';

// requires jquery.hoverintent and jquery.cluetip
export class LectioCluetips {
	static Initialize() {

		if (LectioJSUtils.LectioJSUtils.IsMobile()) {
			return;
		}
		$(() => {
			$.cluetip.defaults.hoverIntent.interval = 100;
			$.cluetip.defaults.width = 310;
			$.cluetip.defaults.showTitle = false;
			$.cluetip.defaults.waitImage = false;

			$('[data-tooltip]').each((ix: number, el: Element) => {
				const t = $(el);
				t.cluetip(() => LectioJSUtils.LectioJSUtils.TooltipHtmlToHtml(<string>t.attr('data-tooltip')), {});
				if (ix > 500)
					return false;
				return;
			});
		});
	}
}