/**
 * Creates an array of numbers starting from 0
 * @param length length
 */
export function range(length: number): Array<number> {
	return Array.call(null, Array(length)).map(Number.call, Number);
}