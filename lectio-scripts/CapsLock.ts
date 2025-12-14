export class CapsLock {
	private static capslockState : boolean | null;

	public static capsDetect(e: any, warningElementId: string) {
		if (!e) {
			e = window.event;
		}
		if (!e) {
			return;
		}
		let key = e.charCode ? e.charCode : (e.keyCode ? e.keyCode : (e.which ? e.which : 0));
		key = (0 < key && key <= 255 ? String.fromCharCode(key) : '');
		const shift = e.shiftKey || (e.modifiers && e.modifiers & 4);
		if (key != key.toUpperCase() || key !== key.toLowerCase()) {
			const state = (key === key.toLowerCase() && shift) || (key === key.toUpperCase() && !shift);
			CapsLock.capslockState = state;
			CapsLock.showWarning(state, warningElementId);
		}
	}

	public static capsToggle(e: any, warningElementId: string) {
		if (!e) {
			e = window.event;
		}
		if (!e) {
			return;
		}
		const key = (e.keyCode ? e.keyCode : 0);
		if (key === 20 && (typeof (CapsLock.capslockState) == 'boolean')) {
			CapsLock.capslockState = !CapsLock.capslockState;
			CapsLock.showWarning(CapsLock.capslockState, warningElementId);
		}
	}

	public static capsReset(warningElementId: string) {
		CapsLock.capslockState = null;
		CapsLock.showWarning(false, warningElementId);
	}

	private static showWarning(v : boolean, elementId : string) : void {
		if (document.getElementById) {
			const elem = document.getElementById(elementId);
			if (elem) {
				elem.style.display = v ? 'block' : 'none';
			}
		}
	}
}