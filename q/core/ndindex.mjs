function prod(a) {
	let prod = 1;
	for (let n of a) prod *= n;
	return prod;
}

export function* ndindex(shape, reuse = true) {
	let index = Array(shape.length).fill(0);
	let size = prod(shape);
	if (size == 0) return;

	yield reuse ? index : index.slice();
	for (let i = 1; i < size; i++) {
		for (let j = index.length - 1; j >= 0; j--) {
			index[j] += 1;
			if (index[j] < shape[j]) break;
			index[j] -= shape[j];
		}
		yield reuse ? index : index.slice();
	}
}
