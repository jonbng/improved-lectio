import { LectioJSUtils } from "./LectioJSUtils";

export namespace SelectChooser {

	function hasValue(oSelect: HTMLSelectElement, val: string) {
		for (let i = 0; i < oSelect.options.length; i++) {
			if (oSelect.options[i].value == val) {
				return true;
			}
		}
		return false;
	}

	export function SelectFirstEntries(id: string): void {
		const myListbox =
			LectioJSUtils.GetAssertedType(document.getElementById(id + "_MyListbox"), HTMLSelectElement, 'select');
		const myListboxSel =
			LectioJSUtils.GetAssertedType(document.getElementById(id + "_MyListboxSel"), HTMLSelectElement, 'select');
		for (let i = 1; i < myListbox.options.length; i++) {
			myListbox.options[i].selected = false;
		}
		if (myListbox.options.length > 0) {
			myListbox.options[0].selected = true;
		}
		for (let i = 1; i < myListboxSel.options.length; i++) {
			myListboxSel.options[i].selected = false;
		}
		if (myListboxSel.options.length > 0) {
			myListboxSel.options[0].selected = true;
		}
	};

	export function AddOption(oSelect: HTMLSelectElement, val: string, txt: string, selected: boolean, type: number):
		void {
		const upper = txt.toUpperCase();
		let selectno : number;
		let i : number;

		if (oSelect.options.length === 0) //Hvis der ikke er nogen, tilfoj
		{
			selectno = oSelect.options.length;
			oSelect.options[oSelect.options.length] = new Option(txt, val);
		} else //Se hvor pagaldende vardi passer ind
		{
			let j = 0;

			if (type === 0) //Alm.
			{
				for (i = 0; i < oSelect.options.length; i++) {
					j = i;
					if (upper < oSelect.options[i].text.toUpperCase()) {
						break;
					}
					j++;
				} //OK, nu skal den ind som nr. j
			} else //type == 1, find vikar
			{
				const hieraki = val.substring(0, 1);
				for (i = 0; i < oSelect.options.length; i++) {
					j = i;
					if (hieraki == oSelect.options[i].value.substring(0, 1) && upper < oSelect.options[i].text.toUpperCase()) {
						break;
					} else if (hieraki < oSelect.options[i].value.substring(0, 1)) {
						break;
					}
					j++;
				} //OK, nu skal den ind som nr. j
			}
			for (i = oSelect.options.length; i > j; i--) {
				oSelect.options[i] = new Option(oSelect.options[i - 1].text, oSelect.options[i - 1].value);
				oSelect.options[i].selected = oSelect.options[i - 1].selected;
			}
			selectno = j;
			oSelect.options[j] = new Option(txt, val);
		}
		oSelect.options[selectno].selected = selected;
	};

	export function SelectThis(id: string, val: string, type: number): void
	{
		const myListbox =
			LectioJSUtils.GetAssertedType(document.getElementById(id + "_MyListbox"), HTMLSelectElement, 'select');
		const myListboxSel =
			LectioJSUtils.GetAssertedType(document.getElementById(id + "_MyListboxSel"), HTMLSelectElement, 'select');

		for (let i = 0; i < myListbox.options.length; i++) {
			if (myListbox.options[i].value == val) {
				const val2 = myListbox.options[i].value;
				const txt = myListbox.options[i].text;
				if (!hasValue(myListboxSel, val2)) {
					SelectChooser.AddOption(myListboxSel, val2, txt, false, type);
					myListbox.options[i].selected = true;
				}
			}
		}
		//Fjern entries i listen med tilgangelige
		while (myListbox.selectedIndex >= 0) {
			myListbox.remove(myListbox.selectedIndex);
		}
	};

	export function RemoveBtn(id: string, type: number): void {
		const myListbox =
			LectioJSUtils.GetAssertedType(document.getElementById(id + "_MyListbox"), HTMLSelectElement, 'select');
		const myListboxSel =
			LectioJSUtils.GetAssertedType(document.getElementById(id + "_MyListboxSel"), HTMLSelectElement, 'select');

		//Fjern markering i tilgangelige
		myListbox.selectedIndex = -1;

		while (myListboxSel.selectedIndex >= 0) {
			//Add den vi fjerner, tilfojer vi til listen med tilgangelige
			AddOption(myListbox,
				myListboxSel.options[myListboxSel.selectedIndex].value,
				myListboxSel.options[myListboxSel.selectedIndex].text,
				true,
				type);
			myListboxSel.remove(myListboxSel.selectedIndex);
		}
	};

	export function AddBtn(id: string, type: number): void {
		const myListbox =
			LectioJSUtils.GetAssertedType(document.getElementById(id + "_MyListbox"), HTMLSelectElement, 'select');
		const myListboxSel =
			LectioJSUtils.GetAssertedType(document.getElementById(id + "_MyListboxSel"), HTMLSelectElement, 'select');

		myListboxSel.selectedIndex = -1;
		for (let i = 0; i < myListbox.options.length; i++) {
			if (myListbox.options[i].selected) {
				const val = myListbox.options[i].value;
				const txt = myListbox.options[i].text;
				if (!hasValue(myListboxSel, val)) {
					AddOption(myListboxSel, val, txt, true, type);
				}
			}
		}
		//Fjern entries i listen med tilgangelige
		while (myListbox.selectedIndex >= 0) {
			myListbox.remove(myListbox.selectedIndex);
		}
	};

	export function selectsubmit(id: string): void {
		const myListboxSel =
			LectioJSUtils.GetAssertedType(document.getElementById(id + "_MyListboxSel"), HTMLSelectElement, 'select');
		for (let i = 0; i < myListboxSel.options.length; i++) {
			myListboxSel.options[i].selected = true;
		}
	}
}