import ErrorStackParser from 'error-stack-parser';
import stackMapper from 'stack-mapper';
import convertSourceMap from 'convert-source-map';

import { LectioJSUtils } from './LectioJSUtils';

export class StackTraceHelper {
	public static ParseError(error: Error, useDebugScripts: boolean, callback: (text: string) => void) {
		const stackFrames = ErrorStackParser.parse(error);

		const mappedStackFrames = stackFrames.map(v => {
			const orgFilename = v.getFileName();
			let newFilename: string | null;
			if (orgFilename) {
				newFilename = orgFilename.substring(orgFilename.lastIndexOf('/') + 1);

				const idx = newFilename.lastIndexOf('?');
				if (idx !== -1)
					newFilename = newFilename.substring(0, idx);

				newFilename = newFilename.replace("#", "");

				if (newFilename.lastIndexOf("lectiobundle") !== -1)
					newFilename = "./scripts/" + newFilename;
			}
			else
				newFilename = null;

			return {
				filename: newFilename ?? 'umm-dunny',
				line: v.getLineNumber() ?? -666,
				column: v.getColumnNumber() ?? -666
			};
		});

		let lectiobundleJSMap: string;
		if (useDebugScripts) {
			lectiobundleJSMap = 'scripts/lectiobundle.js.map';
		} else {
			lectiobundleJSMap = 'scripts/lectiobundle.min.js.map';
		}


		$.get(LectioJSUtils.GetBaseUrl_SpecialCase() + lectiobundleJSMap,
			(data, textStatus, jqXHR) => {
				if (textStatus == "success") {
					const map = convertSourceMap.fromJSON(data).toObject();

					const sm = stackMapper(map);
					const mappedCallSites = sm.map(mappedStackFrames);

					const s = mappedCallSites
						.map(v => v.filename + ":" + v.line + ":" + v.column)
						.join("\r\n");
					callback(s);
				} else {
					callback("Fejl: " + textStatus);
				}
			});
	}

	public static Test() {
		try {
			this.PrivateFunc();
		} catch (e: any) {
			const callback = (s: string) => LectioJSUtils.LogDebug(s);
			this.ParseError(e, true, callback);
		}

		return '';
	}

	private static PrivateFunc() {
		LectioJSUtils.LogDebug("test");
		throw new Error("en fejl");
	}
}