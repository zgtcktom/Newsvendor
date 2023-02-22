import * as tf from '@tensorflow/tfjs';

import { stats, integrate, print, random, range, ndarray, DataFrame, mean, std } from './utils.mjs';

import { RL_brain_kstest } from './Q_LEARNING_kstest.mjs';

console.log(tf.add(tf.tensor([1, 2, 3]), tf.tensor([1, 2, 3])));


let r = 0.2;
console.log(stats.norm(0.8, 1.2).expect(x => x - r - 1, r + 1, Infinity));
console.log(stats.norm(0.8, 1.2).pdf(1000));
console.log(((1.2 * 3 + 0.8) - 0.8) / 1.2);
console.log(stats.norm(0.8, 1.2).ppf(0.6));

console.log(random.choice(10));

console.log(ndarray([1, 2, 3]));

// #Set Demand parameter
let MEAN1 = 10;
let VAR1 = 10;
let MEAN2 = 15;
let VAR2 = 15;
let LEADTIME = 4;
let HOLDING_COST = 1;
let BACKLOG_COST = 20;

//#Set Q learning parameter
let EPSILON = 0.9; //# initial exploration rate 
let ALPHA = 0.6;     //# initial learning rate
let GAMMA = 0.1; //# discount factor
let N_STATES = 121; //#Define the inventory position space
let ACTIONS = 40;//#Define the largerst reorder quantity
let SIMULATION_TIME = 10;//#number of iteration

// #Set action space
// #1 represents uniform action space; 
// #2 represents base stock action space; 
// #3 represents safty stock action space
let ACTION_NUMBER = 3;
let upperlimit_constant = 10;
// # Set learning method

let method = new RL_brain_kstest(MEAN1, VAR1, MEAN2, VAR2, LEADTIME,
    HOLDING_COST, BACKLOG_COST,
    EPSILON, ALPHA, GAMMA,
    N_STATES, ACTIONS, SIMULATION_TIME, ACTION_NUMBER, upperlimit_constant);

let [q_table_1, q_table_2, R_episode, simulation_time, Inv_state, a__, Onhand_state] = method.rl();

// console.log(q_table_1)