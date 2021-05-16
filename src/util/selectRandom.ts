export default function selectRandom<T>(
	array: Array<T>,
	limit: number | null = null,
	random: () => number = Math.random
): T {
	if (limit === null || limit < 1) limit = array.length;

	limit = Math.min(limit, array.length);
	const r = array[Math.floor(random() * limit)];
	return r;
}
