import { LectioFeatureDetection } from "./LectioFeatureDetection";
import { LectioJSUtils } from "./LectioJSUtils";

export namespace JSErrorHandling {

	export interface JavascriptErrorData {
		message: string;
		source: string | null;
		lineNumber?: number;
		columnNumber?: number;
		// json-serialisering af Error i chrome (36) giver ikke nogen properties.
		// Error.stack indeholder imidlertid alt hvad vi har brug for.
		stack?: string;
		userAgent?: string;
		customData?: any;
		error: Error | undefined;
	}

	export function reportJSError(title: string, details?: string) {
		const stack = LectioJSUtils.GetStackTrace();

		reportJSErrorImpl({
			message: "Javascript fejl: " + title,
			source: null,
			stack: stack,
			userAgent: navigator.userAgent,
			customData: details,
			error: undefined,
		});
	}

	export function reportJSErrorImpl(errorData: JavascriptErrorData) {
		if (!window.JSON)
			return;
		if (LectioFeatureDetection.IsIE())
			return;

		//Clone da JSON.stringify ikke virker for inherited properties (Error typen)
		const newObject = {
			message: errorData.message,
			source: errorData.source,
			lineNumber: errorData.lineNumber,
			columnNumber: errorData.columnNumber,
			stack: errorData.stack,
			userAgent: errorData.userAgent,
			customData: errorData.customData,
			error: {
				name: errorData.error != undefined ? errorData.error.name : null,
				message: errorData.error != undefined ? errorData.error.message : null,
				stack: errorData.error != undefined ? errorData.error.stack : null
			}
		};

		$.post(LectioJSUtils.GetBaseSchoolURL() + '/Utils/LectioErrorReport.aspx', { errorData: JSON.stringify(newObject) });
	}
}