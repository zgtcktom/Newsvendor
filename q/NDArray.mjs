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

export class NDArray {
    constructor(shape, buffer, strides = get_strides(shape, 1), offset = 0) {
        // https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html
        this.itemsize = 1;
        this.size = get_size(shape);
        this.ndim = shape.length;
        this.base = null;

        this.shape = shape;
        this.data = buffer ?? new Array(this.size);
        this.strides = strides;
        this.offset = offset;
    }
    getitem(index) {
        let { shape, data, itemsize, strides, offset } = this;
        return new NDArray();
    }
}

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
            slicelength = (stop - start + 1) / (step) + 1;
        } else {
            slicelength = (stop - start - 1) / (step) + 1;
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


export function ndarray(shape, buffer, strides, offset) {
    return new NDArray(shape, buffer, strides, offset);
}

function test() {
    console.log(new NDArray([3, 4]).getitem([]));
}

test();