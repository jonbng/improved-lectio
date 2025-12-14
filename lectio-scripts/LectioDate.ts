import { LectioJSUtils } from "./LectioJSUtils";

export class LectioDate {
	/// Til indvortes brug.
	private jsDateObj: Date;

	constructor(jsDateObj: Date) {
		this.jsDateObj = jsDateObj;
	}

	static jqueryDateFormat = "dd/mm-yy";
	// A la Date. "Serialized string is DD_MM_YYYY".
	static serializedDateFormat = "yy-mm-dd";
	static userInputRegExp = new RegExp("^ *([0-9]{1,2})([.\\-/]| +)([0-9]{1,2})([.\\-/]| +)([0-9]{2,4}) *$");
	static userInputRegExp2 = /^[0-9,/\-. ]+$/;


	static FromDate(jsDateObj: Date): LectioDate {
		if (arguments.length !== 1) {
			throw "Forkert antal argumenter.";
		}
		return new LectioDate(jsDateObj);
	}

	static Create(year: number, month: number, day: number): LectioDate {
		const jsDate = new Date(year, month - 1, day);
		return new LectioDate(jsDate);
	}

	// "2024-01-02"
	static ParseIso(dateText: string): LectioDate {
		const match = dateText.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
		if (!match)
			throw new Error("10 digits");
		const year = parseInt(match[1], 10);
		const month = parseInt(match[2], 10);
		const day = parseInt(match[3], 10);

		const jsDate = new Date(year, month - 1, day);
		return LectioDate.FromDate(jsDate);
	}

	static ParseExact(dateText: string): LectioDate {
		const jsDate = $.datepicker.parseDate(LectioDate.jqueryDateFormat, dateText);
		return LectioDate.FromDate(jsDate);
	}

	static TryParseUserInputCreative(dateText: string): LectioDate | null {

		// trim
		const t = dateText.trim();
		if (t.length === 0)
			return null;

		if (!this.userInputRegExp2.test(t))
			return null;

		const split = t.split(/[-/: .,]/, 3);
		const today = new Date();
		let _day = today.getDate(),
			_month = today.getMonth() + 1,
			_year = today.getFullYear();

		if (split.length === 1) // no separators
		{
			const part = split[0];
			if (part.length <= 2)
				_day = parseInt(part);
			else if (part.length <= 4) {
				_month = parseInt(part.substr(part.length - 2));
				_day = parseInt(part.substr(0, part.length - 2));
			}
			else if (part.length <= 6) {
				_year = parseInt(part.substr(part.length - 2)) + 2000;
				_month = parseInt(part.substr(part.length - 4, 2));
				_day = parseInt(part.substr(0, part.length - 4));
			}
			else if (part.length <= 8) {
				_year = parseInt(part.substr(part.length - 4));
				_month = parseInt(part.substr(part.length - 6, 2));
				_day = parseInt(part.substr(0, part.length - 6));
			}
		}
		else if (split.length === 2) {
			const part1 = split[0];
			const part2 = split[1];

			// det antages at vi taler om dag+måned
			_day = parseInt(part1);
			_month = parseInt(part2);
		} else if (split.length === 3) {
			const part1 = split[0];
			const part2 = split[1];
			const part3 = split[2];

			_day = parseInt(part1);
			_month = parseInt(part2);
			_year = parseInt(part3);
			if (_year < 100)
				_year += 2000;
		}
		const jsDate = new Date(_year, _month - 1, _day);
		// Date accepterer overflow, så vi skal lige tjekke at det ikke er sket.
		if (jsDate.getDate() !== _day || jsDate.getMonth() !== _month - 1 || jsDate.getFullYear() !== _year) {
			return null;
		}
		return LectioDate.FromDate(jsDate);
	}


	static TryParseUserInput(dateText: string): LectioDate | null {
		const arr = dateText.match(LectioDate.userInputRegExp);
		if (arr === null) {
			return null;
		}
		const dayNum = parseInt(arr[1], 10);
		const monthNum = parseInt(arr[3], 10);
		let yearNum = parseInt(arr[5], 10);

		const cutoffYear = 30;
		if (yearNum < 100) {
			yearNum = (yearNum < cutoffYear ? 2000 : 1900) + yearNum;
		}

		const jsDate = new Date(yearNum, monthNum - 1, dayNum);
		// Date accepterer overflow, så vi skal lige tjekke at det ikke er sket.
		if (jsDate.getDate() !== dayNum || jsDate.getMonth() !== monthNum - 1 || jsDate.getFullYear() !== yearNum) {
			return null;
		}

		return LectioDate.FromDate(jsDate);
	}

	static ParseUserInput(dateText: string): LectioDate {
		const ld = LectioDate.TryParseUserInput(dateText);
		if (ld === null) {
			throw "Kan ikke parse dato: '" + dateText + "'.";
		}
		return ld;
	}

	IsLessThan(otherDate: LectioDate): boolean {
		return this.jsDateObj < otherDate.jsDateObj;
	}
	IsLessThanOrEqual(otherDate: LectioDate): boolean {
		return this.jsDateObj <= otherDate.jsDateObj;
	}

	IsEqual(otherDate: LectioDate): boolean {
		return this.jsDateObj.getTime() == otherDate.jsDateObj.getTime();
	}

	AddDays(count: number): LectioDate {
		const dt = new Date(this.jsDateObj.getTime());
		dt.setDate(dt.getDate() + count);
		return LectioDate.FromDate(dt);
	}

	Subtract(other: LectioDate) {
		const diff = (this.GetJSDate().getTime() - other.GetJSDate().getTime());
		const days = diff / (24 * 60 * 60 * 1000);
		return days;
	}

	GetJSDate(): Date {
		return new Date(this.jsDateObj.getTime());
	}

	GetDate() {
		return this.jsDateObj.getDate();
	}

	GetMonth() {
		return this.jsDateObj.getMonth() + 1;
	}

	GetYear(): number {
		return this.jsDateObj.getFullYear();
	}

	ToLectioDateString() {
		return $.datepicker.formatDate(LectioDate.jqueryDateFormat, this.jsDateObj);
	}

	ToIsoDateString() {
		return $.datepicker.formatDate(LectioDate.serializedDateFormat, this.jsDateObj);
	}

	ToDDMMYYYY() {
		return $.datepicker.formatDate("ddmmyy", this.jsDateObj);
	}

	RemoveTime(): LectioDate {
		return LectioDate.Create(this.GetYear(), this.GetMonth(), this.GetDate());
	}

	ToIsoWeekYearString() {
		const weeknum = $.datepicker.iso8601Week(this.jsDateObj);
		const weeknumstr = (weeknum < 10 ? '0' : '') + weeknum.toString();
		let year: number = this.GetYear();
		if (weeknum > 50 && this.GetMonth() === 1)
			year -= 1;
		else if (weeknum === 1 && this.GetMonth() === 12)
			year += 1;
		return weeknumstr + year;
	}

	toString() {
		return "[" + this.ToLectioDateString() + "]";
	}
}