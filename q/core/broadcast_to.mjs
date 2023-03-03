import { tester, NDArray } from './core.mjs';

export function broadcast_to(array, shape) {
	if (array.shape.length > shape.length) throw 'broadcast shape has less dimensions than input array';

	let { data, strides, offset, itemsize } = array;

	let new_strides = [];
	for (let i = shape.length - 1, j = array.shape.length - 1; i >= 0; i--, j--) {
		if (j >= 0 && array.shape[j] != 1 && array.shape[j] != shape[i])
			throw 'operands could not be broadcast together';
		new_strides[i] = j < 0 || array.shape[j] == 1 ? 0 : strides[j];
	}

	return new NDArray(shape, data, new_strides, offset, itemsize);
}

tester.add(
	'broadcast_to',
	() => broadcast_to(new NDArray([3], [1, 2, 3]), [3, 3]).toarray(),
	() => [
		[1, 2, 3],
		[1, 2, 3],
		[1, 2, 3],
	]
);

tester.add(
	'broadcast_to',
	() => broadcast_to(new NDArray([1, 3, 1], [1, 2, 3]), [2, 3, 4]).toarray(),
	() => [
		[
			[1, 1, 1, 1],
			[2, 2, 2, 2],
			[3, 3, 3, 3],
		],
		[
			[1, 1, 1, 1],
			[2, 2, 2, 2],
			[3, 3, 3, 3],
		],
	]
);
