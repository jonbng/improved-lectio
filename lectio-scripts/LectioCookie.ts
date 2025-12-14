/// <reference types="jquery"/>

import * as Cookies from 'js-cookie';

export namespace LectioCookie {

	export function GetCookieDomain(domain: string) {
		const arr = domain.match(/[^\.]+\.[^\.]+$/);
		if (arr === null || arr === undefined) {
			return null;
		}
		if (arr.length !== 1) {
			throw "Bad match for domain '" + domain + "'.";
		}
		return arr[0];
	}

	export function deleteCookieGlobal(name: string): void {
		Cookies.default.remove(name, { secure: true, sameSite: 'Strict' });
	}

	export function setCookieGlobal(name: string, value: string): void {
		deleteCookieGlobal(name);
		Cookies.default.set(name, value, { path: '/', secure: true, sameSite: 'Strict'});
	}

	export function getCookie(name: string): string | undefined {
		return Cookies.default.get(name);
	}

	export function supportsCookies(): boolean {
		LectioCookie.setCookieGlobal('ct', '1');

		if (LectioCookie.getCookie('ct') == undefined) {
			return false;
		}

		LectioCookie.deleteCookieGlobal('ct');

		return true;
	}

	export function setCookieMobileSkema(name: string, dato: string) {
		deleteCookieGlobal(name);
		Cookies.default.set(name, dato, { path: '/', secure: true, sameSite: 'Strict', expires: 1/12});
	}
}

