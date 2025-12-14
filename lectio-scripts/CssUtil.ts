import { LectioJSUtils } from "./LectioJSUtils";

export interface LectioCSSRuleStyle extends CSSStyleRule {
	cssText: string;
}
export interface LectioCSSRule extends CSSRule {
	selectorText: string;
	style: LectioCSSRuleStyle;
}

export namespace CssUtil {
	let stylesheet: CSSStyleSheet | null = null;
	function GetDynamicStylesheet(): CSSStyleSheet {
		if (stylesheet == null) {
			stylesheet = CreateDynamicStylesheet('lectio');
		}

		return stylesheet;
	}

	export function CreateDynamicStylesheet(id: string): CSSStyleSheet {
		const se = document.createElement('style');
		se.setAttribute('id', 'dyncss_' + id);
		document.head.appendChild(se);

		let ss: CSSStyleSheet | null = null;
		for (let i = 0; i < document.styleSheets.length; i++) {
			const ssCand = <CSSStyleSheet>document.styleSheets[i];
			if (ssCand.ownerNode === se) {
				ss = ssCand;
			}
		}
		return LectioJSUtils.GetNotNullValue(ss, "ss");
	}

	export function GetCssRules(): LectioCSSRule[] {
		LectioJSUtils.AssertNotNullOrUndefined(document.styleSheets, "document.styleSheets");

		const styleSheet = GetDynamicStylesheet();
		const rules = styleSheet.rules || styleSheet.cssRules;
		const rv: LectioCSSRule[] = [];
		for (let i = 0; i < rules.length; i++) {
			const cssRule = <LectioCSSRule>rules.item(i);
			rv.push(cssRule);
		}

		return rv;
	}

	export function DeleteDynamicCssRule(selector: string): void {
		LectioJSUtils.AssertNotNullOrUndefined(document.styleSheets, "document.styleSheets");
		selector = selector.toLowerCase();

		const styleSheet = GetDynamicStylesheet();
		const rules = styleSheet.rules || styleSheet.cssRules;
		for (let i = 0; i < rules.length; i++) {
			const cssRule = <LectioCSSRule>rules.item(i);
			if (cssRule.selectorText.toLowerCase() === selector) {
				styleSheet.deleteRule(i);
				return;
			}
		}
	}

	function getCssRule(selector: string): LectioCSSRule | null {
		LectioJSUtils.AssertNotNullOrUndefined(document.styleSheets, "document.styleSheets");
		selector = selector.toLowerCase();

		const styleSheet = GetDynamicStylesheet();
		const rules = styleSheet.rules || styleSheet.cssRules;
		for (let i = 0; i < rules.length; i++) {
			const cssRule = <LectioCSSRule>rules.item(i);
			if (cssRule.selectorText.toLowerCase() !== selector)
				continue;
			return cssRule;
		}

		return null;
	}

	export function CreateOrUpdateCssRule(selector: string, cssText: string): void {
		let rule = getCssRule(selector);
		if (!rule)
			rule = createCssRule(selector);
		rule.style.cssText = cssText;
	}

	function createCssRule(selector: string): LectioCSSRule {
		LectioJSUtils.AssertNotNullOrUndefined(document.styleSheets, "document.styleSheets");
		const existingRule = getCssRule(selector);
		if (existingRule !== null)
			throw new Error('Rule ' + selector + 'already exists.');

		const styleSheet = GetDynamicStylesheet();
		if (styleSheet.addRule) {
			styleSheet.addRule(selector, undefined);
		} else {
			// mozilla
			const rulesTmp = styleSheet.rules || styleSheet.cssRules;
			styleSheet.insertRule(selector + ' { }', rulesTmp.length);
		}
		const rules = styleSheet.rules || styleSheet.cssRules;
		const rule = <LectioCSSRule>rules[rules.length - 1];
		return rule;
	}
}