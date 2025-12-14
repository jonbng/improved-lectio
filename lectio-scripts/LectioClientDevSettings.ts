
import { CommandRegistry } from "./CommandRegistry";
import { LectioJSUtils } from "./LectioJSUtils";

export declare namespace LectioClientDevSettings {
	function RegisterSetting(area: string, name: string, datatype: 'boolean', defaultValue: boolean): ClientSetting<boolean>;
	function RegisterSetting(area: string, name: string, datatype: 'string', defaultValue: string): ClientSetting<string>;
}

export interface ClientSetting<TValue> {
}

export type SettingValueDataType = 'boolean' | 'string';
export const settingDefinitions: { [name: string]: { datatype: SettingValueDataType, defaultValue: any } | undefined } = {};

export class Reg implements ClientSetting<undefined> {
	constructor(name: string) {
		this.name = name;
	}
	readonly name: string;
}

export namespace LectioClientDevSettings {

	export function RegisterSettingImpl(
		area: string, name: string,
		datatype: SettingValueDataType, defaultValue: any
	) {
		LectioJSUtils.AssertNotNullOrEmpty(area, 'name');
		LectioJSUtils.AssertNotNullOrEmpty(name, 'name');
		const combined = 'dev-' + area + '.' + name;
		if (settingDefinitions[combined])
			throw new Error('allerede defineret: ' + combined);

		settingDefinitions[combined] = { datatype: datatype, defaultValue: defaultValue };

		return new Reg(combined);
	}

	export function GetSettingValue<TValue>(setting: ClientSetting<TValue>): TValue {
		LectioJSUtils.AssertNotNullOrUndefined(setting, 'setting');
		if (!(setting instanceof Reg))
			throw new Error('er ikke Reg');
		const def = settingDefinitions[setting.name];
		if (!def)
			throw new Error('Ikke registreret?');

		const val = GetSettingValueCore<TValue>(setting.name, def.datatype);
		if (val === undefined)
			return def.defaultValue;
		return val;
	}

	function GetSettingValueCore<TValue>(
		key: string, datatype: SettingValueDataType
	): TValue | undefined {
		let storedVal: Storage;
		try {
			storedVal = window.localStorage[key];
		}
		catch {
			// 202304: Kan faa exception ved tilgang til localStorage,
			// afhaengigt af browserindstillinger i det mindste i chrome. stm
			// 43272 og
			// https://www.chromium.org/for-testers/bug-reporting-guidelines/uncaught-securityerror-failed-to-read-the-localstorage-property-from-window-access-is-denied-for-this-document/
			return undefined;
		}

		if (storedVal === undefined)
			return undefined;
		if (!(typeof storedVal === 'string'))
			throw new Error('Vaerdi er ikke string?');

		switch (datatype) {
		case 'boolean':
			if (storedVal === 'true')
				return true as any as TValue;
			if (storedVal === 'false')
				return false as any as TValue;
			throw new Error('ikke bool string: ' + storedVal);
		case 'string':
			return storedVal as any as TValue;
		default: {
			const n: never = datatype;
			throw new Error('uhaandteret datatype: ' + datatype);
		}
		}
	}

	export function GetCurrentSettings_Array() {
		return Object.keys(settingDefinitions).map(key => {
			const def = settingDefinitions[key]!;
			const storedValue = GetSettingValueCore<any>(key, def.defaultValue);

			return {
				key: key,
				effectiveValue: storedValue !== undefined ? storedValue : def.defaultValue
			};
		});
	}

	export function GetCurrentSettings_Object(): { [setting: string]: string | boolean; } {
		const rv: { [setting: string]: string | boolean; } = {};
		for (const key in settingDefinitions) {
			const def = settingDefinitions[key]!;
			const storedValue = GetSettingValueCore<any>(key, def.defaultValue);

			rv[key] = storedValue !== undefined ? storedValue : def.defaultValue;
		}
		return rv;
	}

	export function ClearSettings() {
		for (const key in settingDefinitions)
			window.sessionStorage.removeItem(key);
	}

	export function SetSettingValue<TValue>(setting: ClientSetting<TValue>, value: TValue): void {
		LectioJSUtils.AssertNotNullOrUndefined(setting, 'setting');
		if (!(setting instanceof Reg))
			throw new Error('er ikke Reg');

		SetSettingValueCore(setting.name, value);
	}

	export function SetSettingValueCore(key: string, value: any) {
		const def = settingDefinitions[key];
		if (!def)
			throw new Error('Ikke registreret?');

		let serialized: string | null = null;
		switch (def.datatype) {
		case 'boolean':
			if (!(typeof (value) === 'boolean'))
				throw new Error('er ikke boolean.');
			serialized = value ? 'true' : 'false';
			break;
		case 'string':
			if (!(typeof (value) === 'string'))
				throw new Error('er ikke string.');
			serialized = value;
			break;
		default: {
			const n: never = def.datatype;
			throw new Error('uhaandteret datatype: ' + def.defaultValue);
		}
		}

		if (!(typeof (serialized) === 'string')) {
			const n: never = serialized;
			throw new Error('er ikke string.');
		}

		window.sessionStorage[key] = serialized;
	}
}

namespace LectioAppearance {
	$(() => {
		const setting_EnableDarkTheme = LectioClientDevSettings
			.RegisterSetting('Appearance', 'EnableDarkTheme', 'boolean', false);

		const dark = LectioClientDevSettings.GetSettingValue(setting_EnableDarkTheme);
		if (dark)
			document.body.setAttribute('data-theme', 'dark');

		CommandRegistry.RegisterCommand({
			id: 'appearance.toggleDarkTheme', title: 'Toggle mørkt skin', execute: () => {
				const wasEnabled = LectioClientDevSettings.GetSettingValue(setting_EnableDarkTheme);
				document.body.setAttribute('data-theme', wasEnabled ? '' : 'dark');
				LectioClientDevSettings.SetSettingValue(setting_EnableDarkTheme, !wasEnabled);
			}
		});
	});
}

(LectioClientDevSettings as any).RegisterSetting = LectioClientDevSettings.RegisterSettingImpl;
