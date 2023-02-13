import * as tf from '@tensorflow/tfjs';
import jStat from 'jstat';

console.log(tf.add(tf.tensor([1, 2, 3]), tf.tensor([1, 2, 3])));

console.log(jStat.normal.inv(0.2, 1, 2));
console.log(jStat.normal(1, 2).std());

let stats = {
    norm(loc, scale) {
        return {
            mean() {
                return loc;
            },
            std() {
                return scale
            },
            cdf(x) {
                return jStat.normal.cdf(x, loc, scale);
            },
        }
    },
};

class BaseStock {
    constructor(l, h, b, X) {
        this.l = l;
        this.h = h;
        this.b = b;
        this.X = X;

        this.theta = this.X.mean();
        this.sigma = this.X.std();
        this.G = this.X.cdf;
    }

    S(r) {
        return this.G(r);
    }
}
