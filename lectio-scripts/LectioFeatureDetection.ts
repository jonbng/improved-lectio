
export namespace LectioFeatureDetection {

	// Detect if ClickOnce is supported by the browser.
	// Roughly based on http://stackoverflow.com/a/4653175/117402

	function hasMimeSupport(desiredMime: string) {
		const mimes = window.navigator.mimeTypes;
		let hasSupport = false;

		for (const mime in mimes) {
			if ((mime as any).type === desiredMime) {
				hasSupport = true;
			}
		}

		return hasSupport;
	}

	export function HasClickOnceExtension(): boolean {
		return (window.navigator.plugins.namedItem('ClickOnce plugin for Chrome') !== null);
	}
	
	const isFirefox = /Firefox/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent);
	const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
	const isIe = !!(navigator.userAgent.match(/MSIE/) || navigator.userAgent.match(/Trident\//));
	const isOldEdge = navigator.userAgent.indexOf('Edge/') !== -1;
	const isEdgeChromium = navigator.userAgent.indexOf('Edg/') !== -1;

	const isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;

	export function IsFirefox() {
		return isFirefox;
	}
	export function IsChrome() {
		return isChrome;
	}
	
	export function IsEdgeChromium() {
		return isEdgeChromium;
	}
	export function IsOldEdge() {
		return isOldEdge;
	}
	export function IsIE() {
		return isIe;
	}
	export function IsMac() {
		return isMac;
	}

	export function OnlyIfNotIE(ErrorMessageDivId: string, action: any, ErrorMessage?: string) {
		if (!ErrorMessage)
			ErrorMessage = "Denne funktionalitet er ikke længere understøttet i Internet Explorer.";
		if (IsIE()) {
			$("#" + ErrorMessageDivId).text(ErrorMessage);
		} else
			action();
	}

	export function SupportsScrollOptions() {
		return !isIe;
	}

	export function SupportsWpf() {
		if (isIe || isOldEdge || isEdgeChromium)
			return true;

		// Andre browsere kan godt understøtte clickonce vha. plugins for clickonce-mimetypen.
		return hasMimeSupport("application/x-ms-application") ||
			HasClickOnceExtension();

	}
}
