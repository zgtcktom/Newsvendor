import { ndindex } from './core.mjs';

function index_offset(index, strides) {
	let offset = 0;
	for (let i = 0; i < index.length; i++) offset += index[i] * strides[i];
	return offset;
}

export function* ndoffset(array) {
	let { strides, shape, offset } = array;
	for (let index of ndindex(shape)) {
		yield offset + index_offset(index, strides);
	}
}
