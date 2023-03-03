import { tester, slice, copyto } from './core.mjs';

function get_strides(shape, itemsize) {
	let strides = [];
	if (shape.length > 0) {
		strides[shape.length - 1] = itemsize;
		for (let i = shape.length - 2; i >= 0; i--) {
			strides[i] = strides[i + 1] * shape[i + 1];
		}
	}
	return strides;
}

function get_size(shape) {
	let size = 1;
	for (let dim of shape) size *= dim;
	return size;
}

function is_int(value) {
	return Number.isInteger(value);
}

function is_tuple(value) {
	return value?.length != undefined;
}

function type(value) {
	return value?.constructor.name;
}

function _index(array, index) {
	if (is_int(index)) {
		let { ndim, shape, size } = array;
		if (index >= size) throw `index ${index} out of bound for size ${size}`;
		let sizes = [...shape];
		for (let i = sizes.length - 2; i >= 1; i--) {
			sizes[i] *= sizes[i + 1];
		}
		let indices = Array(ndim).fill(0);
		for (let i = 0; i < indices.length - 1; i++) {
			let size = sizes[i + 1];
			if (index >= size) {
				indices[i] = (index / size) | 0;
				index %= size;
			}
		}
		indices[indices.length - 1] = index;
		// console.log('sizes', sizes, indices);
		index = indices;
	} else if (!is_tuple(index)) throw `unexpected type '${type(index)}'`;
	return index;
}

function index_offset(index, strides, shape) {
	let offset = 0;
	for (let i = 0; i < index.length; i++) offset += (index[i] < 0 ? index[i] + shape[i] : index[i]) * strides[i];
	return offset;
}

export class NDArray {
	constructor(shape, buffer = null, strides = get_strides(shape, 1), offset = 0, itemsize = 1) {
		// https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html
		this.size = get_size(shape);
		this.ndim = shape.length;
		this.base = null;

		this.shape = shape;
		this.data = buffer ?? Array(this.size);
		this.itemsize = itemsize;
		this.strides = strides;
		this.offset = offset;
	}

	get(...indices) {
		let { shape, data, itemsize, strides, offset } = this;
		shape = shape.slice();
		strides = strides.slice();
		let ndim = 0;
		if (indices.length > shape.length) throw 'too many indices for array';
		for (let index of indices) {
			if (shape.length == 0) throw 'invalid index to scalar variable';
			if (slice.is(index)) {
				let { start, step, slicelength } = index.get(shape[ndim]);
				offset = offset + strides[ndim] * start;
				shape.splice(ndim, 1, slicelength);
				strides.splice(ndim, 1, strides[ndim] * step);
				ndim++;
			} else {
				if (index < 0) index += shape[ndim];
				offset = offset + strides[ndim] * index;
				shape.splice(ndim, 1);
				strides.splice(ndim, 1);
			}
		}
		return new NDArray(shape, data, strides, offset, itemsize);
	}

	set(value) {
		copyto(this, value);
		return this;
	}

	item(index) {
		if (index == undefined) {
			let { size } = this;
			if (size != 1) throw 'index cannot be empty if size != 1';
			index = 0;
		}
		index = _index(this, index);

		let { data, strides, shape, offset } = this;
		return data[offset + index_offset(index, strides, shape)];
	}

	itemset(index, scalar) {
		let { size, offset, data, shape, strides } = this;
		if (scalar == undefined && size == 1) {
			data[offset] = index;
			return;
		}

		index = _index(this, index);

		data[offset + index_offset(index, strides, shape)] = scalar;
	}

	toarray() {
		let { ndim, offset, data, shape } = this;
		if (ndim == 0) return data[offset];
		let array = [];
		for (let i = 0; i < shape[0]; i++) {
			array.push(this.get(i).toarray());
		}
		return array;
	}
}

tester
	.add(
		'ndarray.get',
		() => {
			let a = new NDArray([2, 5], [...Array(10).keys()]);
			return a.get(slice(), slice([, , -1]));
		},
		() => [
			[4, 3, 2, 1, 0],
			[9, 8, 7, 6, 5],
		]
	)
	.add(
		'ndarray.get',
		() => {
			let a = new NDArray([2, 5], [...Array(10).keys()]);
			return a.get(slice(-1), 3);
		},
		() => [8]
	)
	.add(
		'ndarray.get',
		() => {
			let a = new NDArray([2, 5], [...Array(10).keys()]);
			return a.get(slice([, , -1]), slice([, , -1]));
		},
		() => [
			[9, 8, 7, 6, 5],
			[4, 3, 2, 1, 0],
		]
	);

tester.add(
	'ndarray.item',
	() => {
		let a = new NDArray([2, 5], [...Array(10).keys()]);
		return a.get(slice([, , -1]), slice([, , -1])).item(5);
	},
	() => 4
);

tester.add(
	'ndarray.itemset',
	() => {
		let x = new NDArray(
			[3, 3],
			[
				[2, 2, 6],
				[1, 3, 6],
				[1, 0, 1],
			].flat()
		);
		x.itemset(4, 0);
		x.itemset([2, 2], 9);
		return x;
	},
	() => [
		[2, 2, 6],
		[1, 0, 6],
		[1, 0, 9],
	]
);

tester.add(
	'ndarray.set',
	() => {
		let a = new NDArray([2, 5], [...Array(10).keys()]);
		a.get(slice(), slice(1, -1)).set(10);
		return a;
	},
	() => [
		[0, 10, 10, 10, 4],
		[5, 10, 10, 10, 9],
	]
);
