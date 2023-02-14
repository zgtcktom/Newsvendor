import * as tf from '@tensorflow/tfjs';

import { stats, integrate, print, random } from './utils.mjs';

export class ActionSpace {
    constructor(ACTION_NUMBER) {
        this.ACTION_NUMBER = ACTION_NUMBER;
    }

    choose_action1(state, q_table, eps, r_estimate, rstar1, rstar2, upperlimit_constant) {
        let Is_greedy, state_actions, action_name, Upper_limit, Lower_limit, limit;

        if (this.ACTION_NUMBER == 1) {
            Is_greedy = 0;
            state_actions = q_table.loc[state].map((e, i) => [e, i]).slice();
            action_name;
            if (random.uniform() > (1 - eps)) {
                action_name = random.choice(state_actions.map(([e, i]) => i));
            } else {
                action_name = random.choice(state_actions.filter(([e, i]) => Number.isFinite(e) && e == Math.max(state_actions)).map(([e, i]) => i));
                Is_greedy = 1
            }
            return [action_name, Is_greedy];
        }

        if (this.ACTION_NUMBER == 2) {
            Is_greedy = 0;
            // limit = 0;
            Upper_limit = max(0, rstar1 - state + upperlimit_constant);
            action_name;
            Lower_limit = 0;
            if (Upper_limit == Lower_limit) {
                action_name = 0
            } else {
                state_actions = q_table.loc[state].map((e, i) => [e, i]).slice(Lower_limit, Upper_limit);
                if (random.uniform() > (1 - eps)) {

                    action_name = random.choice(state_actions.map(([e, i]) => i))
                } else {
                    action_name = random.choice(state_actions.filter(([e, i]) => Number.isFinite(e) && e == Math.max(state_actions)).map(([e, i]) => i));
                    Is_greedy = 1
                }
            }
            return [action_name, Is_greedy];
        }

        if (this.ACTION_NUMBER == 3) {
            Is_greedy = 0;
            // limit = 0;
            Upper_limit = Math.max(0, r_estimate - state + upperlimit_constant);
            Lower_limit = 0;
            action_name;
            if (Upper_limit == Lower_limit) {
                action_name = 0;
            } else {
                // console.log(q_table,state);
                state_actions = q_table[state].map((e, i) => [e, i]).slice(Lower_limit, Upper_limit);
                if (random.uniform() > (1 - eps)) {
                    action_name = random.choice(state_actions.map(([e, i]) => i));
                } else {
                    action_name = random.choice(state_actions.filter(([e, i]) => Number.isFinite(e) && e == Math.max(state_actions)).map(([e, i]) => i));
                    Is_greedy = 1;
                }
            }
            return [action_name, Is_greedy];
        }
    }

    choose_action2(self, state, q_table, eps, r_estimate, rstar1, rstar2, upperlimit_constant) {
        let Is_greedy, state_actions, action_name, Upper_limit, Lower_limit, limit;

        if (this.ACTION_NUMBER == 1) {
            Is_greedy = 0;
            state_actions = q_table[state].map((e, i) => [e, i]).slice();
            if (random.uniform() > (1 - eps)) {

                action_name = random.choice(state_actions.map(([e, i]) => i))
            } else {
                action_name = random.choice(state_actions.filter(([e, i]) => Number.isFinite(e) && e == Math.max(state_actions)).map(([e, i]) => i));
                Is_greedy = 1
            }
            return [action_name, Is_greedy];
        }

        if (this.ACTION_NUMBER == 2) {
            Is_greedy = 0;
            // limit = 0;
            Upper_limit = Math.max(0, rstar2 - state + upperlimit_constant);
            Lower_limit = 0;
            if (Upper_limit == Lower_limit) {
                action_name = 0;
            } else {
                state_actions = q_table[state].map((e, i) => [e, i]).slice(Lower_limit, Upper_limit);
                if (random.uniform() > (1 - eps)) {

                    action_name = random.choice(state_actions.map(([e, i]) => i));
                } else {
                    action_name = random.choice(state_actions.filter(([e, i]) => Number.isFinite(e) && e == Math.max(state_actions)).map(([e, i]) => i));
                    Is_greedy = 1;
                }
            }
            return [action_name, Is_greedy];
        }

        if (this.ACTION_NUMBER == 3) {
            Is_greedy = 0;
            // limit = 0;
            Upper_limit = max(0, r_estimate - state + upperlimit_constant);
            Lower_limit = 0;
            if (Upper_limit == Lower_limit) {
                action_name = 0;
            } else {
                state_actions = q_table[state].map((e, i) => [e, i]).slice(Lower_limit, Upper_limit);
                if (random.uniform() > (1 - eps)) {

                    action_name = random.choice(state_actions.map(([e, i]) => i));
                } else {
                    action_name = random.choice(state_actions.filter(([e, i]) => Number.isFinite(e) && e == Math.max(state_actions)).map(([e, i]) => i));
                    Is_greedy = 1
                }
            }
            return [action_name, Is_greedy];
        }
    }
}