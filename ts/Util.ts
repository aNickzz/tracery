/**
 * Represents an object whos keys are all strings and whos values are all of type T
 */
export interface Collection<T> { [propName: string]: T }

/**
 * Creates an array of numbers starting from 0
 * @param length length
 */
export function range(length: number): Array<number> {
	return Array.call(null, Array(length)).map(Number.call, Number);
}

export function isVowel(c: string): boolean {
	var c2 = c.toLowerCase();
	return (c2 === 'a') || (c2 === 'e') || (c2 === 'i') || (c2 === 'o') || (c2 === 'u');
}

export function isAlphaNum(c: string): boolean {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
}

export function escapeRegExp(str: string): string {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

/**
 * Shuffles an array using the Fisher-Yates algorithm
 */
export function fyShuffle(array: Array<any>, rng: () => number = Math.random): Array<any> {
	var remaining = array.length;

	while (remaining > 0) {
		var pos = Math.floor(rng() * remaining),
			tmp = array[pos],
			end = remaining - 1;

		array[pos] = array[end];
		array[end] = tmp;

		--remaining;
	}

	return array;
}