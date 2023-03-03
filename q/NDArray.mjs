import { tester } from './core/core.mjs';
import { slice, isscalar } from './core/core.mjs';
import { NDArray, array, shape, broadcast_to, copyto, ndindex, ndoffset } from './core/core.mjs';
import { ndim } from './core/numeric.mjs';

let runTest = true;

function is_int(value) {
	return Number.isInteger(value);
}

function prod(a) {
	let prod = 1;
	for (let n of a) prod *= n;
	return prod;
}

// for (let i of ndindex([3, 2, 1])) {
//     console.log(i);
// }
// console.log([...ndindex([3, 2, 1], false)]);

export function broadcast_shapes(...shapes) {
	let ndim = 0;
	for (let shape of shapes) ndim = Math.max(ndim, shape.length);
	if (ndim == 0) return [];

	let broadcasted = Array(ndim).fill(1);
	for (let shape of shapes) {
		for (let i = shape.length - 1, j = ndim - 1; i >= 0; i--, j--) {
			let dim = shape[i];
			if (dim == 1) continue;
			if (broadcasted[j] == 1) broadcasted[j] = dim;
			else if (broadcasted[j] != dim) throw 'shape mismatch';
		}
	}
	return broadcasted;
}

tester.add(
	'broadcast_shapes',
	() => broadcast_shapes([1, 2], [3, 1], [3, 2]),
	() => [3, 2]
);
tester.add(
	'broadcast_shapes',
	() => broadcast_shapes([6, 7], [5, 6, 1], [7], [5, 1, 7]),
	() => [5, 6, 7]
);

export function iterable(obj) {
	return obj?.[Symbol.iterator] != undefined;
}

tester.add(
	'shape',
	() => shape([[[3, 9]], [[3, 9, 3]], [[3, 9]]]),
	() => [3, 1]
);

tester.add(
	'shape',
	() => shape([1, 2, 3, [1, 3]]),
	() => [4]
);

export function empty(shape) {
	if (is_int(shape)) shape = [shape];
	return new NDArray(shape, Array(prod(shape)));
}

tester
	.add(
		'empty',
		() => empty([2, 2]),
		() => [
			[, ,],
			[, ,],
		]
	)
	.add(
		'empty',
		() => empty(0),
		() => []
	)
	.add(
		'empty',
		() => empty([]),
		() => undefined
	);

export function empty_like(prototype) {
	return empty(shape(prototype));
}

tester
	.add(
		'empty_like',
		() =>
			empty_like([
				[1, 2, 3],
				[4, 5, 6],
			]),
		() => [
			[, , ,],
			[, , ,],
		]
	)
	.add(
		'empty_like',
		() => empty_like([1, 2, 3, [1, 3]]),
		() => [, , , ,]
	);

export function eye(N, M = N, k = 0) {
	let size = N * M;
	let data = Array(size).fill(0);
	for (let i = k + Math.ceil(-k / (M + 1)) * (M + 1); i < size; i += M + 1) data[i] = 1;
	return new NDArray([N, M], data);
}

tester
	.add(
		'eye',
		() => eye(2),
		() => [
			[1, 0],
			[0, 1],
		]
	)
	.add(
		'eye',
		() => eye(3, 3, 1),
		() => [
			[0, 1, 0],
			[0, 0, 1],
			[0, 0, 0],
		]
	)
	.add(
		'eye',
		() => eye(4, 5, -1),
		() => [
			[0, 0, 0, 0, 0],
			[1, 0, 0, 0, 0],
			[0, 1, 0, 0, 0],
			[0, 0, 1, 0, 0],
		]
	);

export function identity(n) {
	let size = n * n;
	let data = Array(size).fill(0);
	for (let i = 0; i < size; i += n + 1) data[i] = 1;
	return new NDArray([n, n], data);
}

tester.add(
	'identity',
	() => identity(3).toarray(),
	() => [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1],
	]
);

tester.add(
	'identity',
	() => identity(0).toarray(),
	() => []
);

// export function ones(shape)
// export function ones_like(shape)
// export function zeros(shape)
// export function zeros_like(shape)

export function full(shape, fill_value) {
	if (isscalar(fill_value)) {
		let data = Array(prod(shape)).fill(fill_value);
		return new NDArray(shape, data);
	}
	let array = empty(shape);
	copyto(array, fill_value);
	return array;
}

tester
	.add(
		'full',
		() => full([2, 2], Infinity),
		() => [
			[Infinity, Infinity],
			[Infinity, Infinity],
		]
	)
	.add(
		'full',
		() => full([2, 2], 10),
		() => [
			[10, 10],
			[10, 10],
		]
	)
	.add(
		'full',
		() => full([2, 2], [1, 2]),
		() => [
			[1, 2],
			[1, 2],
		]
	);

// end
function test() {
	if (runTest) tester.run();
}

test();
