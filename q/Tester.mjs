
function default_compare(a, b) {
    if (a == b) return true;
    if (a?.constructor != b?.constructor) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length != b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!default_compare(a[i], b[i])) return false;
        }
        return true;
    }

    let a_keys = Object.getOwnPropertyNames(a);
    let b_keys = Object.getOwnPropertyNames(b);
    if (a_keys.length != b_keys.length) return false;

    for (let i = 0; i < a_keys.length; i++) {
        if (!default_compare(a[a_keys[i]], b[b_keys[i]])) return false;
    }
    return true;
}

export class Tester {
    compare = default_compare;
    constructor() {
        this.tasks = {};
    }
    add(name, test, expected, compare = this.compare) {
        let tasks = this.tasks[name] ?? (this.tasks[name] = []);
        tasks.push({ test, expected, compare });
    }
    run(name) {
        if (name == undefined) {
            for (let name of Object.keys(this.tasks)) {
                this.run(name);
            }
            return;
        }
        console.log(`Testing ${name}`);
        let tasks = this.tasks[name];
        if (tasks == undefined) throw 'no such name';
        let caseNo = 1;
        let n_passed = 0;
        for (let task of tasks) {
            let { test, expected, compare } = task;
            let passed = false;
            let a, b;
            let hasError = false;
            try {
                a = test();
            } catch (error) {
                a = `[Error]: ${error}`;
                hasError = true;
            }
            try {
                b = expected();
            } catch (error) {
                b = `[Error]: ${error}`;
                hasError = true;
            }
            if (!hasError) passed = compare(a, b);
            if (passed) n_passed++;
            let color = (passed ? '\x1b[32m' : '\x1b[31m') + '%s\x1b[0m';
            console.log(color, `#${caseNo}: ${passed ? 'passed' : 'fail'}`, `Test=`, a, `Expected=`, b);
            caseNo++;
        }
        let color = (n_passed == tasks.length ? '\x1b[32m' : '\x1b[31m') + '%s\x1b[0m';
        console.log(color, `${n_passed} / ${tasks.length} cases passed`);
    }
}