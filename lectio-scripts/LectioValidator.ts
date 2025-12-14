import { LectioJSUtils } from "./lectiolib";

export interface AspNetCustomValidatorArgument {
	IsValid: boolean;
	Value: string;
}

/** Dette er et dom-element med lidt ekstra. */
export interface AspNetValidator {
	controltovalidate: string;
	errormessage: string;
	display: string;
	style: { display: string; }
	/** Lectio-udvidelse: Navn på funktion, der skal vise og skjule validatoren. */
	displayupdatefunction?: string;
	getAttribute(name: string): any;
	isvalid: boolean;
	validationexpression: string;
}

declare let ValidatorGetValue: (id: string) => string;
declare let ValidatorTrim: (id: string) => string;

interface IAspNetCustomCustomValidatorFunction {
	(val: Element, args: AspNetCustomValidatorArgument): void;
}

declare const RequiredFieldValidatorEvaluateIsValid: (val: AspNetValidator) => boolean;
declare let RegularExpressionValidatorEvaluateIsValid: (val: AspNetValidator) => boolean;

/** Flg. er aht. validator i editoren, hvor vi har behov for selv at styre, hvordan editoren viser og skjuler valideringsfejl. */
declare let ValidatorUpdateDisplay: (val: AspNetValidator) => void;
let ValidatorUpdateDisplay_Original: (val: AspNetValidator) => void;


export class LectioValidator {
	// Validerings funktion der også tager sig af fremvisning
	// Arbejder udenom den almene ASP.Net validering, da denne er begrænset til at
	//  beskæftige sig med validerings elementet
	public static LectioRequiredFieldValidatorEvaluateIsValid(val: AspNetValidator) {
		const tmpRes = RequiredFieldValidatorEvaluateIsValid(val);

		let ctrl = <HTMLInputElement>document.getElementById(val.controltovalidate);
		//Handle genius-picker
		//Vi antager at det er det foregående input element der skal angives som værende påkrævet
		if (ctrl.type === "hidden") {
			ctrl = <HTMLInputElement>$(ctrl).prevAll('input')[0];
		}

		const $ctrl = $(ctrl);

		if (!tmpRes) {
			$ctrl.addClass('valerror').attr('placeholder', val.errormessage);

			// Selects doesn't support placeholder text
			if (LectioValidator.IsElementSelect(ctrl)) {
				$ctrl.find('option').each((i, elm) => {
					LectioJSUtils.GetAssertedType(elm, HTMLOptionElement, 'option').selected = false;
					if ($(elm).text().toUpperCase() === "") $(elm).remove();
				});

				$('<option style="display: none;">Påkrævet</option>')
					.attr('selected', 'true').
					attr('disabled', 'true')
					.prependTo($ctrl);

				ctrl.selectedIndex = 0;
				$ctrl.css('color', 'red');
				//SetTimeout to delay to after handlers have run
				setTimeout(() => { $ctrl.on('click', () => { $ctrl.css('color', ''); }); }, 1);
			}
		} else {
			$ctrl.removeClass('valerror').attr('placeholder', '');
			if (LectioValidator.IsElementSelect(ctrl)) {
				$ctrl.css('color', '');
			}
		}

		// Handle pre-validated errors being shown(if display on server side is set
		//  different)
		val.display = 'None';
		if (val.style.display && val.style.display.toLowerCase() !== 'none')
			val.style.display = 'none';

		return tmpRes;
	}

	public static LectioRegularExpressionValidatorEvaluateIsValid(val: AspNetValidator): boolean {
		// Vi erstatter "\n" med "\r\n" fordi: https://stackoverflow.com/questions/14217101/what-character-represents-a-new-line-in-a-text-area 
		const value = ValidatorGetValue(val.controltovalidate).replace( /\n/g, "\r\n" );
		if (ValidatorTrim(value).length == 0)
			return true;
		const rx = new RegExp(val.validationexpression);
		const matches = rx.exec(value);
		return (matches != null && value == matches[0]);
	}

	private static IsElementSelect(el: HTMLElement): el is HTMLSelectElement {
		return el.nodeName === 'SELECT';
	}
	
	private static LectioValidatorUpdateDisplay(val: AspNetValidator): void {
		const f: string = val.getAttribute('displayupdatefunction');
		if (!f) {
			if(ValidatorUpdateDisplay_Original) 
				ValidatorUpdateDisplay_Original(val);
			return;
		}
		eval(f + "(val)");
	}

	public static Initialize() {

		if ("RegularExpressionValidatorEvaluateIsValid" in window) {
			RegularExpressionValidatorEvaluateIsValid = LectioValidator.LectioRegularExpressionValidatorEvaluateIsValid;
		}

		$(() => {
			if ("ValidatorUpdateDisplay" in window) {
				const tmp = ValidatorUpdateDisplay;
				ValidatorUpdateDisplay = LectioValidator.LectioValidatorUpdateDisplay;
				ValidatorUpdateDisplay_Original = tmp;
			}
			
		});

		$(() => {
			// lectio bruger gammel asp.net klientvalidering, men har samtidig behov for at kunne lave klientvalidering
			// på mere komplekse værdier end string, så vi nedarver fra BaseValidator, og undgår at skulle registrere asp.net-javascript
			// ved hjælp af flg. initialisering, der gør vores validator synlig for asp.net-javascriptet.
			$('*[evaluationfunction]').each((idx, ele) => {
				const functionName = ele.getAttribute('evaluationfunction');
				(this as any).evaluationfunction = (window as any)[functionName!];
			});
		});
	}
}