/// <reference path="./CustomTypes/jquery.d.ts"/>
/// <reference path="./CustomTypes/array.d.ts"/>

export class LectioExtensions {
	public static Init(): void {
		ExtensionsJQuery.Init();
	}
}

class ExtensionsJQuery {
	public static Init(): void {
		$.fn.indexOf = (e: HTMLElement): number => {
			for (let i = 0; i < this.length; i++) {
				if ((this as any)[i] === e) {
					return i;
				}
			}
			return -1;
		};
	}
}
