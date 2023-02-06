'use strict';
let seed = '123456789';
let random;
function resetSeed() {
    random = new Math.seedrandom(seed);
}

window.setSeed = function (newSeed) {
    seed = newSeed;
};

window.Newsvendor = (function () {
    var randint = (min, max) => Math.floor(random() * (max - min)) + min;
    var gaussianRandom = (mean = 0, stdev = 1) => {
        let u = 1 - random();
        let v = random();
        let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return z * stdev + mean;
    };

    class Exogenous_Information {
        constructor(params) {
            this.params = params;
            this.n = 0;
            this.demand = null;
            this.estimate = null;
        }
        generate() {
            let params = this.params;
            this.n++;
            let demand = this.demand = randint(params.lower, params.upper);
            let estimate = this.estimate = Math.max(0, Math.round(this.demand + gaussianRandom(params.bias, params.std)));
            return [demand, estimate];
        }
    };

    // state_names_field = ['estimate', 'source_bias', 'central_bias']
    // decision_names_field = ['quantity_requested', 'bias_applied']

    class Model {
        constructor(params) {
            this.params = params;
            this.n = 0;
            this.state = null;
            this.action = null;
            this.exogInfo = null;
            this.initialState = { demand: null, estimate: null, bias: 0 };
        }

        reset() {
            let params = this.params;
            this.state = Object.assign({}, this.initialState);
            this.action = null;
            this.n = 0;
            this.exogInfo = new Exogenous_Information(params);
        }

        update(state) {
            this.state = Object.assign({}, this.state, state);
        }

        transition_fn(state) {
            let { alpha } = this.params;
            let [demand, estimate] = this.exogInfo.generate();
            let bias = estimate - demand;


            state = Object.assign({}, state, { demand, estimate });

            return Object.assign({}, state, { bias: (1 - alpha) * state.bias + alpha * bias });
        }

        reward_fn(state, action) {
            let { overageCost, underageCost } = this.params;
            let { demand } = state;
            let { order } = action;

            // console.log(action)
            // console.log('overage', Math.max(order - demand, 0), 'underage', Math.max(demand - order, 0));

            let overstock = overageCost * Math.max(order - demand, 0);
            let understock = underageCost * Math.max(demand - order, 0);
            let penalty = overstock + understock;
            return { total: -penalty, overstock, understock };
        }

        step(action) {
            this.n++;
            let state = { bias: this.state.bias };
            this.update(this.transition_fn(this.state));
            state.estimate = this.state.estimate;
            let decision = this.getDecision(state, action);
            return { reward: this.reward_fn(this.state, decision), decision };
        }

        stepManual(decision) {
            this.n++;
            let state = { bias: this.state.bias };
            this.update(this.transition_fn(this.state));
            state.estimate = this.state.estimate;
            return { reward: this.reward_fn(this.state, decision), decision };
        }

        getDecision(state, action) {
            let { theta } = action;
            let { estimate, bias } = state;
            // bias is the smoothed estimate - actual_demand
            // therefore estimate - bias is the predicted actual demand based on smoothed history
            // the agent decides action.bias to maximize expected reward without an observation (bandit)
            return { order: Math.round(estimate - bias + theta) };
        }
    }

    class Agent {
        constructor(params, theta) {
            this.params = params;
            this.theta = theta;
        }

        action() {
            return { theta: this.theta };
        }
    }

    class Choice {
        constructor(quantity, precision, theta, nuBar = 0.5, initialEstimate = 0) {
            this.n = 0;
            this.quantity = quantity;
            this.precision = precision;
            this.accum_precision = precision;
            this.theta = theta;
            this.nuBar = nuBar;
            this.estimate = initialEstimate;

            this.nu = 1;

            this.reward;
            this.averageReward;
        }

        //update the beliefs of this choice
        update(reward) {
            this.n++;
            this.reward = reward;
            if (this.n == 1) {
                this.averageReward = reward;
            } else {
                this.averageReward = (this.averageReward * (this.n - 1) + reward) / this.n;
            }

            // UCB
            // this.nu=this.nu/(1+this.nu-this.nuBar);

            //IE only
            this.estimate = (this.estimate * this.accum_precision + reward * this.precision) / (this.accum_precision + this.precision);
            this.accum_precision += this.precision;
        }

        getIEValue() {
            return this.estimate + this.theta * Math.sqrt(1 / this.accum_precision);
        }
    }

    class LearningAgent extends Agent {
        constructor(params, theta) {
            super(params, theta);
            this.choices = [];
            let { intervalRange, intervalStep } = params;
            let [intervalFrom, intervalTo] = intervalRange;
            for (let value = intervalFrom; value <= intervalTo; value += intervalStep) {
                this.choices.push(new Choice(value, 0.01, theta));
            }
        }

        getLearningChoice() {
            return this.choices.reduce((a, b) => {
                let [value, choice] = a;
                let newValue = b.getIEValue();
                return newValue > value ? [newValue, b] : [value, choice];
            }, [-Infinity, null])[1];
        }

        action() {
            return { theta: this.getLearningChoice().quantity };
        }
    }

    class Newsvendor {
        constructor(params) {
            resetSeed();
            this.params = params;
            this.env = new Model(params);
            this.manualPolicy = null;
            this.preTrained = false;
            this.preTrainedAgent;
            this.learningAgent;
        }

        *runIter(theta, verbose = false) {
            let params = this.params;
            let agent = this.learningAgent = new LearningAgent(params, theta);
            let env = this.env;

            let T = params.iterations;
            let pretrainedT = 100000;
            let preTrainedAgent = this.preTrainedAgent = new LearningAgent({ ...params, iterations: T + pretrainedT }, 2);

            env.reset();
            for (let t = 0; t < pretrainedT; t++) {
                let action = preTrainedAgent.action();
                let choice = preTrainedAgent.getLearningChoice();

                let { reward } = env.step(action);
                let { total } = reward;
                reward = total;
                choice.update(reward);
            }

            env.reset();

            let accum_reward = 0;
            let accum_overstock_reward = 0;
            let accum_understock_reward = 0;

            for (let t = 0; t < T; t++) {
                let record = {};

                let action, choice;

                if (this.manualPolicy != null) {
                    let { reward, decision } = env.stepManual(this.manualPolicy);
                    let { understock, overstock, total } = reward;
                    reward = total;
                    record.decision = decision;
                    record.reward = reward;
                    record.understock = understock;
                    record.overstock = overstock;
                    record.nextState = env.state;

                    accum_overstock_reward += overstock;
                    accum_understock_reward += understock;
                    accum_reward += reward;
                    record.accum_reward = accum_reward;
                    record.accum_overstock_reward = accum_overstock_reward;
                    record.accum_understock_reward = accum_understock_reward;

                    if (verbose) console.log(record);

                    yield record;
                    continue;
                } else if (this.preTrained) {
                    action = preTrainedAgent.action();
                    if (verbose) console.log(preTrainedAgent.choices.map(choice => choice.getIEValue()));

                    choice = preTrainedAgent.getLearningChoice();
                    if (verbose) console.log('getLearningChoice', choice);

                    record.agent = preTrainedAgent;
                    record.choice = choice;
                    record.timestep = t;
                    record.state = env.state;
                    record.action = action;
                } else {

                    action = agent.action();
                    if (verbose) console.log(agent.choices.map(choice => choice.getIEValue()));

                    choice = agent.getLearningChoice();
                    if (verbose) console.log('getLearningChoice', choice);

                    record.agent = agent;
                    record.choice = choice;
                    record.timestep = t;
                    record.state = env.state;
                    record.action = action;
                }

                let { reward, decision } = env.step(action);
                let { understock, overstock, total } = reward;
                reward = total;
                record.understock = understock;
                record.overstock = overstock;
                record.decision = decision;
                record.reward = reward;
                record.nextState = env.state;

                choice.update(reward);

                accum_reward += reward;
                accum_overstock_reward += overstock;
                accum_understock_reward += understock;
                record.accum_reward = accum_reward;
                record.accum_overstock_reward = accum_overstock_reward;
                record.accum_understock_reward = accum_understock_reward;

                // console.log(`t=${t}, action=`, action, `, decision=`, decision, `, reward=${reward}`);
                if (verbose) console.log(record);

                yield record;
            }
        }

        run(theta, verbose = false) {
            let history = [];

            for (let record of this.runIter(theta, verbose)) {
                history.push(record);
            }

            return history;
        }

        policySearch() {
            let { thetaList, testTrial } = this.params;
            let results = [];
            let sum = (arr) => arr.reduce((a, b) => a + b, 0);
            let mean = (arr) => sum(arr) / arr.length;
            for (let theta of thetaList) {
                let trialResults = [];
                for (let trial = 0; trial < testTrial; trial++) {

                    let history = this.run(theta, false);
                    let result = {
                        params: { theta },
                        accum_reward: history[history.length - 1].accum_reward,
                        accum_reward_after_30: sum(history.slice(30).map((record) => record.reward)), // after 30 time periods
                    };
                    trialResults.push(result);
                }
                results.push({
                    params: trialResults[0].params,
                    accum_reward: mean(trialResults.map((result) => result.accum_reward)),
                    accum_reward_after_30: mean(trialResults.map((result) => result.accum_reward_after_30)),
                    trialResults
                });
            }
            return results;
        }
    }

    let params = {
        alpha: 0.2,
        lower: 20,
        upper: 40,
        bias: -4,
        std: 2,
        overageCost: 2,
        underageCost: 8,
        iterations: 60,
        testTrial: 10,
        thetaList: [0, 1, 2, 3, 4, 5],
        intervalRange: [0, 10],
        intervalStep: 1,
    };
    // let env = new Model(params);

    // env.reset();
    // console.log(env);
    // console.log(env.step({ theta: 30 }));
    // console.log(env);

    let problem = new Newsvendor(params);

    // problem.run(1);

    // grid search
    // console.log(problem.policySearch());

    // https://terrorgum.com/tfox/books/learninginembeddedsystems.pdf

    return Newsvendor;
})();