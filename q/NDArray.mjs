import { Tester } from './Tester.mjs';

let tester = new Tester();

class Slicer {
    constructor(start, stop, step) {
        this.start = start;
        this.stop = stop;
        this.step = step;
    }
    get(length) {
        // https://svn.python.org/projects/python/branches/pep-0384/Objects/sliceobject.c
        let { start, stop, step } = this;
        if (step == null) {
            step = 1;
        }

        let defstart = step < 0 ? length - 1 : 0;
        let defstop = step < 0 ? -1 : length;

        if (start == null) {
            start = defstart;
        } else {
            if (start < 0) start += length;
            if (start < 0) start = step < 0 ? -1 : 0;
            if (start >= length) start = step < 0 ? length - 1 : length;
        }

        if (stop == null) {
            stop = defstop;
        } else {
            if (stop < 0) stop += length;
            if (stop < 0) stop = step < 0 ? -1 : 0;
            if (stop >= length) stop = step < 0 ? length - 1 : length;
        }

        let slicelength;
        if ((step == 0) || (step < 0 && stop >= start) || (step > 0 && start >= stop)) {
            slicelength = 0;
        } else if (step < 0) {
            slicelength = (stop - start + 1) / (step) + 1 | 0;
        } else {
            slicelength = (stop - start - 1) / (step) + 1 | 0;
        }
        return new Slice(start, stop, step, slicelength);
    }
}

function slice(start, stop, step) {
    if (is_tuple(start)) {
        ({ 0: start, 1: stop, 2: step } = start);
    }
    return new Slicer(start, stop, step);
}

class Slice {
    constructor(start, stop, step, slicelength) {
        this.start = start;
        this.stop = stop;
        this.step = step;
        this.slicelength = slicelength;
    }
}


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
    if (shape.length == 0) return 0;
    let size = 1;
    for (let n of shape) size *= n;
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

function prod(a) {
    let prod = 1;
    for (let n of a) prod *= n;
    return prod;
}

export class NDArray {
    constructor(shape, buffer = null, strides = get_strides(shape, 1), offset = 0, itemsize = 1) {
        // https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html
        this.size = get_size(shape);
        this.ndim = shape.length;
        this.base = null;

        this.shape = shape;
        this.data = buffer ?? new Array(this.size);
        this.itemsize = itemsize;
        this.strides = strides;
        this.offset = offset;
    }
    getitem(...indices) {
        let { shape, data, itemsize, strides, offset } = this;
        let ndim = 0;
        if (indices.length > shape.length) throw 'too many indices for array';
        for (let index of indices) {
            if (shape.length == 0) throw 'invalid index to scalar variable';
            if (index instanceof Slicer) {
                let { start, stop, step, slicelength } = index.get(shape[ndim]);
                // console.log('index', start, stop, step, slicelength)
                offset = offset + strides[ndim] * start;
                // console.log(slicelength)
                shape = [...shape.slice(0, ndim), slicelength, ...shape.slice(ndim + 1)];
                strides = [...strides.slice(0, ndim), strides[ndim] * step, ...strides.slice(ndim + 1)];
                ndim++;
            } else {
                if (index < 0) index += shape[ndim];
                offset = offset + strides[ndim] * index;
                shape = [...shape.slice(0, ndim), ...shape.slice(ndim + 1)];
                strides = [...strides.slice(0, ndim), ...strides.slice(ndim + 1)];
            }
        }
        return new NDArray(shape, data, strides, offset, itemsize);
    }
    item(index) {
        if (index == undefined) {
            let { size } = this;
            if (size != 1) throw 'index cannot be empty if size != 1';
            index = 0;
        }
        if (is_int(index)) {
            let { ndim, shape, size } = this;
            if (index >= size) throw `index ${index} out of bound for size ${size}`;
            let sizes = [...shape];
            for (let i = sizes.length - 2; i >= 1; i--) {
                sizes[i] *= sizes[i + 1];
            }
            let indices = Array(ndim).fill(0);
            for (let i = 0; i < indices.length - 1; i++) {
                let size = sizes[i + 1];
                if (index >= size) {
                    indices[i] = index / size | 0;
                    index %= size;
                }
            }
            indices[indices.length - 1] = index;
            // console.log('sizes', sizes, indices);
            index = indices;
        } else if (!is_tuple(index)) throw `unexpected type '${type(index)}'`;

        let { data, strides, shape, offset } = this;
        for (let i = 0; i < index.length; i++) {
            offset += (index[i] < 0 ? index[i] + shape[i] : index[i]) * strides[i];
        }
        return data[offset];

    }
    toarray() {
        let { ndim, offset, data, shape } = this;
        if (ndim == 0) return data[offset];
        let array = [];
        for (let i = 0; i < shape[0]; i++) {
            array.push(this.getitem(i).toarray());
        }
        return array;
    }
}

function* ndindex(shape, reuse = true) {
    let index = Array(shape.length).fill(0);
    let size = prod(shape);
    if (size == 0) return;

    yield reuse ? index : index.slice();
    for (let i = 1; i < size; i++) {
        for (let j = index.length - 1; j >= 0; j--) {
            index[j] += 1;
            if (index[j] < shape[j])
                break;
            index[j] -= shape[j];
        }
        yield reuse ? index : index.slice();
    }
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

tester.add('broadcast_shapes',
    () => broadcast_shapes([1, 2], [3, 1], [3, 2]),
    () => [3, 2]);
tester.add('broadcast_shapes',
    () => broadcast_shapes([6, 7], [5, 6, 1], [7], [5, 1, 7]),
    () => [5, 6, 7]);

export function broadcast_to(array, shape) {
    if (array.shape.length > shape.length) throw 'broadcast shape has less dimensions than input array';

    let { data, strides, offset, itemsize } = array;

    let new_strides = [];
    for (let i = shape.length - 1, j = array.shape.length - 1; i >= 0; i--, j--) {
        if (j >= 0 && array.shape[j] != 1 && array.shape[j] != shape[i]) throw 'operands could not be broadcast together';
        new_strides[i] = j < 0 || array.shape[j] == 1 ? 0 : strides[j];
    }

    return new NDArray(shape, data, new_strides, offset, itemsize);
}

tester.add('broadcast_to',
    () => broadcast_to(new NDArray([3], [1, 2, 3]), [3, 3]).toarray(),
    () => [[1, 2, 3], [1, 2, 3], [1, 2, 3]]);

tester.add('broadcast_to',
    () => broadcast_to(new NDArray([1, 3, 1], [1, 2, 3]), [2, 3, 4]).toarray(),
    () => [[[1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3]], [[1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3]]]);

export function iterable(obj) {
    return obj?.[Symbol.iterator] != undefined;
}

function nested_shape(array, shape, level) {
    for (let i = 0; i < array.length; i++) {
        if (array[i]?.length != shape[level]) {
            shape.length = level;
            return;
        }
        if (array[i]?.length != undefined && shape.length > level + 1) {
            if (!nested_shape(array[i], shape, level + 1)) return;
        }
    }
    return true;
}

export function shape(array) {
    if (array.shape != undefined) return array.shape;
    let shape = [];
    let elem = array;
    while (elem?.length != undefined) {
        shape.push(elem.length);
        elem = elem[0];
    }
    // console.log(shape.length > 1)
    if (array.length != undefined && shape.length > 1)
        nested_shape(array, shape, 1);
    return shape;
}

tester.add('shape',
    () => shape([[[3, 9]], [[3, 9, 3]], [[3, 9]]]),
    () => [3, 1]);

tester.add('shape',
    () => shape([1, 2, 3, [1, 3]]),
    () => [4]);

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
    console.log(data);
}

console.log(array([[[3, 9]], [[3, 9]], [[3, 9]]]))

// console.log(new NDArray([2, 5], [...Array(10).keys()]).getitem(slice(), slice([, , -1])));
// let a = new NDArray([2, 5], [...Array(10).keys()]).getitem(slice(), slice([, , -1]));
// console.log(a.item(9));
// console.log(type(true), type(NaN), Array(10).fill(0));

// for (let index of ndindex(a.shape)) {
//     console.log(index, a.item(index));
// }


export function ndarray(shape, buffer, strides, offset) {
    return new NDArray(shape, buffer, strides, offset);
}

function test() {
    console.log('test', new NDArray([3, 2, 5, 2], [...Array(60).keys()]).getitem(2, new Slicer(null, null, 2), 1).toarray());

    tester.run();
}

test();