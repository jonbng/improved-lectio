import { JSErrorHandling } from './JSErrorHandling';

export class LectioWebform {
	public static Initialize() {
		/*******************
		** Overwrite standard WebForm_FireDefaultButton
		** Dette gøres fordi at WebForm_FireDefaultButton default canceler alle returns.
		** Men på hyperlinks er dette faktisk aktivering a hyperlinket, hvilket vi stadig ønsker.
		*******************/
		$(() => {
			const org = window.WebForm_FireDefaultButton;
			window.WebForm_FireDefaultButton = (event, target) => {
				const src = event.target;
				if (src instanceof HTMLElement && src.tagName.toLowerCase() === "a") {
					return true;
				}
				if (src instanceof HTMLElement && src.tagName.toLowerCase() === "button") {
					// stm 34258: Vil gerne kunne bruge enter paa dialog-knapper i ModalDialogAsync.
					return true;
				}
				if (org != null && org != undefined) {

					try {
						return org(event, target);
					} catch (e: any) {
						JSErrorHandling.reportJSError("org(event, target) typeof org=" + (typeof org), e.toString());
						return empty(event, target);
					}
				}

				JSErrorHandling.reportJSError("org != null && org != undefined");
				return empty(event, target);
			};
		});

		//som forsøg på at undgå javscript fejl "org is not a function"
		function empty(e: Event, target: any): boolean {
			return false;
		}
	}
}
