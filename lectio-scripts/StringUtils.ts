export class StringUtils {
	public static HashCode(s: string): number {
		const split = s.split("");
		const callbackfn = (a: number, b: string) => {
			a = ((a << 5) - a) + b.charCodeAt(0);
			return a & a;
		};
		return split.reduce<number>(callbackfn, 0);
	}
}
