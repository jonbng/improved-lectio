export function MoveSelection(clientid: any, from: any, to: any) {
	const jqfrom = $("select#" + clientid + "_" + from).find(":selected");
	const jqto = $("select#" + clientid + "_" + to);

	jqfrom.each(
		function (i, selected) {
			if ($(selected).attr('locked'))
				return;
			(selected as HTMLOptionElement).selected = false;
			jqto.append(selected);
		}
	);

	const useDirect = jqfrom.length <= 10;
	SelectBoxSort(jqto, useDirect);

	PersistSelected(clientid);

	if ($("select#" + clientid + "_selectedSet").parents('table').attr('ismobilebrowser') == "True")
		MarkAllInSelectionList(clientid);
}

function MarkAllInSelectionList(clientid: any) {
	$("select#" + clientid + "_selectedSet").each(function () {
		const ths = this as HTMLSelectElement;

		for (let count = 0; count < ths.options.length; count++)
			ths.options[count].selected = true;
	});
}

function PersistSelected(clientid: any) {
	const jqto = $("select#" + clientid + "_selectedSet");

	const tohidden = $("input#" + clientid + "_selectedIds");

	const str: string[] = [];
	$("option", jqto).each(function (a, b) {
		str.push((b as HTMLOptionElement).value);
	});
	tohidden.val(str.join(";"));
}

function SelectBoxSort(selectboxJid: any, doInlineSort: any) {
	const options = $(selectboxJid);

	const opts_list = options.find('option').get();

	opts_list.sort(function (a, b) {
		const aa = parseInt($(a).attr("sortint") as string);
		const bb = parseInt($(b).attr("sortint") as string);
		return aa > bb ? 1 : (aa == bb) ? 0 : -1;
	});

	options.append(opts_list);
}
