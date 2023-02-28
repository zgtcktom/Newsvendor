
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
    return value.length != undefined;
}

function type(value) {
    return value?.constructor.name;
}

export class NDArray {
    constructor(shape, buffer, strides = get_strides(shape, 1), offset = 0, itemsize = 1) {
        // https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html
        this.size = get_size(shape);
        this.ndim = shape.length;
        this.base = null;

        this.shape = shape;
        // console.log(shape)
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
                indices[i] = index / size | 0;
                index %= size;
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

console.log(new NDArray([2, 5], [...Array(10).keys()]).getitem(new Slicer(), new Slicer(null, null, -1)));
console.log(new NDArray([2, 5], [...Array(10).keys()]).getitem(new Slicer(), new Slicer(null, null, -1)).item(9));
console.log(type(true), type(NaN), Array(10).fill(0));


export function ndarray(shape, buffer, strides, offset) {
    return new NDArray(shape, buffer, strides, offset);
}

function test() {
    console.log('test', new NDArray([3, 2, 5, 2], [...Array(60).keys()]).getitem(2, new Slicer(null, null, 2), 1).toarray());
}

test();