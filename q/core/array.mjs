import { tester, NDArray, shape } from './core.mjs';

function flatten_with_shape(data, array, shape, level = 0) {
	if (level == shape.length) {
		data.push(array);
		return;
	}
	for (let i = 0; i < shape[level]; i++) {
		flatten_with_shape(data, array[i], shape, level + 1);
	}
}

export function array(a) {
	let data = [];
	flatten_with_shape(data, a, shape(a));
	// console.log(data);
	return new NDArray(shape(a), data);
}

tester
	.add(
		'array',
		() => array([3.1, 9]),
		() => [3.1, 9]
	)
	.add(
		'array',
		() => array([[9, 6], 3.1, 9]).shape,
		() => [3]
	);
