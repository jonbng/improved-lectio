export class DynamicDropDown {
	public static filldyndropdown(ctrlid: string, values: any) {
		const selectbox = document.getElementById(ctrlid);
		if (!(selectbox instanceof HTMLSelectElement))
			throw new Error('Er ikke input-element.');

		// Er valgboksen allerede populeret?
		if (selectbox.options.length > 1) {
			return;
		}

		let selectedText: string | null = null;
		let selectedvalue: string | null = null;

		// Første element indeholder den valgte værdi.
		if (selectbox.options.length > 0) {
			selectedvalue = selectbox.options[selectbox.selectedIndex].value;
			selectedText = selectbox.options[selectbox.selectedIndex].text;
		}

		// Populer listen
		selectbox.options.length = 0;

		let selfound = false;
		for (const x in values) {
			if (values.hasOwnProperty(x)) {
				const val = values[x];
				const oOption = document.createElement('option');
				oOption.text = val[1];
				oOption.value = val[0];

				if (val[0] === selectedvalue) {
					oOption.selected = true;
					selfound = true;
				}

				if (document.all) {
					selectbox.add(oOption);
				} else {
					selectbox.add(oOption, undefined);
				}
			}
		}

		if (!selfound) {
			alert('Den valgte værdi er ikke gyldig.');

			if (selectedText !== null) {
				const oOption2 = document.createElement('option');
				oOption2.text = selectedText;
				oOption2.value = selectedvalue || '';
				oOption2.selected = true;

				if (document.all) {
					selectbox.add(oOption2);
				} else {
					selectbox.add(oOption2, undefined);
				}
			}
		}
	}
}