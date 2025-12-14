export namespace LinkHelper {

    function AddOrUpdateQuerystringKeyValue(url: string, paramsToUpdate: { [key: string]: string }): string {
        const parsedUrl = new URL(url);
        for (const key of Object.keys(paramsToUpdate)) {
            const newValue = paramsToUpdate[key];
            parsedUrl.searchParams.set(key, newValue);
        }
        return parsedUrl.toString();
    }

    type LinkArgs = {
        url: string,
        queryParamDict: { [key: string]: string }
    }

    export function GoTo(arg: LinkArgs) {
        window.location.href = AddOrUpdateQuerystringKeyValue(arg.url, arg.queryParamDict);
    }

}