import { stats, integrate, print, random, range, ndarray, DataFrame, mean, std } from './utils.mjs';

export class BaseStock {
    constructor(l, h, b, X) {
        this.l = l; // leadtime
        this.h = h; // holding cost
        this.b = b; // backorder cost
        this.X = X; // demand distribution during lead time

        this.theta = this.X.mean();
        this.sigma = this.X.std();
        this.G = this.X.cdf;
    }

    S(r) {
        // service level
        return this.G(r);
    }

    B(r) {
        // backorder level
        return this.X.expect(x => x - r - 1, r + 1, Infinity);
    }

    I(r) {
        return r + 1 - this.theta + this.B(r);
    }

    Y(r) {
        return this.h * this.I(r) + this.b * this.B(r);
    }

    rstar() {
        return this.X.ppf(this.b / (this.b + this.h));
    }

    meetServiceLevel(level) {
        // compute reorderlevel for a given service level
        return this.X.ppf(level);
    }
}

export class Reorder {
    constructor(MEAN, VAR, l, h, b) {
        this.MEAN = MEAN;
        this.VAR = VAR;
        this.l = l; // leadtime
        this.h = h; // holding cost
        this.b = b; // backorder cost
    }

    reorder_level() {
        let theta = this.MEAN * this.l; // demand during lead time
        let sigma = Math.sqrt(this.VAR * this.l); // standard deviation during the lead time
        let X_1 = stats.norm(theta, sigma); // demand distribution during lead time
        let basestock = new BaseStock(this.l, this.h, this.b, X_1);
        let r = Math.round(basestock.rstar()) - 1;

        return [basestock, r];
    }

    getBasestock() {
        let [basestock_1, r_1] = this.reorder_level();
        // let [basestock_2, r_2] = this.reorder_level(MEAN2, VAR2, LEADTIME, HOLDING_COST, BACKLOG_COST);

        print('-----------------------------Base stock policy-----------------------------');
        print('Service level: ', basestock_1.S(r_1));
        print('Expected backlog: ', basestock_1.B(r_1));
        print('Expected on-hand inventory: ', basestock_1.I(r_1));
        print('Expected cost: ', basestock_1.Y(r_1));
        print('Optimal reorder level r*: ', basestock_1.rstar());
        print('Minimal reorder level for a fillrate of 0.9: ', basestock_1.meetServiceLevel(0.9));

        // print('-----------------------------Base stock policy2-----------------------------');
        // print('Service level: ', basestock_2.S(r_2));
        // print('Expected backlog: ', basestock_2.B(r_2));
        // print('Expected on-hand inventory: ', basestock_2.I(r_2));
        // print('Expected cost: ', basestock_2.Y(r_2));
        // print('Optimal reorder level r*: ', basestock_2.rstar());
        // print('Minimal reorder level for a fillrate of 0.9: ', basestock_2.meetServiceLevel(0.9));

        return r_1;
    }
}