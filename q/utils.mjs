import * as tf from '@tensorflow/tfjs';

import jStat from 'jstat';

import jerzy from 'jerzy';

export let integrate = {
    trapezoid(f, a, b, dx = 1.0) {
        if (b == Infinity) {
            // only works in distribution functions
            let n = 1;
            while (true) {
                let y = f(a + n * dx);
                if (y == 0 || y == Infinity) break;
                n *= 2;
            }
            b = n * dx + a;
        }
        let n = ((b - a) / dx) | 0;
        let area = 0;

        // console.log(n);

        let x0 = a + 0 * dx;
        let y0 = f(x0);
        for (let i = 1; i < n; i++) {
            let x1 = a + (i + 1) * dx;
            let y1 = f(x1);

            let trapezoid = dx * (y0 + y1) / 2;
            area += trapezoid;

            y0 = y1;

            if (trapezoid == Infinity || trapezoid == -Infinity) break;
        }

        return area;
    }
};

export let stats = {
    norm(loc, scale) {
        return {
            mean() {
                return loc;
            },
            std() {
                return scale;
            },
            cdf(x) {
                return jStat.normal.cdf(x, loc, scale);
            },
            pdf(x) {
                return jStat.normal.pdf(x, loc, scale);
            },
            ppf(x) {
                return jStat.normal.inv(x, loc, scale);
            },
            expect(func, lb, ub) {
                return integrate.trapezoid(x => func(x) * this.pdf(x), lb, ub, 0.001);
            },
        }
    },
    ks_2samp(a, b) {
        // revision needed
        // poor approximation of scipy.stats.ks_2samp
        let { d, p } = new jerzy.Nonparametric.kolmogorovSmirnov(
            new jerzy.Vector(a),
            new jerzy.Vector(b)
        );
        return [d, p];
    }
};

export let print = (...args) => console.log(...args);

export let range = (start, end, step) => {
    return tf.range(start, end, step).dataSync();
};

export let ndarray = (shape, fill = 0) => {
    let array = [];
    let nd;
    if (shape.length > 1) {
        nd = shape.slice(1);
    }
    for (let i = 0; i < shape[0]; i++) {
        array.push(nd != undefined ? ndarray(nd, fill) : fill);
    }
    return array;
};

export let mean = (array) => {
    return jStat.mean(array);
};

export let std = (array) => {
    return jStat.stdev(array);
};

export let sum = (array) => {
    return Array.from(array).reduce((a, b) => a + b, 0);
};

export let DataFrame = function (array, columns, index) {
    let rowAccess = {};
    // console.log(columns);
    for (let [i, col] of columns.entries()) {
        if (i != col)
            Object.assign(rowAccess, {
                get [col]() {
                    return this[i];
                },
                set [col](n) {
                    this[i] = n;
                },
            });
    }

    let table = [];
    for (let i = 0; i < array.length; i++) {
        table[i] = Object.assign(array[i].slice(), rowAccess, { index: index[i] });
    }

    return table;
};

export let random = {
    uniform(minval = 0, maxval = 1, shape) {
        if (shape != undefined) {
            return tf.randomUniform(shape, minval, maxval).dataSync();
        }
        return tf.randomUniform([1], minval, maxval).dataSync()[0];
    },
    randint(minval, maxval) {
        return Math.round(random.uniform(minval, maxval));
    },
    normal(mean, std, shape) {
        if (shape != undefined) {
            return tf.randomNormal(shape, mean, std).dataSync();
        }
        return tf.randomNormal([1], mean, std).dataSync()[0];
    },
    choice(a, size, replace = true, p) {
        if (typeof a == 'number') {
            a = range(0, a);
        }
        if (p == undefined) {
            let n = 1 / a.length;
            p = new Array(a.length).fill(n);
        }
        let accum = [p[0]];
        accum[a.length - 1] = 1;
        for (let i = 1; i < a.length - 1; i++) {
            accum[i] = accum[i - 1] + p[i];
        }

        let n = random.uniform();
        // console.log(accum, n)
        for (let i = 0; i < accum.length - 1; i++) {
            if (n < accum[i]) return i;
        }
        return a.length - 1;
    }
};