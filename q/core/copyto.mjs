import { tester, array, slice, broadcast_to, isscalar, ndoffset, ndindex } from './core.mjs';

export function copyto(dst, src, where = true) {
	if (where == true) {
		if (isscalar(src)) {
			for (let offset of ndoffset(dst)) dst.data[offset] = src;
		} else {
			src = broadcast_to(array(src), dst.shape);
			for (let index of ndindex(dst.shape)) {
				dst.itemset(index, src.item(index));
			}
		}
	}
}

tester
	.add(
		'copyto',
		() => {
			let A = array([4, 5, 6]);
			let B = [1, 2, 3];
			copyto(A, B);
			return A;
		},
		() => [1, 2, 3]
	)
	.add(
		'copyto',
		() => {
			let A = array([
				[1, 2, 3],
				[4, 5, 6],
			]);
			let B = [
				[4, 5, 6],
				[7, 8, 9],
			];
			copyto(A, B);
			return A;
		},
		() => [
			[4, 5, 6],
			[7, 8, 9],
		]
	)
	.add(
		'copyto',
		() => {
			let b = array([
				[0, 1, 2],
				[3, 4, 5],
			]);
			copyto(b.get(slice(), 1), [-1, -2]);
			return b;
		},
		() => [
			[0, -1, 2],
			[3, -2, 5],
		]
	);
