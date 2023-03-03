import { array } from './core.mjs';
import { tester } from './core.mjs';

export function ndim(a) {
	if (a == undefined) return 0;
	switch (typeof a) {
		case 'boolean':
		case 'function':
		case 'number':
		case 'string':
			return 0;
	}
	if (a.ndim != undefined) return a.ndim;
	return array(a).ndim;
}

tester
	.add(
		'ndim',
		() =>
			ndim([
				[1, 2, 3],
				[4, 5, 6],
			]),
		() => 2
	)
	.add(
		'ndim',
		() =>
			ndim(
				array([
					[1, 2, 3],
					[4, 5, 6],
				])
			),
		() => 2
	)
	.add(
		'ndim',
		() => ndim(1),
		() => 0
	);
