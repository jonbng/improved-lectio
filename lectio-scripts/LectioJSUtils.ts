/// <reference types="jquery"/>

import { LectioCookie } from "./LectioCookie";

/** Tagged any type. */
export type Tagged<TType, TTag> = TType & { ['-tag']?: TTag };
/** Tagged string. */
export type STagged<TTag> = string & { ['-tag']: TTag };

export interface LectioDeferred<T> {
	resolve: (v: T) => void;
	reject: (val: any) => void;
	isSettled: () => boolean;
	promise: () => Promise<T>;
}

export interface PlainObject<T> {
	[key: string]: T;
}

export type EventMods = Readonly<{
	ctrlKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
	metaKey: boolean;
	button: number,
}>;

// Goer NodeListOf<T> mere bekvem at arbejde med.
// Samme navne og impl. (fx. ivrigt evaluering) som Array,
// for naar/hvis browsere faar disse som standard, virker det sandsynligt at de
// vil goere det samme.

const ArrayMethodsToBorrow_KeysAsValue =
{
	'map': 42 as const,
	'filter': 42 as const,
	'slice': 42 as const,
	'reduce': 42 as const,
	'every': 42 as const,
	'some': 42 as const,
	'find': 42 as const,

	'single': 42 as const,
	'singleOrDefault': 42 as const,

	'first': 42 as const,
	'firstOrDefault': 42 as const,

	'last': 42 as const,
	'groupBy': 42 as const,
	'mapNotNull': 42 as const,
};

Array.prototype.maxBy = function <T, U>(this: T[], selector: (item: T) => U): T {
	let theitem: T | undefined = undefined;
	let theval: U | undefined = undefined;
	for (const item of this) {
		if (item === undefined || item === null)
			continue;
		const val = selector(item);
		if (val === undefined || val === null)
			continue;
		if (theval === undefined || theval === null) {
			theitem = item;
			theval = val;
			continue;
		}
		if (val as any > theval as any) {
			theitem = item;
			theval = val;
		}
	}
	if (theitem === undefined)
		throw new Error('No elements');

	return theitem;
}

const toCopy_Array_nodelist: Extract<
	keyof NodeListOf<HTMLElement>,
	keyof typeof ArrayMethodsToBorrow_KeysAsValue>[] =
	Object.keys(ArrayMethodsToBorrow_KeysAsValue) as any;
const toCopy_Array_htmlcollection: (keyof HTMLCollection)[] = toCopy_Array_nodelist;

declare global {
	interface Array<T> {
		single(predicate?: (value: T) => unknown): T;
		singleOrDefault(predicate?: (value: T) => unknown): T | undefined;
		first(predicate?: (value: T) => unknown): T;
		firstOrDefault(predicate?: (value: T) => unknown): T | undefined;

		last(predicate?: (value: T) => unknown): T;

		// maxBy<Key>: (selector: (item: T) => Key);
		maxBy<U>(callbackfn: (value: T) => U): T;

		// 202405: Pas paa med denne i drift, den er meget ny for safari.
		// NB: bigint og andre typer kan ogsaa bruges som T, selvom vores typing
		// heri ikke viser det.
		groupBy(selector: (value: T) => string | number | null | undefined |
			boolean): { [key: string | number]: T };

		mapNotNull<U>(callbackfn: (value: T, index: number, array: T[]) => U | null | undefined, thisArg?: any): U[];
	}

	type NodeListOf_Custom<TNode extends Node> = {
		[k in keyof typeof ArrayMethodsToBorrow_KeysAsValue]: TNode[][k];
	}

	interface NodeListOf<TNode extends Node> extends NodeList, NodeListOf_Custom<TNode> {
		[Symbol.iterator](): Iterator<TNode>;
		jQueryPartial(): Pick<JQuery, 'addClass' | 'removeClass' | 'toggleClass' | 'remove' | 'css'>;

	}

	type HTMLCollection_Custom = {
		[k in keyof typeof ArrayMethodsToBorrow_KeysAsValue]: HTMLElement[][k];
	}

	interface HTMLCollection extends HTMLCollection_Custom {
		[Symbol.iterator](): Iterator<Element>;
	}

	interface HTMLElementX<TTag extends string> extends HTMLElement {
		'-tag': TTag;
	}
}

(globalThis.Element.prototype as any).jQueryPartial = function () { return jQuery(this); };
(globalThis.NodeList.prototype as any).jQueryPartial = function () { return jQuery(this); };

(Array.prototype as any).mapNotNull = function nn<T, U>(
	this: Iterable<T>,
	callbackfn: (value: T, index: number, array: Iterable<T>) => U | null | undefined, thisArg?: any): U[] {
	const rv: U[] = [];
	let idx = -1;
	for (const item of this) {
		idx++;
		const val = callbackfn(item, idx, this);
		if (val === null || val === undefined)
			continue;
		rv.push(val);
	}
	return rv;
};

(Array.prototype as any).groupBy = function nn<T, U>(
	this: Iterable<T>,
	selector: (value: T) => U): { [key: string | number]: T } {
	return (Object as any).groupBy(this, selector);
};

const singlex = function <T>(
	collection: Iterable<T>,
	pred?: (value: T) => boolean
): [true, T] | [false, undefined] {
	let rv: [true, T] | [false, undefined] = [false, undefined];

	for (const item of collection) {
		const matches = !pred || pred(item);
		if (!matches)
			continue;
		if (rv[0])
			throw new Error(pred
				? 'More than one value matches the predicate.'
				: 'The collection contains more than one element.');
		rv = [true, item];
	}
	return rv;
};

(Array.prototype as any).single = function nn<T>(
	this: Iterable<T>,
	pred?: (value: T) => boolean
): T {
	const [found, item] = singlex(this, pred);
	if (!found)
		throw new Error(!pred
			? 'The collection contains no elements.'
			: 'No elements in the collection matches the predicate.');
	return item;
};

(Array.prototype as any).singleOrDefault = function nn<T>(
	this: Iterable<T>,
	pred?: (value: T) => boolean
): T | undefined {
	const [, item] = singlex(this, pred);
	return item;
};

const firstex = function <T>(
	collection: Iterable<T>,
	pred?: (value: T) => boolean
): [true, T] | [false, undefined] {
	let rv: [true, T] | [false, undefined] = [false, undefined];

	for (const item of collection) {
		const matches = !pred || pred(item);
		if (!matches)
			continue;
		rv = [true, item];
		break;
	}
	return rv;
};



(Array.prototype as any).first = function nn<T>(
	this: Iterable<T>,
	pred?: (value: T) => boolean
): T {
	const [found, item] = firstex(this, pred);
	if (!found)
		throw new Error(!pred
			? 'The collection contains no elements.'
			: 'No elements in the collection matches the predicate.');
	return item;
};

(Array.prototype as any).firstOrDefault = function nn<T>(
	this: Iterable<T>,
	pred?: (value: T) => boolean
): T | undefined {
	const [, item] = firstex(this, pred);
	return item;
};

(Array.prototype as any).last = function nn<T>(
	this: Array<T>,
	pred?: (value: T) => boolean
): T {
	if (!pred) {
		if (this.length == 0)
			throw new Error('The collection contains no elements.');
		return this[this.length - 1];
	}
	throw new Error('not implemented');
};


(NodeList.prototype as any).sum =
	(Array.prototype as any).sum =
	function nn<T>(
		this: Iterable<T>,
		selector: (value: T) => number
	): number {
		LectioJSUtils.AssertNotNullOrUndefined(selector, 'selector');
		let acc = 0;
		for (const item of this)
			acc += selector(item);

		return acc;
	};


for (const fn of toCopy_Array_nodelist) {
	if (!(fn in NodeList))
		(NodeList.prototype as any)[fn] = (Array.prototype as any)[fn];
}
for (const fn of toCopy_Array_htmlcollection) {
	if (!(fn in HTMLCollection))
		(HTMLCollection.prototype as any)[fn] = (Array.prototype as any)[fn];
}

export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export namespace LectioJSUtils {

	//Midlertidigt pga release issues
	export function GetCookieDomain(domain: string): string | null {
		return LectioCookie.GetCookieDomain(domain);
	}

	export function IsMobile(): boolean {
		return IsMobilePortrait() || IsMobileLandscape();
	}

	export function IsMobilePortrait(): boolean {
		return getComputedStyle(document.documentElement)
			.getPropertyValue('--LectioJSUtils_Mobil') === 'Portrait';
	}
	export function IsMobileLandscape(): boolean {
		return getComputedStyle(document.documentElement)
			.getPropertyValue('--LectioJSUtils_Mobil') === 'Landscape';
	}

	export function AssertNotNullOrUndefined<T>(value: any, message: string): asserts value is NonNullable<T> {
		if (value === null)
			throw new Error("value er null: " + message);
		if (value === undefined)
			throw new Error("value er undefined: " + message);
	}

	export function AssertNotNullOrEmpty(value: string | null | undefined, message: string): asserts value is string {
		function fmt(msg1: string): string {
			if (!message)
				return msg1;
			return msg1 + " (" + message + ")";
		}
		if (typeof (value) === "object") {
			if (value === null)
				throw new Error(fmt("value er null."));
		}
		else if (typeof (value) === "undefined")
			throw new Error(fmt("value er undefined."));
		else if (typeof (value) === "string") {
			if (value === "")
				throw message ? message : "Ugyldigt argument.";
		}
		else
			throw new Error(fmt("'condition' er ikke string."));
	}

	export function False(): boolean { return false; }

	export function Throw(msg: string): never {
		throw new Error(msg);
	}

	export function AssertArgument(condition: boolean, message?: string): asserts condition {
		if (typeof (condition) !== "boolean") {
			throw new Error("'condition' er ikke boolsk.");
		}
		if (!condition) {
			throw message ? message : "Ugyldigt argument.";
		}
	}

	export function AssertOneElement(val: JQuery) {
		if (!(val instanceof jQuery)) {
			throw new Error("'val' er ikke jquery.");
		}
		if (val.length === 1)
			return;
		if (val.length === 0)
			throw new Error("val indeholder ingen elementer.");
		else
			throw new Error("val indeholder flere end eet element.");
	}

	export function StaticAssertContains<
		T extends string | number | null | undefined,
		T2 = T>(actual: T): void { }

	/**  Praktisk hvis man gerne vil have compileren til at tjekke at argumentet er sandt. */
	export function StaticAssertTrue(_yes: true): true { return true; }
	export function AssertNever(val: never, switchedValue: any): never {
		throw new Error('Uventet: ' + switchedValue);
	}

	export interface LogSource {
		Write: typeof LogWrite;
		Debug: typeof LogDebug;
		Error: typeof LogError;
		Warn: typeof LogWarn;
	}

	export function CreateLogSource(enabled?: boolean): LogSource {
		enabled ??= true;
		if (!enabled) {
			return {
				Write: () => { },
				Debug: () => { },
				Error: () => { },
				Warn: () => { },
			};
		}

		return {
			Write: (message, args) => LogWrite(message, args),
			Debug: (message, args) => LogDebug(message, args),
			Error: (message, args) => LogError(message, args),
			Warn: (message, args) => LogWarn(message, args),
		};
	}

	let logWriteCount: number | undefined;
	let logAddInfo: boolean | undefined;


	function writex(log: typeof console['log'], message: any, args: any[]): void {
		// 202408 RH: Lader til at browsertests sommetider faar logposter i en
		// anden raekkefoelge end de blev skrevet. Derfor giver vi et
		// logpostloebenummer med her, saa man sammen med pageloadid kan se den
		// raekkefoelge posterne blev skrevet i.
		const mkinfo = () => {
			logWriteCount ??= 0;
			return { pli: GetCurrentPageLoadID(), lidx: ++logWriteCount };
		}
		logAddInfo ??= LectioBrowserTestMode();
		if (logAddInfo && typeof logWriteCount === 'undefined') {
			let display = location.pathname;
			const cap = GetBaseSchoolURL();
			if (display.startsWith(cap))
				display = display.slice(cap.length);
			log.apply(console, ['Side', display, '⇅', JSON.stringify(mkinfo())]);
		}
		if (logAddInfo)
			log.apply(console, [message, ...args, '⇅', JSON.stringify(mkinfo())]);
		else
			log.apply(console, [message, ...args]);
	}

	export function LogWarn(message: string, ...args: any[]) {
		writex(console.warn, message, args);
	}

	export function LogWrite(message: string, ...args: any[]) {
		writex(console.log, message, args);
	}

	export function LogDebug(message: string, ...args: any[]) {
		writex(console.debug, message, args);
	}

	export function LogError(message: string, ...args: any[]) {
		writex(console.error, message, args);
	}

	function LectioBrowserTestMode() {
		return localStorage['LectioBrowserTestMode'] === 'true';
	}

	export function GetNotNullValue<T>(val: T | null | undefined, name?: string): T {
		if (val == null)
			throw new Error('oev, er null' + (name ? ': ' + name : ''));
		return val;
	}

	export function AssertType<TSource, TTarget extends TSource>(
		v: TSource,
		ex: { new(): TTarget }
	): asserts v is TTarget {
		if (v === null || v === undefined) {
			throw new Error('Value is null or undefined. Expected: ' + ex);
		}
		if (!(v instanceof ex)) {
			throw new Error('Value does not have the expected type. Expected: ' + ex);
		}
	}

	export function GetAssertedType<TSource, TTarget extends TSource>(
		v: TSource,
		type: { new(): TTarget },
		typehint?: string
	): TTarget {
		if (v instanceof type) {
			return v;
		}
		const thx = typehint ?? type.name;
		if (v === undefined || v === null)
			throw new Error('Value does not have the expected type. Expected: ' + thx + ", actual: " + v);
		throw new Error('Value does not have the expected type. Expected: ' + thx + ", actual: null/undefind");
	}

	/**
	 * Nogle gange kan man daarligt lave instanceof-tjek, fx hvis vaerdiens
	 * constructor tilhoerer en andet vindue/iframe.
	 */
	export function GetAssumedType<T>(v: any): T {
		return v;
	}

	/**
	 * Ideen med navnet "narrow" er at det fremgaar af kaldet at ideel ville den
	 * kun kopiere de properties der er
	 * erklaeret paa type T2, og ikke alle properties der maatte findes runtime
	 * paa v2.
	 */
	export function ExtendNarrow<T1, T2>(v1: T1, v2: T2): T1 & T2 {
		return $.extend(v1, v2);
	}

	export function AssertArgumentPresent(argument: any, message: string) {
		if (argument === undefined) {
			throw message ? message : "Ugyldigt argument.";
		}
	}

	export function GetOuterHtml(domElement: Element): string {
		if ('XMLSerializer' in window) {
			const str = new (window as any).XMLSerializer().serializeToString(domElement);
			return str as string;
		} else {
			return domElement.outerHTML;
		}
	}

	export function IsEnumValue(enumx: { [p: string]: any }, val: string): boolean {
		for (const k in enumx) {
			if (Object.prototype.hasOwnProperty.call(enumx, k)) {
				if (enumx[k] === val)
					return true;
			}
		}
		return false;
	}

	export function AssertEnumValue(enumx: object, val: string) {
		if (!IsEnumValue(enumx, val))
			throw new Error('Vaerdien ' + val + ' findes ikke i enum-en.');
	}

	export function HasBeenHere(e: Element, whoTag: string): boolean {
		const obj = (e as any).hasBeenHere ??= {};
		if (whoTag in obj)
			return true;
		obj[whoTag] = 42;
		return false;
	}

	export function TimeFunctionCall(f: () => void): { ms: number, count: number } {
		const beforeAll = window.performance.now();
		let doIndividualMeasures = true;
		const hist: number[] = [];
		let counter = 0;
		for (; counter < 10; counter++) {
			if (!doIndividualMeasures) {
				f();
				continue;
			}

			const before = window.performance.now();
			f();
			const after = window.performance.now();
			const ms = after - before;
			hist.push(ms);

			// Praecisitionen er begraenset, saa hvis den tid det tager, er
			// mindre end noget i retning af 1ms, faar vi bare en masse
			// nuller og sommetider 1-er.
			// Naar vi ser det ske, skifter vi til at koere returnere
			// gennemsnitlig tid for et antal koersler.
			if (ms < 2)
				doIndividualMeasures = false;

			// Hvis det tager laengere tid end man maaske gider at vente.
			if (counter === 0 && ms > 10)
				return { ms: ms, count: counter };
		}

		if (!doIndividualMeasures) {
			const afterAll = window.performance.now();
			const avg = (afterAll - beforeAll) / counter;
			return { ms: avg, count: counter };
		}
		else {
			// bla bla gennemsnit bla bla.
			return { ms: hist[hist.length - 1], count: counter };
		}
	}

	export function GetElementSelector(elementx: JQuery | HTMLElement): string {
		const element = elementx instanceof jQuery ? (elementx as JQuery).get(0) : elementx;
		if (!(element instanceof HTMLElement))
			throw new Error('elem');

		let selfTxt: string;
		if (element.nodeType === document.TEXT_NODE) {
			selfTxt = "#text";
		} else if (element.nodeType === document.ELEMENT_NODE) {
			const id = element.getAttribute('id');
			const lcomp = element.getAttribute('data-lcomp');
			const nodeName = element.nodeName.toLowerCase();
			let idx: number | null;
			if (element instanceof HTMLTableCellElement)
				idx = element.cellIndex;
			else if (element instanceof HTMLTableRowElement)
				idx = element.rowIndex;
			else idx = null;

			selfTxt = nodeName
				+ (id ? '#' + id : '')
				+ (lcomp ? '[data-lcomp]' : '')
				+ (idx ? '[' + idx + ']' : '')
				+ '';
		} else {
			throw new Error();
		}
		return element.parentNode !== null && element.parentNode.nodeType !== document.DOCUMENT_NODE
			? GetElementSelector(element.parentElement!) + " > " + selfTxt
			: selfTxt;
	}

	export function GetUserControlPath(element: HTMLElement): string[] {
		function searchPrevisousSiblings(e: HTMLElement): string | null {
			let cur: Node = e;
			while (true) {
				const prev = cur.previousSibling;
				if (!prev)
					return null;
				if (prev instanceof Comment && prev.nodeValue) {
					const arr = prev.nodeValue.match(/Lectiouserctrl:\s?([\w$]+)\b/i);
					if (arr) {
						const controlType = arr[1];
						return controlType;
					}
				}
				cur = prev;
			}
		}

		let cur: HTMLElement | null = element;
		const path: string[] = [];
		while (cur) {
			const controlType = searchPrevisousSiblings(cur);
			if (controlType)
				path.push(controlType);

			cur = cur.parentElement;
		}
		return path;
	}

	export function ClientSettingSupported(): boolean {
		return !!window.localStorage;
	}

	export function ClientSettingRead(name: string): string | null {
		return window.localStorage.getItem(name);
	}

	export function ClientSettingWrite(name: string, value: string) {
		window.localStorage.setItem(name, value);
	}

	export function FreezeObject(o: {}) {
		if ("freeze" in Object) {
			Object.freeze(o);
		}
	}

	export function TooltipHtmlToHtml(t: string): string {
		return t.split(/\r?\n/g).join('<br />');
	}

	export function GetStackTrace(): string {
		let stack: string;
		try {
			(null as any).toString();
			throw new Error('GetStackTrace: skulle smide en exception.');
		} catch (e: any) {
			try {
				stack = e.stack;
			} catch (e2) {
				stack = "Kunne ikke få stack: " + e2;
			}
		}
		/*
		 * TypeError: Cannot read properties of null (reading 'toString')
		 * 	at Object.GetStackTrace (https://wpc-rasmus.macom.dk/lectio/content/lectio.bundle.js?DummyID=ahdCLBun_tP_TaU3biCOeg2:9431:18)
		 * 	at Object.RegisterCommand (https://wpc-rasmus.macom.dk/lectio/content/lectio.bundle.js?DummyID=ahdCLBun_tP_TaU3biCOeg2:3064:77)
		 * 	at RegisterBasicCommands (https://wpc-rasmus.macom.dk/lectio/content/lectio.bundle.js?DummyID=ahdCLBun_tP_TaU3biCOeg2:9871:47)
		 * 	at https://wpc-rasmus.macom.dk/lectio/content/lectio.bundle.js?DummyID=ahdCLBun_tP_TaU3biCOeg2:9894:5
		 * 	at ./Scripts/v2/LectioPageCommands.ts (https://wpc-rasmus.macom.dk/lectio/content/lectio.bundle.js?DummyID=ahdCLBun_tP_TaU3biCOeg2:9895:3)
		 * 	at __webpack_require__ (https://wpc-rasmus.macom.dk/lectio/content/runtime.bundle.js?DummyID=o8c2l4CYEMdDZ37k0AGtgA2:23:42)
		 * 	at ./Scripts/v2/lectiolib.ts (https://wpc-rasmus.macom.dk/lectio/content/lectio.bundle.js?DummyID=ahdCLBun_tP_TaU3biCOeg2:15384:14)
		 * 	at __webpack_require__ (https://wpc-rasmus.macom.dk/lectio/content/runtime.bundle.js?DummyID=o8c2l4CYEMdDZ37k0AGtgA2:23:42)
		 * 	at __webpack_exec__ (https://wpc-rasmus.macom.dk/lectio/content/lectio.bundle.js?DummyID=ahdCLBun_tP_TaU3biCOeg2:15569:48)
		 * 	at https://wpc-rasmus.macom.dk/lectio/content/lectio.bundle.js?DummyID=ahdCLBun_tP_TaU3biCOeg2:15570:54
		 */


		return stack.replace(/^.+\n.* Object.GetStackTrace.+\n/, '');
	}

	export function PostCurrentPageApi(
		method: string,
		qsValues: { [n: string]: any },
		bodyValues?: { [n: string]: any }
	): Promise<Response> {
		const apiPath = location.pathname.replace(/\.aspx$/, '.api').replace(/\/lectio\/\d+/, '');
		return PostApiImpl(apiPath, method, qsValues, bodyValues);
	}

	export function PostApi(
		apiPath: string,
		method: string,
		qsValues: { [n: string]: any },
		bodyValues?: { [n: string]: any }
	): Promise<Response> {
		AssertNotNullOrEmpty(apiPath, "apiPath");
		return PostApiImpl(apiPath, method, qsValues, bodyValues);
	}

	export function GetApiPathAndQuerystring(
		apiPath: string,
		method: string,
		values: { [n: string]: any }
	): string {
		AssertNotNullOrEmpty(apiPath, "apiPath");
		AssertNotNullOrEmpty(method, "method");

		let qs = '';
		for (const key in values)
			if (Object.prototype.hasOwnProperty.call(values, key))
				qs += (qs ? '&' : '') + key + "=" + encodeURIComponent(values[key]);
		return GetBaseSchoolURL() + apiPath + '/' + method + (qs ? '?' + qs : '');
	}

	async function PostApiImpl(apiPath: string,
		method: string,
		qsValues: { [n: string]: any },
		bodyValues?: { [n: string]: any }
	): Promise<Response> {
		AssertNotNullOrEmpty(apiPath, "apiPath");
		AssertNotNullOrEmpty(method, "method");

		const promise = fetch(GetApiPathAndQuerystring(apiPath, method, qsValues), {
			method: 'POST', // *GET, POST, PUT, DELETE, etc.
			// mode: 'cors', // no-cors, *cors, same-origin
			// cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
			credentials: 'same-origin', // include, *same-origin, omit
			headers: {
				'Content-Type': 'application/json'
				// 'Content-Type': 'application/x-www-form-urlencoded',
			},
			// redirect: 'follow', // manual, *follow, error
			// referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
			body: JSON.stringify(bodyValues) // body data type must match "Content-Type" header
		});
		const response = await promise;
		if (response.status >= 500 && response.status < 600) {
			let msg: string | null = null;
			if (response.headers.get('content-type')?.startsWith('application/json')) {
				const obj = await response.json(); // burde maaske haandtere exception hvis det ikke kan parses som json.
				if ('ExceptionMessage' in obj) {
					msg = obj['ExceptionMessage'];
				}
				else {
					msg = null;
				}
			} else {
				msg = null;
			}
			throw new Error('fetch call returned http error.' + (msg ? ' exception: ' + msg : ''));
		}
		return response;
	}

	export function CreateDeferred<T = undefined>(): LectioDeferred<T> {
		// indbygget promise viser i det mindste fejl i konsollen, i modsaetning
		// til $.deferred.
		let res: ((v: T | PromiseLike<T>) => void) | undefined;
		let rej: ((v: any) => void) | undefined;
		const p = new Promise<T>((resx, rejx) => { res = resx; rej = rejx; });
		let isSettled = false;
		return {
			promise: () => p,
			resolve: v => {
				isSettled = true;
				return res!(v);
			},
			reject: val => {
				isSettled = true;
				return rej!(val);
			},
			isSettled: () => isSettled,
		};
	}

	export function GetCtrlKeyOSSpecific(): "m" | "c" {
		if (navigator.userAgent.includes("Mac")) {
			return 'm';
		}
		return 'c';
	}

	export function GetEventModifiers(evt: EventMods): string {
		return [
			evt.altKey ? 'a' : '',
			evt.ctrlKey ? 'c' : '',
			evt.metaKey ? 'm' : '',
			evt.shiftKey ? 's' : '',
		].join('');
	}

	export function ComputeDropEffect(evt: DragEvent): 'copy' | 'move' | 'none' {
		switch (GetEventModifiers(evt)) {
		case '':
			return 'move';
		case GetCtrlKeyOSSpecific():
			return 'copy';
		default:
			return 'none';
		}
	}

	export function GetJQueryReadyPromise(): Promise<void> {
		return new Promise<void>(resolve => $(resolve));
	}

	export function GetNextEventPromise(type: string): Promise<Event> {
		AssertNotNullOrEmpty(type, 'type');

		const def = CreateDeferred<Event>();
		$(document).one(type, evt => def.resolve((evt as any).originalEvent));
		return def.promise();
	}

	export function NewSkipUntil() {
		let hasOccurred = false;
		return (isOccurring: boolean) => {
			if (!hasOccurred && isOccurring)
				hasOccurred = true;
			return hasOccurred;
		};
	}

	export function NewSkip(skipCount: number): () => boolean {
		LectioJSUtils.AssertArgument(skipCount >= 0 && skipCount < 1024 * 1024, "int range");
		let counter = 0;
		return () => {
			counter++;
			return counter > skipCount;
		};
	}

	/** Returns e.g. /lectio/38 */
	export function GetBaseSchoolURL(): string {
		const path = window.location.pathname;

		const match = path.match(/^\/lectio\/\d+/);
		if (!match)
			return '/lectio';
		return match[0];
	}

	export function GetBaseUrl_SpecialCase(): string {
		const baseschoolurl = GetBaseSchoolURL();
		const path = window.location.href;
		const idx = path.indexOf(baseschoolurl);

		return path.substring(0, idx + 1) + "lectio/";
	}

	export function GetLectioMainTitle(): string | null {
		const t = $('.maintitle').text();
		if (!t) {
			return null;
		}
		return t;
	}

	export function HtmlEncode(tekstTilEnkodning: string | null): string {
		if (!tekstTilEnkodning)
			return "";

		return $('<div/>').text(tekstTilEnkodning).html();
	}

	export function GetShortcutTooltipSystemDependent(shortcutKey: string): string {
		const uAgent = (navigator.userAgent).toUpperCase();
		if (uAgent.indexOf("MACINTOSH") !== -1 || uAgent.indexOf("MAC OS") !== -1) {
			return "Cmd+" + shortcutKey;
		}

		return "Ctrl+" + shortcutKey;
	}

	export function ReturnPreventDefault(evt: Event): void {
		if (!evt) {
			throw new Error("Mangler event");
		}
		if (evt.preventDefault) {
			evt.preventDefault();
		} else {
			evt.returnValue = false;
		}
	}

	export function SwapVisibility(ctrl2EnableId: string, ctrl2disableId: string): void {
		document.getElementById(ctrl2disableId)!.style.display = 'none';
		document.getElementById(ctrl2EnableId)!.style.display = 'block';
	}

	export function dropdown_redirect_aurl_on_change(sel: HTMLSelectElement): void {
		if (!sel) {
			return;
		}
		const url = sel.options[sel.selectedIndex].getAttribute('url');
		if (url === null || url.length === 0) {
			return;
		}
		window.location.href = url;
	}

	export function FormDefaultButtonActivated(): void {
		$(document.body).trigger('FormDefaultButtonActivated');
	}

	export function logininfo(detail: boolean, count: number): void {
		const d = document.getElementById('logininfodetail');
		const s = document.getElementById('logininfoshort');
		if (!d)
			throw new Error('d');
		if (!s)
			throw new Error('s');
		if (detail) {
			if (window.loginfotimeout) {
				window.clearTimeout(window.loginfotimeout!);
				window.loginfotimeout = null;
			}
			d.style.display = 'block';
			s.style.display = 'none';
		} else {
			if (typeof (count) === 'undefined') {
				d.style.display = 'none';
				s.style.display = 'block';
				count = 50;
			}
			if (count > 0) {
				document.getElementById('logininfoshortprogress')!.style.width = (100 * count / 50) + '%';
				window.loginfotimeout = window.setTimeout('LectioJSUtils.logininfo(false,' + (count - 1) + ');', 200);
			} else {
				d.style.display = 'none';
				s.style.display = 'none';
			}
		}
	}

	// eventnavn skal være uden "on".
	export function AddEventListener(element: HTMLElement, eventName: string, func: (...args: any[]) => any): void {
		element.addEventListener(eventName, func, false);
	}

	// eventnavn skal være uden "on".
	export function RemoveEventListener(element: HTMLElement, eventName: string, func: (...args: any[]) => any): void {
		element.removeEventListener(eventName, func, false);
	}

	export function CopyStringToClipboard(text: string, isHtml?: boolean): void {

		// KV: This is the new standard way of copying to clipboard, but not yet
		// support by all. Fallback to old ways below.
		if (navigator.clipboard && navigator.clipboard.writeText) {
			if (isHtml) {
				const type = "text/html";
				const blob = new Blob([text], { type });
				const data = [new ClipboardItem({ [type]: blob })];
				navigator.clipboard.write(data)
					.then(
						() => { },
						() => {
							alert('Fejlede - CopyStringToClipboard:1');
						});
				return;
			}
			else {
				navigator.clipboard.writeText(text)
					.then(
						() => { },
						(err) => {
							alert('Fejlede - CopyStringToClipboard:2');
						});
				return;
			}
		}

		throw new Error('Kan ikke kopiere oplysninger til udklipsholder.');
	}

	export type NotyParams = {
		type: 'information',
		text: string,
		layout: string,
		timeout: number,
	};

	export function ShowInformation(text: string, title?: string): void {
		const noty: (p: NotyParams) => void = (window as any).noty;
		const textEffective = title
			? title + '\r\n\r\n' + text
			: text;
		noty({
			type: 'information', text: textEffective,
			layout: 'topRight', timeout: 5000
		});
	}

	let pageloadid: string | undefined;
	export function GetCurrentPageLoadID(): string {
		if (!pageloadid) {
			function encode(num: number, nchar: number): string {
				AssertArgument(!isNaN(num) && isFinite(num) && num === Math.floor(num));
				const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
				AssertArgument(alphabet.length === 32);
				let str = '';
				for (let i = 0; i < nchar; i++) {
					str += alphabet[num % 32];
					num = num >>> 5;
				}
				LectioJSUtils.AssertArgument(str.length === 5);
				return str;
			}

			pageloadid = encode(Math.ceil(Math.random() * 100000000), 5);
		}
		return pageloadid;
	}

	export function DispatchBrowserTestEvent(eventType: string, detail?: unknown): void {
		const event = new CustomEvent(eventType, { detail: detail });
		window.dispatchEvent(event);
	}

	export function DispatchBrowserTestEventForElement(target: EventTarget, eventType: string, detail?: unknown): void {
		const event = new CustomEvent(eventType, { detail: detail, bubbles: true });
		target.dispatchEvent(event);
	}

	export function Delay(ms: number): Promise<void> {
		const d = LectioJSUtils.CreateDeferred<void>();
		setTimeout(() => d.resolve(), ms);
		return d.promise();
	}

	/** Resolves via `setTimeout(.., 0)`. */
	export function Yield(): Promise<void> {
		const d = LectioJSUtils.CreateDeferred<void>();
		setTimeout(() => d.resolve());
		return d.promise();
	}
}

export function GetKeys<T extends {}>(obj: T): (keyof T)[] {
	return Object.keys(obj) as (keyof T)[];
}

export const enum LectioKeyCode {
	SPACE = 32,
	PAGE_UP = 33,
	UP = 38,
	PAGE_DOWN = 34,
	DOWN = 40,
	LEFT = 37,
	RIGHT = 39,
	ENTER = 13,
	TAB = 9,
	BACKSPACE = 8,
	ESCAPE = 27,
}

/**
 * Pas lidt paa med denne, og brug den kun (?) til nye objekter, som endnu ikke
 * er delt med andre.
 */
export type ReadWrite<T> = {
	-readonly [P in keyof T]: T[P];
};
