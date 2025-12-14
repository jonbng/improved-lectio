
export namespace LectioVisma {

	type VismaImsCaseArgs = Readonly<{
		imsCaseUrl: string,
		searchValue: string
	}>

	export async function SearchAllCasesAsync(args: VismaImsCaseArgs): Promise<void> {
		const vcaseUrl = "https://" + args.imsCaseUrl + "/alfresco/wcs/api/openesdh/noauth/advanced-search/onetime/filter";
		const body = JSON.stringify({
			"searchParams": [
				{
					"qName": "ADV_SEARCH.PARAM.ALL",
					"value": args.searchValue
				}
			]
		});
		const response = await fetch(vcaseUrl, {
			method: "POST",
			body: body,
			headers: {
				"Content-Type": "application/json"
			}
		});
		const url = await response.json();
		window.open(url, '_blank');
	}
}