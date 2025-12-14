import { LectioJSUtils } from './LectioJSUtils';

export class LectioTimeSpan {
	seconds: number;

	// Til indvortes brug.
	constructor(seconds: number) {
		this.seconds = seconds;
	}

	static userInputRegExp = new RegExp("^ *([0-9]{1,2})(([.\\:]| +)([0-9]{1,2}))? *$");

	static Create(hours: number, minutes: number): LectioTimeSpan {
		const seconds = hours * 3600 + minutes * 60;

		return new LectioTimeSpan(seconds);
	}

	static TryParseUserInput(timeText: string): LectioTimeSpan | null {
		LectioJSUtils.AssertArgument(typeof (timeText) === "string");

		const arr = timeText.match(LectioTimeSpan.userInputRegExp);
		if (arr === null)
			return null;

		const hours = parseInt(arr[1], 10);
		if (hours > 24)
			return null;


		const minutes = arr.length >= 2 && typeof (arr[4]) !== "undefined" && arr[4] !== ""
			? parseInt(arr[4], 10)
			: 0;
		if (minutes > 59)
			return null;

		return LectioTimeSpan.Create(hours, minutes);
	}

	static ParseUserInput(timeSpanText: string): LectioTimeSpan {
		const ts = LectioTimeSpan.TryParseUserInput(timeSpanText);
		if (ts === null)
			throw "Kan ikke parse tidspunkt: '" + timeSpanText + "'.";

		return ts;
	}

	AddMinutes(minutes: number): LectioTimeSpan {
		const s = this.seconds + minutes * 60;
		return new LectioTimeSpan(s);
	}

	GetHours(): number {
		const neg = this.seconds < 0;
		const d = Math.abs(this.seconds) / (60 * 60);
		const hours = Math.floor(d);
		return hours * (neg ? -1 : 1);
	}

	GetTotalMinutes(): number {
		const totalMinutes = Math.floor(this.seconds / 60);
		return totalMinutes;
	}

	GetMinutes(): number {
		const totalMinutes = this.GetTotalMinutes();
		const hours = this.GetHours();
		const minutes = Math.abs(totalMinutes) - 60 * Math.abs(hours);
		return minutes * (totalMinutes < 0 ? -1 : 1);
	}

	ToLectioTimeSpanString(): string {
		const hours = this.GetHours();
		const minutes = this.GetMinutes();
		const ms = (minutes < 10 ? '0' : '') + minutes;
		return hours + ':' + ms;
	}

	toString(): string {
		return "[" + this.ToLectioTimeSpanString() + "]";
	}
}