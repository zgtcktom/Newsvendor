import { tester, array } from './core.mjs';

export function isscalar(element) {
	switch (typeof element) {
		case 'boolean':
		case 'function':
		case 'number':
		case 'string':
			return true;
	}
	return false;
}

tester
	.add(
		'isscalar',
		() => isscalar(3.1),
		() => true
	)
	.add(
		'isscalar',
		() => isscalar(array(3.1)),
		() => false
	)
	.add(
		'isscalar',
		() => isscalar([3.1]),
		() => false
	)
	.add(
		'isscalar',
		() => isscalar(false),
		() => true
	)
	.add(
		'isscalar',
		() => isscalar('numpy'),
		() => true
	)
	.add(
		'isscalar',
		() => isscalar(Number()),
		() => true
	);
