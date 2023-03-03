import * as tf from '@tensorflow/tfjs';

import { stats, integrate, print, random, range, ndarray, DataFrame, mean, std } from './utils.mjs';

import { RL_brain_kstest } from './Q_LEARNING_kstest.mjs';
import { RL_brain_base } from './Q_LEARNING_base.mjs';

// import { NDArray } from './NDArray.mjs';

// console.log(tf.add(tf.tensor([1, 2, 3]), tf.tensor([1, 2, 3])));

let r = 0.2;
// console.log(stats.norm(0.8, 1.2).expect(x => x - r - 1, r + 1, Infinity));
// console.log(stats.norm(0.8, 1.2).pdf(1000));
// console.log(((1.2 * 3 + 0.8) - 0.8) / 1.2);
// console.log(stats.norm(0.8, 1.2).ppf(0.6));

// console.log(random.choice(10));

// console.log(ndarray([1, 2, 3]));

// #Set Demand parameter
let MEAN1 = 10;
let VAR1 = 10;
let MEAN2 = 15;
let VAR2 = 15;
let LEADTIME = 4;
let HOLDING_COST = 1;
let BACKLOG_COST = 20;

//#Set Q learning parameter
let EPSILON = 0.9; //# initial exploration rate
let ALPHA = 0.6; //# initial learning rate
let GAMMA = 0.1; //# discount factor
let N_STATES = 121; //#Define the inventory position space
let ACTIONS = 40; //#Define the largerst reorder quantity
let SIMULATION_TIME = 100; //#number of iteration

// #Set action space
// #1 represents uniform action space;
// #2 represents base stock action space;
// #3 represents safty stock action space
let ACTION_NUMBER = 3;
let upperlimit_constant = 10;
// # Set learning method

// let method = new RL_brain_kstest(MEAN1, VAR1, MEAN2, VAR2, LEADTIME,
//     HOLDING_COST, BACKLOG_COST,
//     EPSILON, ALPHA, GAMMA,
//     N_STATES, ACTIONS, SIMULATION_TIME, ACTION_NUMBER, upperlimit_constant);

// let method = new RL_brain_base(MEAN1, VAR1, MEAN2, VAR2, LEADTIME,
//     HOLDING_COST, BACKLOG_COST,
//     EPSILON, ALPHA, GAMMA,
//     N_STATES, ACTIONS, SIMULATION_TIME, ACTION_NUMBER, upperlimit_constant);

// let [q_table_1, q_table_2, R_episode, simulation_time, Inv_state, a__, Onhand_state] = method.rl();

// function simple_csv(obj) {
//     let text = '';
//     for (let row of obj) {
//         text += row.join(',') + '\n';
//     }
//     return text;
// }

// import * as fs from 'fs';

// try {
//     fs.writeFileSync('./q_table_1.csv', simple_csv(q_table_1));
//     fs.writeFileSync('./q_table_2.csv', simple_csv(q_table_2));
// } catch (err) {
//     console.error(err);
// }

// console.log(R_episode);

function binarysearch(a, v) {
	let left = 0,
		right = a.length;
	// if (v < a[left]) return 0;
	// if (v > a[right - 1]) return right;
	while (left <= right) {
		let middle = ((left + right) / 2) | 0;
		// console.log(middle, left, right, ale], v);
		if (a[middle] == v) return middle;
		if (a[middle] < v) {
			left = middle + 1;
		} else {
			right = middle - 1;
		}
	}
	let middle = ((left + right) / 2) | 0;
	return v < a[middle] ? middle : middle + 1;
}

function isiterable(v) {
	return v?.[Symbol.iterator] != undefined;
}

function searchsorted(a, v, side = 'left') {
	if (isiterable(v)) {
		let result = [];
		for (let n of v) {
			result.push(searchsorted(a, n, side));
		}
		return result;
	}
	let i = binarysearch(a, v);
	if (side == 'left') {
		for (; i >= 0 && a[i - 1] == v; i--);
	} else if (side == 'right') {
		for (; i < a.length && a[i] == v; i++);
	} else throw `unexpected argument side = ${side}`;
	return i;
}

function* zip(...iterables) {
	let iterators = iterables.map((iter) => iter[Symbol.iterator]());
	while (true) {
		let any = false;
		let result = [];
		for (let i = 0; i < iterators.length; i++) {
			let iter = iterators[i];
			let v;
			if (iter) {
				let { value, done } = iter.next();
				if (done) iterators[i] = null;
				v = value;
				any = true;
			}
			result.push(v);
		}
		if (!any) return;
		yield result;
	}
}

let divide = (() => {
	function divide_vv(a, b) {
		let result = [];
		for (let [n, m] of zip(a, b)) {
			result.push(n / m);
		}
		return result;
	}
	function divide_vf(a, b) {
		let result = [];
		for (let n of a) {
			result.push(n / b);
		}
		return result;
	}

	function divide_fv(a, b) {
		let result = [];
		for (let n of b) {
			result.push(a / n);
		}
		return result;
	}

	function divide_ff(a, b) {
		return a / b;
	}

	return function divide(a, b) {
		let a_v = isiterable(a),
			b_v = isiterable(b);
		if (a_v) {
			if (b_v) return divide_vv(a, b);
			return divide_vf(a, b);
		}
		if (b_v) return divide_fv(a, b);
		return divide_ff(a, b);
	};
})();

let subtract = (() => {
	function subtract_vv(a, b) {
		let result = [];
		for (let [n, m] of zip(a, b)) {
			result.push(n - m);
		}
		return result;
	}

	function subtract_vf(a, b) {
		let result = [];
		for (let n of a) {
			result.push(n - b);
		}
		return result;
	}

	function subtract_fv(a, b) {
		let result = [];
		for (let n of b) {
			result.push(a - n);
		}
		return result;
	}

	function subtract_ff(a, b) {
		return a - b;
	}

	return function subtract(a, b) {
		let a_v = isiterable(a),
			b_v = isiterable(b);
		if (a_v) {
			if (b_v) return subtract_vv(a, b);
			return subtract_vf(a, b);
		}
		if (b_v) return subtract_fv(a, b);
		return subtract_ff(a, b);
	};
})();

function broadcast_shapes(...shapes) {
	let depth = 0;
	for (let shape of shapes) {
		depth = Math.max(depth, shape.length);
	}
	let out = [];
	if (depth > 0) {
		for (let i = 0; i < depth; i++) out[i] = 1;
		for (let shape of shapes) {
			for (let i = shape.length - 1, ind = depth - 1; i >= 0; i--, ind--) {
				let dim = shape[i];
				if (dim == 1) continue;
				if (out[ind] == 1) out[ind] = dim;
				else if (out[ind] != dim) throw 'shape mismatch';
			}
		}
	}
	return out;
}

function _shape(array) {
	if (array.shape != undefined) return array.shape;
	let shape = [];
	while (array.length != undefined) {
		shape.push(array.length);
		if (array.length == 0) break;
		array = array[0];
	}
	return shape;
}

// function broadcast_to(array, shape) {
//     console.log('_shape', _shape(array))
//     let array_shape = _shape(array);
//     for (let i = array_shape.length - 1, ind = shape.length - 1; i >= 0; i--, ind--) {

//     }
// }

// console.log(broadcast_to([1, 2, 3], [3, 3]));

// function where(condition, x, y) {

// }

// console.log(broadcast_shapes([], [3]));
// console.log(broadcast_shapes([1, 2], [3, 1], [3, 2]));
// console.log(broadcast_shapes([6, 7], [5, 6, 1], [7], [5, 1, 7]));

let clip = (() => {
	function clip_fff(n, lower, upper) {
		return Math.min(Math.max(n, lower), upper);
	}
	function clip_vff(n, lower, upper) {
		return Math.min(Math.max(n, lower), upper);
	}

	return function clip(a, lower, upper) {
		let a_v = isiterable(a),
			lower_v = isiterable(lower),
			upper_v = isiterable(upper);
		if (a_v) {
			return clip_vff(a, lower, upper);
		}
		return clip_fff(a, lower, upper);
	};
})();

function argmin(a) {
	let min_i = -1;
	let min_v = Infinity;
	for (let i = 0; i < a.length; i++) {
		if (a[i] < min_v) {
			min_i = i;
			min_v = a[i];
		}
	}
	return min_i;
}

function argmax(a) {
	let max_i = -1;
	let max_v = -Infinity;
	for (let i = 0; i < a.length; i++) {
		if (a[i] > max_v) {
			max_i = i;
			max_v = a[i];
		}
	}
	return max_i;
}

function gcd(a, b) {
	return b == 0 ? a : gcd(b, a % b);
}

function _clip_prob(p) {
	return clip(p, 0.0, 1.0);
}

function _select_and_clip_prob(cdfprob, sfprob, cdf = true) {
	p = np.where(cdf, cdfprob, sfprob);
	return _clip_prob(p);
}

let data1 = [13, 10, 8, 11, 11, 6, 17, 16, 15, 17, 14, 14, 14, 12, 16, 20, 18, 17, 20, 15];
let data2 = [
	9, 13, 6, 13, 7, 12, 11, 8, 9, 10, 9, 10, 4, 7, 12, 15, 4, 5, 9, 10, 7, 8, 9, 5, 18, 13, 12, 11, 7, 11, 10, 8, 8,
	10, 10, 9, 7, 7, 10, 10, 10, 8, 9, 14, 9, 7, 8, 9, 10, 7, 11, 7, 7, 10, 12, 14, 13, 9, 6, 13, 14, 12, 5, 14, 9, 4,
	13, 7, 6, 7, 8, 11, 9, 7, 14, 16, 8, 7, 8, 9, 15, 9, 12, 7, 10, 10, 7, 6, 8, 12, 7, 5, 3, 6, 14, 16, 12, 4, 11, 15,
	8, 9, 4, 7, 9, 16, 13, 11, 10, 12, 7, 8, 10, 15, 12, 6, 15, 10, 11, 11, 9, 9, 9, 14, 7, 7, 14, 10, 13, 11, 15, 11,
	13, 13, 9, 9, 13, 7, 14, 9, 8, 6, 12, 11, 14, 7, 13, 17, 11, 15, 12, 9, 17, 7, 6, 12, 12, 10, 11, 7, 10, 9, 9, 8,
	12, 13, 10,
];
data1.sort((a, b) => a - b);
data2.sort((a, b) => a - b);

let n1 = data1.length;
let n2 = data2.length;
let data_all = data1.concat(data2);

// console.log('binarysearch', data1, data2, searchsorted(data2, 3, 'right'));

let cdf1 = divide(searchsorted(data1, data_all, 'right'), n1);
let cdf2 = divide(searchsorted(data2, data_all, 'right'), n2);

// console.log('cdf1', searchsorted(data1, 30, 'right'), data2.at(-1));

let cddiffs = subtract(cdf1, cdf2);

let argminS = argmin(cddiffs);
let argmaxS = argmax(cddiffs);
let loc_minS = data_all.at(argminS);
let loc_maxS = data_all.at(argmaxS);

let minS = clip(-cddiffs.at(argminS), 0, 1);
let maxS = cddiffs.at(argmaxS);

let d, d_location, d_sign;
if (minS > maxS) {
	d = minS;
	d_location = loc_minS;
	d_sign = -1;
} else {
	d = maxS;
	d_location = loc_maxS;
	d_sign = 1;
}

let g = gcd(n1, n2);
let n1g = (n1 / g) | 0;
let n2g = (n2 / g) | 0;
let prob = -Infinity;

let [m, n] = [+n1, +n2].sort((a, b) => b - a);
let en = (m * n) / (m + n);
// console.log(m, n, en)

// // prob = sf(d, Math.round(en));

// console.log('searchsorted', searchsorted(data1, data_all, 'right'), data1, data_all);

// console.log(cdf1, cdf2);

// console.log(divide(searchsorted(data1, data2[18], 'right'), n1), data2[18]);
// console.log('binarysearch', binarysearch(data1, 7), searchsorted(data1, 7, 'right'));
// console.log(loc_minS, loc_maxS);
// console.log(cddiffs);

// console.log('error', Math.max(...[-0.05778443113772455,
// -0.2413173652694611,
// -0.4607784431137725,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4844311377245509,
// -0.5122754491017965,
// -0.42215568862275454,
// -0.42215568862275454,
// -0.42215568862275454,
// -0.3640718562874252,
// -0.3640718562874252,
// -0.2820359281437126,
// -0.2820359281437126,
// -0.14401197604790417,
// -0.14401197604790417,
// -0.14401197604790417,
// -0.09999999999999998,
//     0.0,
//     0.0,
// -0.005988023952095809,
// -0.03592814371257485,
// -0.03592814371257485,
// -0.03592814371257485,
// -0.03592814371257485,
// -0.03592814371257485,
// -0.059880239520958084,
// -0.059880239520958084,
// -0.059880239520958084,
// -0.059880239520958084,
// -0.05778443113772455,
// -0.05778443113772455,
// -0.05778443113772455,
// -0.05778443113772455,
// -0.05778443113772455,
// -0.05778443113772455,
// -0.05778443113772455,
// -0.05778443113772455,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.20748502994011975,
// -0.2413173652694611,
// -0.2413173652694611,
// -0.2413173652694611,
// -0.2413173652694611,
// -0.2413173652694611,
// -0.2413173652694611,
// -0.2413173652694611,
// -0.2413173652694611,
// -0.2413173652694611,
// -0.2413173652694611,
// -0.2413173652694611,
// -0.2413173652694611,
// -0.2413173652694611,
// -0.2413173652694611,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.3910179640718563,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4607784431137725,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4446107784431138,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.4844311377245509,
// -0.5122754491017965,
// -0.5122754491017965,
// -0.5122754491017965,
// -0.5122754491017965,
// -0.5122754491017965,
// -0.5122754491017965,
// -0.5122754491017965,
// -0.5122754491017965,
// -0.5122754491017965,
// -0.5122754491017965,
// -0.5122754491017965,
// -0.5122754491017965,
// -0.5122754491017965,
// -0.42215568862275454,
// -0.42215568862275454,
// -0.42215568862275454,
// -0.42215568862275454,
// -0.42215568862275454,
// -0.42215568862275454,
// -0.42215568862275454,
// -0.42215568862275454,
// -0.42215568862275454,
// -0.42215568862275454,
// -0.3640718562874252,
// -0.3640718562874252,
// -0.3640718562874252,
// -0.3640718562874252,
// -0.3640718562874252,
// -0.3640718562874252,
// -0.3640718562874252,
// -0.2820359281437126,
// -0.2820359281437126,
// -0.2820359281437126,
// -0.14401197604790417,
// -0.14401197604790417,
// -0.09999999999999998].map((e, i) => e - cddiffs[i])));

// // console.log(searchsorted([1, 2, 3, 4, 5], [-10, 10, 2, 3]));

// // console.log('cdf1', searchsorted(data1, 30, 'right'), data2.at(-1));

// // console.log(searchsorted([1, 2, 3, 4, 5], 3.5));
