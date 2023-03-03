import { NDArray } from '../core.mjs';

function default_compare(a, b) {
	if (a == b) return true;
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length != b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!default_compare(a[i], b[i])) return false;
		}
		return true;
	}
	if (typeof a == 'boolean' && typeof b == 'boolean') return a == b;
	if (typeof a == 'number' && typeof b == 'number') return a == b;
	if (typeof a == 'string' && typeof b == 'string') return a == b;

	if (a?.toarray != undefined) return default_compare(a.toarray(), b);
	if (b?.toarray != undefined) return default_compare(a, b.toarray());

	if (a?.constructor != b?.constructor) return false;
	let a_keys = Object.getOwnPropertyNames(a);
	let b_keys = Object.getOwnPropertyNames(b);
	if (a_keys.length != b_keys.length) return false;

	for (let i = 0; i < a_keys.length; i++) {
		if (!default_compare(a[a_keys[i]], b[b_keys[i]])) return false;
	}
	return true;
}

function _print(a) {
	if (a instanceof NDArray) a = `NDArray(${JSON.stringify(a.toarray())})`;
	if (Array.isArray(a)) return JSON.stringify(a);
	return a;
}

export class Tester {
	compare = default_compare;
	constructor() {
		this.tasks = {};
	}
	add(name, test, expected, compare = this.compare) {
		let tasks = this.tasks[name] ?? (this.tasks[name] = []);
		tasks.push({ test, expected, compare });
		return this;
	}
	run(name) {
		if (name == undefined) {
			let status = true;
			for (let name of Object.keys(this.tasks)) {
				status = this.run(name) && status;
			}
			let color = (status ? '\x1b[32m' : '\x1b[31m') + '%s\x1b[0m';
			console.log(color, `Status: ${status}`);
			return status;
		}
		let tasks = this.tasks[name];
		if (tasks == undefined) throw 'no such name';
		let caseNo = 1;
		let n_passed = 0;
		let stored = [];
		for (let task of tasks) {
			let { test, expected, compare } = task;
			let passed = false;
			let a, b;
			let hasError = false;
			try {
				a = test();
			} catch (error) {
				a = `[Error]: ${error}`;
				console.log(error);
				hasError = true;
			}
			try {
				b = expected();
			} catch (error) {
				b = `[Error]: ${error}`;
				console.log(error);
				hasError = true;
			}
			if (!hasError) passed = compare(a, b);
			if (passed) n_passed++;
			let color = (passed ? '\x1b[32m' : '\x1b[31m') + '%s\x1b[0m';
			stored.push([
				color,
				`#${caseNo}: ${passed ? 'passed' : 'fail'}`,
				`Test=`,
				_print(a),
				`Expected=`,
				_print(b),
			]);
			caseNo++;
		}
		let color = (n_passed == tasks.length ? '\x1b[32m' : '\x1b[31m') + '%s\x1b[0m';
		console.log(color, `Testing ${name}: ${n_passed} / ${tasks.length} cases passed`);
		if (n_passed != tasks.length) {
			for (let msg of stored) {
				console.log(...msg);
			}
		}

		return n_passed == tasks.length;
	}
}

export let tester = new Tester();
