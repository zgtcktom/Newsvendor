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
	if (array.length != undefined && shape.length > 1) nested_shape(array, shape, 1);
	return shape;
}
