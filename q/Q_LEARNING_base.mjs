import { stats, integrate, print, random, range, ndarray, DataFrame, mean, std, sum } from './utils.mjs';

import { ActionSpace } from './action_space.mjs';
import { Reorder } from './base_stock.mjs';

function list() {
    return [];
}

function setitem(array, index, value) {
    let i = index[0];
    while (i < 0) {
        i += array.length;
    }
    if (index.length == 1) {
        // console.log('setitem', array, i, array[i], index)
        if (i == undefined) throw 'setitem';
        array[i] = value;
        return;
    }
    // console.log('setitem', array, i, array[i], index)
    setitem(array[i], index.slice(1), value);
}

function getitem(array, index) {
    let i = index[0];

    // console.log(i, array.length);
    while (i < 0) {
        i += array.length;
    }
    if (index.length == 1) {
        // console.log('getitem', array, i, array[i], index)
        if (i == undefined) throw 'getitem';
        return array[i];
    }
    if (array[i] == undefined) throw '';
    // console.log(i, array[i], index)
    return getitem(array[i], index.slice(1));
}

export class RL_brain_base {
    constructor(MEAN1, VAR1, MEAN2, VAR2, LEADTIME, HOLDING_COST, BACKLOG_COST,
        EPSILON, ALPHA, GAMMA,
        N_STATES, ACTIONS, SIMULATION_TIME,
        ACTION_NUMBER, upperlimit_constant) {
        this.MEAN1 = MEAN1
        this.VAR1 = VAR1
        this.MEAN2 = MEAN2
        this.VAR2 = VAR2
        this.LEAD_TIME = LEADTIME
        this.HOLDING_COST = HOLDING_COST
        this.BACKLOG_COST = BACKLOG_COST
        this.EPSILON = EPSILON
        this.ALPHA = ALPHA
        this.GAMMA = GAMMA
        this.N_STATES = N_STATES // the length of the 1 dimensional world
        this.ACTIONS = range(0, ACTIONS)    // available actions
        this.SIMULATION_TIME = SIMULATION_TIME // simulation time
        this.MAX_EPISODES = 364 * 3  // maximum episodes
        this.ACTION_NUMBER = ACTION_NUMBER // 1 represents uniform action space; 2 represents base stock action space; 3 represents safty stock action space
        this.upperlimit_constant = upperlimit_constant
        //the converge method for learning rate ALPHA
    }
    search_then_converge(phi_t, t) {
        let phi_y, y, phi_t_1;
        phi_y = 1 * 10 ** 10 // 1*10^12 decay parameter of exploration/learning rate
        y = t ** 2 / (phi_y + t)
        phi_t_1 = phi_t / (1 + y)

        return phi_t_1
    }

    //the converge method for learning rate ALPHA
    search_then_converge2(phi_t, t) {
        let phi_y, y, phi_t_1;
        phi_y = 1 * 10 ** 10
        y = t ** 2 / (phi_y + t)
        phi_t_1 = phi_t / (1 + y)

        return phi_t_1
    }


    // Initial the shape of q table, need to specify the range of action available
    build_q_table(n_states, actions) {
        let table = DataFrame(
            ndarray([n_states, actions.length], -100),    // # q_table initial values
            actions, range(-30 | 0, (this.N_STATES - 30) | 0) //# actions's name
        );
        // print(table)    // show table
        // console.log('table[0].length', table[0].length, ndarray([n_states, actions.length], -100), n_states, actions.length)
        return table
    }

    // Simulation process
    simulation(S, R, a, episode, LOST) {
        let demand, Co, Cs, Ro, Rs, IL_, lost_, lost, S_, IP_;
        if ((episode <= 182) || (365 <= episode && episode <= (182 * 3 + 1)) || ((365 * 2) <= episode <= (182 * 5 + 1))) {
            demand = Math.max(Math.round(random.normal(this.MEAN1, Math.sqrt(this.VAR1))), 0);
        } else {
            demand = Math.max(Math.round(random.normal(this.MEAN2, Math.sqrt(this.VAR2))), 0);
        }
        Co = -this.HOLDING_COST // cost of holding (According to the paper, it should be the cost of outdating.But for simplification, holding cost is used in this version) 1/2
        Cs = -this.BACKLOG_COST //m cost of backlog cost (assumes a charge per unit time a customer order is not filled)
        Ro = 0
        Rs = 0
        IL_ = 0
        lost_ = LOST
        if (episode >= this.LEAD_TIME - 1) {
            if (S + getitem(a, [-this.LEAD_TIME]) - lost_ >= demand) {// on hand
                S_ = S + a.at(-this.LEAD_TIME) - demand - lost_
                IL_ = S_
                Ro = Co * S_
                lost = 0
            } else {// backlog
                lost = lost_ - a.at(-this.LEAD_TIME) + demand - S
                IL_ = -lost
                Rs = Cs * lost
                S_ = 0
            }
        } else if (episode < this.LEAD_TIME - 1) {
            if (S >= demand) { // on hand
                S_ = S - demand
                Ro = Co * S_
                IL_ = S_
                lost = 0
            } else {// backlog
                lost = lost_ + demand
                IL_ = -lost
                Rs = Cs * lost
                S_ = 0
            }
        }
        // calculate the Inventory position by on hand inventory + backlog + pipeline inventory. and set the lower and upper bound as the absorbing state     
        IP_ = Math.min(Math.max(S_ - lost + sum(a.slice(-(this.LEAD_TIME - 1))), -(30 | 0)), (this.N_STATES - 30 - 1) | 0)
        R = Ro + Rs
        return [S_, IP_, IL_, R, lost, demand]
    }

    // Put the simulation data of each episode to csv file
    // dataset(IP,IL,OO,DEMAND,a,S,lost,R, R_count,i,Q_PREDICT, Q_TARGET, Q_VALUES,count){// Generate a table includes inventory position, reorder quantity , on hand inventory , lost , cost(reward), q values(?)
    //     let delay_reward;
    //     delay_reward = list()
    //     delay_reward= R[this.LEAD_TIME:]
    //     delay_reward.extend([0]*(this.LEAD_TIME))
    //     data = pd.DataFrame({'Inventory position': IP ,'Inventory level':IL, 'On order':OO,'Demand':DEMAND, 'Reorder quantity': a , 'On hand inventory': S, 'backlog': lost, 'Cost':R,'Reward':delay_reward, 
    //                          'Acc cost': R_count , 'Q_PREDICT':Q_PREDICT , "Q_TARGET": Q_TARGET , 'Q_VALUES': Q_VALUES,'days':count})

    //     data.to_csv(filepath, encoding='utf-8', index= False, header=True,mode= 'a')
    //     return data            
    // }



    getSafetyStock(demand) {
        let sigma_demand, SafetyStock, r_estimate;
        sigma_demand = std(demand)
        SafetyStock = 1.28 * sigma_demand * Math.sqrt(this.LEAD_TIME)
        r_estimate = mean(demand) * this.LEAD_TIME + SafetyStock
        return r_estimate
    }






    // The main part of q learning    
    rl() {
        let q_table_1, q_table_2, R_total, R_episode, simulation_time, Inv_state, EPSILON, ALPHA, GAMMA, Is_greedy, count, ActionNumber, rstar1, rstar2, R_count, a;
        let Onhand_state;

        q_table_1 = this.build_q_table(this.N_STATES, this.ACTIONS)
        q_table_2 = this.build_q_table(this.N_STATES, this.ACTIONS)
        R_total = 0
        R_episode = list()
        simulation_time = list()
        Inv_state = list()
        EPSILON = this.EPSILON  // initial exploration rate 
        ALPHA = this.ALPHA      // initial learning rate
        GAMMA = this.GAMMA  // discount factor  
        Is_greedy = 0
        count = 0
        ActionNumber = new ActionSpace(this.ACTION_NUMBER)
        rstar1 = new Reorder(this.MEAN1, this.VAR1, this.LEAD_TIME, this.HOLDING_COST, this.BACKLOG_COST).getBasestock()
        rstar2 = new Reorder(this.MEAN2, this.VAR2, this.LEAD_TIME, this.HOLDING_COST, this.BACKLOG_COST).getBasestock()
        // the outer loop
        for (let i = 0; i < this.SIMULATION_TIME; i++) {
            console.log(`iteration ${i + 1}/${this.SIMULATION_TIME}`)
            let S, s, ip, il, IP, IL, OO, LOST, DEMAND, R_list, Q_PREDICT, Q_TARGET, Q_VALUES, count, R, step_counter, IL_, OO_, count_, lost, Q_values, DEMAND1, DEMAND2, r_estimate;
            S = list()
            // S[:]=[]
            s = random.randint(0, this.N_STATES - 30)
            ip = random.randint(0, this.N_STATES - 30)
            il = random.randint(0, this.N_STATES - 30)
            S.push(s)
            IP = list()
            // IP[:]=[]
            IP.push(ip)
            IL = list()
            // IL[:]=[]
            IL.push(il)
            OO = list()
            // OO[:]=[]
            OO.push(0)
            R_list = list()
            // R_list[:]=[]
            R_list.push(-s)
            LOST = list()
            // LOST[:]=[]
            LOST.push(0)
            DEMAND = list()
            // DEMAND[:]=[]
            DEMAND.push(0)
            Q_PREDICT = list()
            // Q_PREDICT[:] = []
            Q_TARGET = list()
            // Q_TARGET[:] = []
            Q_VALUES = list()
            // Q_VALUES[:]=[]
            Q_PREDICT.push(0)
            Q_TARGET.push(0)
            Q_VALUES.push(0)
            count = list()
            // vcount[:]=[]
            count.push(0)
            R = 0
            a = list()
            a.push(this.MEAN1)
            step_counter = 0
            R_count = 0
            IL_ = 0
            OO_ = 0
            EPSILON = this.search_then_converge(EPSILON, i)
            ALPHA = this.search_then_converge2(ALPHA, i)
            count_ = 0
            lost = 0
            Q_values = 0
            DEMAND1 = []
            DEMAND2 = []
            r_estimate = 0
            // Inner loop
            for (let episode = 0; episode < this.MAX_EPISODES; episode++) {
                // console.log('Q_VALUES', Q_VALUES)
                // console.log('Q_PREDICT', Q_PREDICT)
                // console.log('Q_TARGET', Q_TARGET)
                // console.log('q_table_1', q_table_1)

                let S_, IP_, a_, q_predict, q_target, demand;
                [S_, IP_, IL_, R, lost, demand] = this.simulation(S[episode], R, a, episode, LOST[episode])  // take action & get next state and reward
                OO_ = sum(a.slice(-(this.LEAD_TIME - 1)))


                // senario 1
                if ((episode <= 182) || (365 <= episode && episode <= (182 * 3 + 1)) || ((365 * 2) <= episode && episode <= (182 * 5 + 1))) {

                    DEMAND1.push(demand)
                    r_estimate = this.getSafetyStock(DEMAND1)
                        ;[a_, Is_greedy] = ActionNumber.choose_action1(IP_, q_table_1, EPSILON, r_estimate, rstar1, rstar2, this.upperlimit_constant)
                    if (episode <= this.LEAD_TIME - 1) {
                        R_count = R_count + R
                        Q_VALUES.push(0)
                        Q_PREDICT.push(0)
                        Q_TARGET.push(0)
                    } else if ((episode <= 182 - this.LEAD_TIME) || (365 <= episode && episode <= (182 * 3 + 1) - this.LEAD_TIME) || ((365 * 2) <= episode && episode <= (182 * 5 + 1) - this.LEAD_TIME)) {

                        q_predict = getitem(q_table_1, [getitem(IP, [-this.LEAD_TIME]), getitem(a, [-this.LEAD_TIME])])
                        R_count = R_count + R
                        q_target = R + GAMMA * Math.max(...getitem(q_table_1, [getitem(IP, [-(this.LEAD_TIME - 1)])]))
                        setitem(q_table_1, [getitem(IP, [-this.LEAD_TIME]), getitem(a, [-this.LEAD_TIME])], getitem(q_table_1, [getitem(IP, [-this.LEAD_TIME]), getitem(a, [-this.LEAD_TIME])]) + ALPHA * (q_target - q_predict)) // update
                        Q_values = getitem(q_table_1, [getitem(IP, [-this.LEAD_TIME]), getitem(a, [-this.LEAD_TIME])])
                        Q_VALUES.push(Q_values)
                        Q_PREDICT.push(q_predict)
                        Q_TARGET.push(q_target)
                    } else {
                        Q_VALUES.push(0)
                        Q_PREDICT.push(0)
                        Q_TARGET.push(0)

                        R_count = R_count + R
                    }
                }// senario 2        
                else {
                    // console.log('debug')
                    DEMAND2.push(demand)
                    r_estimate = this.getSafetyStock(DEMAND2)
                        ;[a_, Is_greedy] = ActionNumber.choose_action2(IP_, q_table_2, EPSILON, r_estimate, rstar1, rstar2, this.upperlimit_constant)
                    if (episode <= this.LEAD_TIME - 1) {
                        Q_VALUES.push(0)
                        Q_PREDICT.push(0)
                        Q_TARGET.push(0)
                        R_count = R_count + R

                    } else if ((episode <= 365 - this.LEAD_TIME) || (episode <= 730 - this.LEAD_TIME) || (episode <= 1095 - this.LEAD_TIME)) {
                        q_predict = getitem(q_table_2, [getitem(IP, [-this.LEAD_TIME]), getitem(a, [-this.LEAD_TIME])])
                        R_count = R_count + R
                        q_target = R + GAMMA * Math.max(...getitem(q_table_2, [getitem(IP, [-(this.LEAD_TIME - 1)])]))
                        setitem(q_table_2, [getitem(IP, [-this.LEAD_TIME]), getitem(a, [-this.LEAD_TIME])], getitem(q_table_2, [getitem(IP, [-this.LEAD_TIME]), getitem(a, [-this.LEAD_TIME])]) + ALPHA * (q_target - q_predict)) // update
                        Q_values = getitem(q_table_2, [getitem(IP, [-this.LEAD_TIME]), getitem(a, [-this.LEAD_TIME])])
                        Q_VALUES.push(Q_values)
                        Q_PREDICT.push(q_predict)
                        Q_TARGET.push(q_target)

                    } else if (episode > this.MAX_EPISODES - this.LEAD_TIME) {
                        R_count = R_count + R
                        Q_VALUES.push(0)
                        Q_PREDICT.push(0)
                        Q_TARGET.push(0)
                    }
                }
                count_ = count_ + 1
                // move to next state  and action
                count.push(count_)
                a.push(a_) // list of action
                S.push(S_) // list of onhand inventory
                IP.push(IP_)// list of inventory position
                LOST.push(lost)// list of backlog
                R_list.push(R)// list of immediate reward
                DEMAND.push(demand)// list of demand
                IL.push(IL_)// list of Inventory levvel
                OO.push(OO_)// list of on order(pipeline inventory)

            }
            //         if i >=0:

            //             data = dataset(IP,IL,OO,DEMAND,a,S,LOST,R_list, R_count,i,Q_PREDICT, Q_TARGET, Q_VALUES,count)

            // print out result of the last episode
            if (i == this.SIMULATION_TIME - 1) {
                print('-----------------------------result of the last episode-----------------------------')
                print('Rcount', R_count)
                //             print('EPSILON',EPSILON)
                //             print("action",a)
                //             print("LOST",LOST)
                Onhand_state = S
                Inv_state = IP
            }

            R_episode.push(R_count / this.MAX_EPISODES)// calculate the cost of each simulation time  
            simulation_time.push(i)
        }
        return [q_table_1, q_table_2, R_episode, simulation_time, Inv_state, a, Onhand_state]
    }
}