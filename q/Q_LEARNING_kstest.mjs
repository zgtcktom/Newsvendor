import { stats, integrate, print, random, range, ndarray, DataFrame, mean, std, sum } from './utils.mjs';

import { ActionSpace } from './action_space.mjs';
import { Reorder } from './base_stock.mjs';

export class RL_brain_kstest {
    constructor(MEAN1, VAR1, MEAN2, VAR2, LEADTIME, HOLDING_COST, BACKLOG_COST, EPSILON,
        ALPHA, GAMMA, N_STATES, ACTIONS, SIMULATION_TIME, ACTION_NUMBER, upperlimit_constant) {

        this.MEAN1 = MEAN1;
        this.VAR1 = VAR1;
        this.MEAN2 = MEAN2;
        this.VAR2 = VAR2;
        this.LEAD_TIME = LEADTIME;
        this.HOLDING_COST = HOLDING_COST;
        this.BACKLOG_COST = BACKLOG_COST;
        this.EPSILON = EPSILON;
        this.ALPHA = ALPHA;
        this.GAMMA = GAMMA;
        this.N_STATES = N_STATES;// # the length of the 1 dimensional world
        this.ACTIONS = range(0, ACTIONS);//     # available actions
        this.SIMULATION_TIME = SIMULATION_TIME;// #simulation time
        this.MAX_EPISODES = 364 * 3;//  # maximum episodes
        this.ACTION_NUMBER = ACTION_NUMBER;// # 1 represents uniform action space; 2 represents base stock action space; 3 represents safty stock action space
        this.upperlimit_constant = upperlimit_constant;

    }

    search_then_converge(phi_t, t) {
        let phi_y = 1 * 10 ** 10;// #1*10^12 decay parameter of exploration/learning rate
        let y = t ** 2 / (phi_y + t);
        let phi_t_1 = phi_t / (1 + y);

        return phi_t_1;
    }

    search_then_converge2(phi_t, t) {
        let phi_y = 1 * 10 ** 10;
        let y = t ** 2 / (phi_y + t);
        let phi_t_1 = phi_t / (1 + y);

        return phi_t_1;
    }

    build_q_table(n_states, actions) {
        let table = DataFrame(
            ndarray([n_states, actions.length], -100),    // # q_table initial values
            actions, range(-30 | 0, (this.N_STATES - 30) | 0) //# actions's name
        );
        // #print(table)    # show table
        return table;
    }

    simulation(S, R, a, episode, LOST) {
        let demand;
        if ((episode <= 182) || (365 <= episode && episode <= (182 * 3 + 1)) || ((365 * 2) <= episode && episode <= (182 * 5 + 1))) {
            demand = Math.max(Math.round(random.normal(this.MEAN1, Math.sqrt(this.VAR1))), 0);
        } else {
            demand = Math.max(Math.round(random.normal(this.MEAN2, Math.sqrt(this.VAR2))), 0);
        }

        // console.log('demand', demand, this.MEAN1, Math.sqrt(this.VAR1)); throw '';

        let Co = -this.HOLDING_COST;// #cost of holding (According to the paper, it should be the cost of outdating.But for simplification, holding cost is used in this version) 1/2
        let Cs = -this.BACKLOG_COST; //#cost of backlog cost (assumes a charge per unit time a customer order is not filled)
        let Ro = 0;
        let Rs = 0;
        let IL_ = 0;
        let lost_ = LOST;

        let S_, lost;
        if (episode >= this.LEAD_TIME - 1) {
            if (S + a.at(-this.LEAD_TIME) - lost_ >= demand) {
                S_ = S + a.at(-this.LEAD_TIME) - demand - lost_;
                IL_ = S_;
                Ro = Co * S_;
                lost = 0;
            } else {
                lost = lost_ - a.at(-this.LEAD_TIME) + demand - S;
                IL_ = -lost;
                Rs = Cs * lost;
                S_ = 0;
            }
        } else if (episode < this.LEAD_TIME - 1) {
            if (S >= demand) {
                S_ = S - demand;
                Ro = Co * S_;
                IL_ = S_;
                lost = 0;
            } else {
                lost = lost_ + demand;
                IL_ = -lost;
                Rs = Cs * lost;
                S_ = 0;
            }
        }//#calculate the Inventory position by on hand inventory + backlog + pipeline inventory. and set the lower and upper bound as the absorbing state     
        let IP_ = Math.min(Math.max(S_ - lost + sum(a.slice(-(this.LEAD_TIME - 1))), -(30) | 0), (this.N_STATES - 30 - 1) | 0);
        R = Ro + Rs;

        // console.log(a.slice(-(this.LEAD_TIME - 1))); throw '';

        // console.log('IP_', IP_, S_, lost, a, sum(a.slice(-(this.LEAD_TIME - 1))));
        return [S_, IP_, IL_, R, lost, demand];
    }


    // def dataset(this,IP,IL,OO,DEMAND,a,S,lost,R, R_count,i,Q_PREDICT, Q_TARGET, Q_VALUES,count):#Generate a table includes inventory position, reorder quantity , on hand inventory , lost , cost(reward), q values(?)
    //     delay_reward = list()
    //     delay_reward= R[this.LEAD_TIME:]
    //     delay_reward.extend([0]*(this.LEAD_TIME))
    //     data = pd.DataFrame({'Inventory position': IP ,'Inventory level':IL, 'On order':OO,'Demand':DEMAND, 'Reorder quantity': a , 'On hand inventory': S, 'backlog': lost, 'Cost':R,'Reward':delay_reward, 
    //                         'Acc cost': R_count , 'Q_PREDICT':Q_PREDICT , "Q_TARGET": Q_TARGET , 'Q_VALUES': Q_VALUES,'days':count})

    //     data.to_csv(filepath, encoding='utf-8', index= False, header=True,mode= 'a')
    //     return data   

    getSafetyStock(demand) {
        let sigma_demand = std(demand);
        let SafetyStock = 1.28 * sigma_demand * Math.sqrt(this.LEAD_TIME);
        let r_estimate = mean(demand) * this.LEAD_TIME + SafetyStock;
        return r_estimate;
    }

    rl() {
        let q_table_1 = this.build_q_table(this.N_STATES, this.ACTIONS);
        let q_table_2 = this.build_q_table(this.N_STATES, this.ACTIONS);
        let R_total = 0;
        let R_episode = [];
        let simulation_time = [];
        let Inv_state = [];
        let EPSILON = this.EPSILON;  //# initial exploration rate 
        let ALPHA = this.ALPHA;      //# initial learning rate
        let GAMMA = this.GAMMA; // # discount factor  
        let Is_greedy = 0;
        let count = 0;

        let ActionNumber = new ActionSpace(this.ACTION_NUMBER);
        let rstar1 = new Reorder(this.MEAN1, this.VAR1, this.LEAD_TIME, this.HOLDING_COST, this.BACKLOG_COST).getBasestock();
        let rstar2 = new Reorder(this.MEAN2, this.VAR2, this.LEAD_TIME, this.HOLDING_COST, this.BACKLOG_COST).getBasestock();

        // console.log('rstar1, rstar2', rstar1, rstar2);
        let a;
        let Onhand_state;
        // # the outer loop        
        for (let i = 0; i < this.SIMULATION_TIME; i++) {
            let S = []

            let s = random.randint(0, this.N_STATES - 30);
            let ip = random.randint(0, this.N_STATES - 30);
            let il = random.randint(0, this.N_STATES - 30);
            S.push(s);
            let IP = [];
            IP.push(ip);
            let IL = [];
            IL.push(il);
            let OO = [];
            OO.push(0);

            let R_list = [];
            R_list.push(-s);
            let LOST = [];
            LOST.push(0);
            let DEMAND = [];
            DEMAND.push(0);

            let Q_PREDICT = [];
            let Q_TARGET = [];
            let Q_VALUES = [];
            Q_PREDICT.push(0);
            Q_TARGET.push(0);
            Q_VALUES.push(0);

            count = [];
            count.push(0);

            let R = 0;
            a = [];
            a.push(this.MEAN1);
            let step_counter = 0;
            let R_count = 0;
            let IL_ = 0;
            let OO_ = 0;

            EPSILON = this.search_then_converge(EPSILON, i);
            ALPHA = this.search_then_converge2(ALPHA, i);

            console.log('EPSILON, ALPHA', EPSILON, ALPHA)

            let count_ = 0;
            let lost = 0;
            let Q_values = 0;
            let flag = 1;
            let change = 0;
            count = 1;
            let flag_count = 0;
            let kstest_old1 = 1;
            let kstest_old2 = 1;
            let freeze = 0;
            let DEMAND1 = [];
            let DEMAND2 = [];
            let r_estimate = 0;

            let S_, IP_;

            // #Inner loop
            for (let episode = 0; episode < this.MAX_EPISODES; episode++) {
                let a_;
                let demand;
                [S_, IP_, IL_, R, lost, demand] = this.simulation(S[episode], R, a, episode, LOST[episode]); // # take action & get next state and reward
                OO_ = sum(a.slice(-(this.LEAD_TIME - 1)));
                // print(S_, IP_, IL_, R, lost, demand, OO_); throw ''
                // #senario 1
                if (episode >= 40 && episode - freeze > 70) {
                    let demand_test1 = DEMAND.slice(-20);
                    // #                 print(demand_test1)
                    let demand_test2 = DEMAND.slice(-episode + freeze, -30);
                    // #                 print(demand_test2)
                    // #                 print(episode - freeze)
                    let kstest_new = stats.ks_2samp(demand_test1, demand_test2);

                    if (kstest_new[1] <= 0.0001) {
                        console.log(kstest_new[1])
                        //     #             if (kstest_new[1] <= 0.01) and (kstest_old1[1] <= 0.01) and (kstest_old2[1] <= 0.01) and (kstest_old0[1] <= 0.001):
                        // #                     if change == 0:
                        freeze = episode;
                        flag = -flag;
                        change += 1;
                        // #                         print("episode:",episode)
                        // #                     elif episode-freeze > 40: 
                        // #                         freeze = episode-40 
                        // #                         flag= -flag
                        // #                         change +=1 
                        // #     #                     print("episode:",episode)
                        // #     #                     print("Simulation time:",i,"episode:",episode,"  change:",change)
                    }
                    let kstest_old0 = kstest_old1;
                    kstest_old1 = kstest_old2;

                    kstest_old2 = kstest_new;
                }

                // #senario 1
                // #             if (episode <= 182) or ( 365 <= episode <= (182*3+1) ) or ( (365*2)<= episode <= (182*5+1) ):
                if (flag == 1) {
                    flag_count += 1;
                    // #                 print("flag is 1")
                    DEMAND1.push(demand);
                    r_estimate = this.getSafetyStock(DEMAND1);
                    [a_, Is_greedy] = ActionNumber.choose_action1(IP_, q_table_1, EPSILON, r_estimate, rstar1, rstar2, this.upperlimit_constant);
                    if (episode <= this.LEAD_TIME - 1) {
                        R_count = R_count + R
                        Q_VALUES.push(0)
                        Q_PREDICT.push(0)
                        Q_TARGET.push(0)
                        // #                 elif (episode <= 182 - LEAD_TIME) or ( 365 <= episode <= (182*3+1)- LEAD_TIME) or ( (365*2)<= episode <= (182*5+1) - LEAD_TIME):    
                    } else if (episode - freeze >= this.LEAD_TIME) {
                        // #                     print("episode:",episode)

                        let q_predict = q_table_1.at(IP.at(-this.LEAD_TIME)).at(a.at(-this.LEAD_TIME));
                        R_count = R_count + R;
                        // console.log('q_table_1[IP.at(-(this.LEAD_TIME - 1))]', q_table_1[IP.at(-(this.LEAD_TIME - 1))], IP.at(-(this.LEAD_TIME - 1)))
                        let q_target = R + GAMMA * Math.max(...q_table_1.at(IP.at(-(this.LEAD_TIME - 1))));
                        q_table_1.at(IP.at(-this.LEAD_TIME))[a.at(-this.LEAD_TIME) < 0 ? q_table_1.at(IP.at(-this.LEAD_TIME)).length + a.at(-this.LEAD_TIME) : a.at(-this.LEAD_TIME)] = q_table_1.at(IP.at(-this.LEAD_TIME)).at(a.at(-this.LEAD_TIME)) + ALPHA * (q_target - q_predict); //# update
                        Q_values = q_table_1.at(IP.at(-this.LEAD_TIME)).at(a.at(-this.LEAD_TIME));
                        Q_VALUES.push(Q_values);
                        Q_PREDICT.push(q_predict);
                        Q_TARGET.push(q_target);

                    } else {
                        Q_VALUES.push(0);
                        Q_PREDICT.push(0);
                        Q_TARGET.push(0);
                    }
                }
                // #                     R_count = R_count +R
                // #senario 2        
                else {
                    // #                 print("flag is -1")
                    DEMAND2.push(demand);
                    r_estimate = this.getSafetyStock(DEMAND2);
                    [a_, Is_greedy] = ActionNumber.choose_action2(IP_, q_table_2, EPSILON, r_estimate, rstar1, rstar2, this.upperlimit_constant);
                    if (episode <= this.LEAD_TIME - 1) {
                        Q_VALUES.push(0);
                        Q_PREDICT.push(0);
                        Q_TARGET.push(0);
                        R_count = R_count + R;

                    } else if (episode - freeze >= this.LEAD_TIME) {
                        // #                 else:
                        let q_predict = q_table_2.at(IP.at(-this.LEAD_TIME)).at(a.at(-this.LEAD_TIME));
                        R_count = R_count + R;
                        let q_target = R + GAMMA * Math.max(...q_table_2.at(IP.at(-(this.LEAD_TIME - 1))));
                        // console.log(a.at(-this.LEAD_TIME) < 0 ? q_table_2.at(IP.at(-this.LEAD_TIME)).length + a.at(-this.LEAD_TIME) : a.at(-this.LEAD_TIME))
                        q_table_2.at(IP.at(-this.LEAD_TIME))[a.at(-this.LEAD_TIME) < 0 ? q_table_2.at(IP.at(-this.LEAD_TIME)).length + a.at(-this.LEAD_TIME) : a.at(-this.LEAD_TIME)] = q_table_2.at(IP.at(-this.LEAD_TIME)).at(a.at(-this.LEAD_TIME)) + ALPHA * (q_target - q_predict); // # update
                        Q_values = q_table_2.at(IP.at(-this.LEAD_TIME)).at(a.at(-this.LEAD_TIME));
                        Q_VALUES.push(Q_values);
                        Q_PREDICT.push(q_predict);
                        Q_TARGET.push(q_target);
                        // #                     if(episode <= 182 - LEAD_TIME) or ( 365 <= episode <= (182*3+1)- LEAD_TIME) or ( (365*2)<= episode <= (182*5+1) - LEAD_TIME):
                        // #                         count +=1
                        // #                         print(episode)
                        // #                         print("false:",count)                    
                    } else {
                        R_count = R_count + R;
                        Q_VALUES.push(0);
                        Q_PREDICT.push(0);
                        Q_TARGET.push(0);
                    }
                }
                // # move to next state  and action
                // console.log('a_', a_);
                a.push(a_);  // #list of action
                S.push(S_);  // #list of onhand inventory
                IP.push(IP_);  //#list of inventory position
                LOST.push(lost);  //#list of backlog
                R_list.push(R);  //#list of immediate reward
                DEMAND.push(demand);  //#list of demand
                IL.push(IL_);  //#list of Inventory levvel
                OO.push(OO_);  //#list of on order(pipeline inventory)

                // #         if i >=0:

                // #             data = dataset(IP,IL,OO,DEMAND,a,S,LOST,R_list, R_count,i,Q_PREDICT, Q_TARGET, Q_VALUES,count)

            }
            // #print out result of the last episode
            if (i == this.SIMULATION_TIME - 1) {
                print('-----------------------------result of the last episode-----------------------------')
                print('Rcount', R_count)
                // #             print('EPSILON',EPSILON)
                // #             print("action",a)
                // #             print("LOST",LOST)
                Onhand_state = S;
                Inv_state = IP;
            }
            R_episode.push(R_count / this.MAX_EPISODES); //#calculate the cost of each simulation time  
            simulation_time.push(i);
        }
        return [q_table_1, q_table_2, R_episode, simulation_time, Inv_state, a, Onhand_state];
    }
}