/***********************************
** By Morten                     **
** Select Box Name Search        **
***********************************/

//To første parameter er påkrævede og er altid de samme
//<SELECT NAME=x ONKEYPRESS="javascript: return SelectboxNameSearch(this, event);">
// OnEnterLanguage kun ved multi-clientside language environment
// i.e. : Should never be used in lectio

export class LectioDropDown {
	private static SelectboxNS_SearchStr = '';
	private static SelectboxNS_TimeOut = 0;
	private static SelectboxNS_Start = 1;
	private static SelectboxNS_TimeOutCode = '';
	private static SelectboxNS_LastBoxUniqueID = '';
	private static SelectboxNS_LastDisplayID = '';

	public static SelectboxNameSearch(CBox: HTMLSelectElement, e: any, DisplayID: string, OnEnter: string, OnEnterLanguage: string)
		: boolean {
		let IsExplorer : boolean, Found : boolean, i : number, TOptionTxt : string, uniqueID : string, KeyCode : any;
		if (document.all) {
			IsExplorer = true;
		} else {
			IsExplorer = false;
		}
		if (!e) {
			e = window.event;
		}
		Found = false;
		uniqueID = CBox.name + '_SelectboxNameSearch_' + CBox.id;
		KeyCode = (IsExplorer ? e.keyCode : e.charCode);

		if (uniqueID != LectioDropDown.SelectboxNS_LastBoxUniqueID && LectioDropDown.SelectboxNS_TimeOutCode !== '') {
			window.clearTimeout(LectioDropDown.SelectboxNS_TimeOut);
			LectioDropDown.SelectboxNS_Start = 1;
			LectioDropDown.SelectboxNS_SearchStr = '';
			LectioDropDown.SelectboxNS_LastBoxUniqueID = '';
			if ((LectioDropDown.SelectboxNS_LastDisplayID || '') !== '') {
				if (IsExplorer) {
					document.getElementById(LectioDropDown.SelectboxNS_LastDisplayID)!.innerText = '';
				} else {
					document.getElementById(LectioDropDown.SelectboxNS_LastDisplayID)!.textContent = '';
				}
			}
			LectioDropDown.SelectboxNS_LastDisplayID = '';
			LectioDropDown.SelectboxNS_TimeOutCode = '';
		}
		switch (KeyCode) {
			case 13:
				if ((OnEnter || '') !== '') {
					if ((OnEnterLanguage || '') !== '') {
						window.setTimeout(OnEnter, 100, OnEnterLanguage);
					} else {
						window.setTimeout(OnEnter, 100);
					}
				}
				return true;
			case 0:
				return true; //In case of f.ex. tab in Mozilla
		}
		window.clearTimeout(LectioDropDown.SelectboxNS_TimeOut);

		LectioDropDown.SelectboxNS_SearchStr = LectioDropDown.SelectboxNS_SearchStr + String.fromCharCode(KeyCode).toLowerCase();

		if ((DisplayID || '') !== '') {
			if (IsExplorer) {
				document.getElementById(DisplayID)!.innerText = LectioDropDown.SelectboxNS_SearchStr;
			} else {
				document.getElementById(DisplayID)!.textContent = LectioDropDown.SelectboxNS_SearchStr;
			}
		}

		if (LectioDropDown.SelectboxNS_Start === 1) {
			for (i = 0; i < CBox.options.length; i++) {
				TOptionTxt = <string>(IsExplorer ? CBox.options[i].innerText : CBox.options[i].textContent);
				if (TOptionTxt.toLowerCase().indexOf(LectioDropDown.SelectboxNS_SearchStr) === 0) {
					if (IsExplorer) {
						(CBox as any).setCapture();
						(CBox as any).releaseCapture();
					}
					CBox.selectedIndex = CBox.options[i].index;
					CBox.value = CBox.options[i].value;
					if (CBox.onchange) {
						CBox.onchange(null as any);
					}
					Found = true;
					break;
				}
			}
			if (!Found) {
				LectioDropDown.SelectboxNS_Start = 2;
			}
		}
		if (LectioDropDown.SelectboxNS_Start === 2) {
			for (i = 0; i < CBox.options.length; i++) {
				TOptionTxt = <string>(IsExplorer ? CBox.options[i].innerText : CBox.options[i].textContent);
				if (TOptionTxt.toLowerCase().indexOf(LectioDropDown.SelectboxNS_SearchStr) > 0) {
					if (IsExplorer) {
						(CBox as any).setCapture();
						(CBox as any).releaseCapture();
					}
					CBox.selectedIndex = CBox.options[i].index;
					CBox.value = CBox.options[i].value;
					if (CBox.onchange) {
						CBox.onchange(null as any);
					}
					Found = true;
					break;
				}
			}
			if (!Found) {
				LectioDropDown.SelectboxNS_Start = 3;
			}
		}

		LectioDropDown.SelectboxNS_LastDisplayID = DisplayID;
		LectioDropDown.SelectboxNS_LastBoxUniqueID = uniqueID;

		LectioDropDown.SelectboxNS_TimeOutCode = 'SelectboxNS_Start = 1; ';
		LectioDropDown.SelectboxNS_TimeOutCode = LectioDropDown.SelectboxNS_TimeOutCode + 'SelectboxNS_SearchStr = \'\';';
		LectioDropDown.SelectboxNS_TimeOutCode = LectioDropDown.SelectboxNS_TimeOutCode + 'SelectboxNS_LastBoxUniqueID = \'\'; ';
		if ((DisplayID || '') !== '') {
			LectioDropDown.SelectboxNS_TimeOutCode = LectioDropDown.SelectboxNS_TimeOutCode + 'document.getElementById(\'' + DisplayID + '\').' + (IsExplorer ? 'innerText' : 'textContent') + ' = \'\';';
		}
		LectioDropDown.SelectboxNS_TimeOutCode = LectioDropDown.SelectboxNS_TimeOutCode + 'SelectboxNS_LastDisplayID = \'\'; ';
		LectioDropDown.SelectboxNS_TimeOutCode = LectioDropDown.SelectboxNS_TimeOutCode + 'SelectboxNS_TimeOutCode = \'\'; ';

		LectioDropDown.SelectboxNS_TimeOut = window.setTimeout(LectioDropDown.SelectboxNS_TimeOutCode, 1000);

		return true;
	}
}


