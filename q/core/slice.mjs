export class Slice {
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
		if (step == 0 || (step < 0 && stop >= start) || (step > 0 && start >= stop)) {
			slicelength = 0;
		} else if (step < 0) {
			slicelength = ((stop - start + 1) / step + 1) | 0;
		} else {
			slicelength = ((stop - start - 1) / step + 1) | 0;
		}
		return { start, stop, step, slicelength };
	}
}

function slice(start, stop, step) {
	if (start?.length != undefined) {
		({ 0: start, 1: stop, 2: step } = start);
	}
	return new Slice(start, stop, step);
}

slice.is = function (obj) {
	return obj instanceof Slice;
};

export { slice };
