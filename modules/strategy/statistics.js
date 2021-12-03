const { getYearEnd, getPreviousYearEnd, getMonthEnd, getPreviousMonthEnd, getMonthStart } = require('@wojtekmaj/date-utils');

const Trade = require('../../models/trade');

const DateUtils = require('../dateutils');

const PERIODS = ["hourly", "daily", "monthly", "yearly"];

const TIMEZONE_OFFSET = -8;

let PROFIT_STATS = {};
const profitStatistics = async (period, Winners = null) => {
    let start = 0, end = 0, step = 0;
    let times = [];
    if (period === "hourly") {
        let now = Date.now() - 3*60*60*1000;
        end = DateUtils.endOfDayTime("1h", now, false);
        start = DateUtils.StartOfPeriodTime(now, "daily");
        step = 60*60*1000;
        let n = (end - start) / step;
        for (let i=0; i<=n; i++) times.push(start + i*step);
    }
    else if (period === "daily") {
        let now = Date.now();
        end = DateUtils.endOfDayTime("1d", now, false);
        start = DateUtils.StartOfPeriodTime(now, "monthly");
        step = 24*60*60*1000;
        let n = (end - start) / step;
        for (let i=0; i<=n; i++) times.push(start + i*step);
    }
    else if (period === "monthly") {
        let time = Date.now();
        end = getMonthEnd(new Date(time - TIMEZONE_OFFSET*60*60*1000));
        end = end.getTime() + 1 + TIMEZONE_OFFSET*60*60*1000;
        start = 0;
        let i = 0;
        times.unshift(end);
        while (i < 100 && start >= 0){
            let s = getPreviousMonthEnd(new Date(time - TIMEZONE_OFFSET*60*60*1000));
            start = s.getTime() + 1 + TIMEZONE_OFFSET*60*60*1000;
            if (start >= 0) {
                times.unshift(start);
                time = s.getTime();
                i++;
            }
        }
    }
    else if (period === "yearly") {
        let time = Date.now();
        end = getYearEnd(new Date(time - TIMEZONE_OFFSET*60*60*1000));
        end = end.getTime() + 1 + TIMEZONE_OFFSET*60*60*1000;
        start = 0;
        let i = 0;
        times.unshift(end);
        while (i < 100 && start >= 0){
            let s = getPreviousYearEnd(new Date(time - TIMEZONE_OFFSET*60*60*1000));
            start = s.getTime() + 1 + TIMEZONE_OFFSET*60*60*1000;
            if (start >= 0) {
                times.unshift(start);
                time = s.getTime();
                i++;
            }
        }
    }
    let profitStats = [];
    for (let i=0; i<times.length-1; i++) {
        let winners = [];
        if (Winners != null) {
            winners = Winners.filter(trade => trade["trade_date"] >= times[i] && trade["trade_date"] < times[i+1]);
        } else {
            winners = await Trade.find({order_date: {$gte: times[i], $lt: times[i+1]}})
                .sort('-order_date')
                .exec();
        }
        if (winners.length > 0) {
            let w = [];
            let oldInitialAmount = 0;
            for (let j=0; j<winners.length; j++) {
                if (oldInitialAmount === 0 || winners[j].final_usd_amount !== oldInitialAmount) {
                    w.push([]);
                }
                w[w.length-1].push(winners[j]);
                oldInitialAmount = winners[j].initial_usd_amount;
            }
            //let finalUsdAmount = w[0][0].final_usd_amount;
            w = w.map((t)=>{
                let final = t[0].final_usd_amount;
                let initial = t[t.length-1].initial_usd_amount;
                let profit = t.map((x)=>x["profit"]).reduce((a, b)=>a+b,0);
                let usdProfit = t.map((x)=>x["usd_profit"]).reduce((a, b)=>a+b,0);
                let bnbFees = t.map((x)=>x["bnb_fees"]).reduce((a, b)=>a+b,0);
                return {final, initial, profit, usdProfit, bnbFees};
            });
            let final = w.map((x)=>x["final"]).reduce((a, b)=>a+b,0);
            let initial = w.map((x)=>x["initial"]).reduce((a, b)=>a+b,0);
            let profit = w.map((x)=>x["profit"]).reduce((a, b)=>a+b,0);
            let usdProfit = w.map((x)=>x["usdProfit"]).reduce((a, b)=>a+b,0);
            let bnbFees = w.map((x)=>x["bnbFees"]).reduce((a, b)=>a+b,0);
            let dateStr = period === "hourly" ? DateUtils.PrintDateTime(times[i], false) : DateUtils.PrintDate(times[i], false);
            profitStats.push({date: dateStr, final, initial, profit, usdProfit, bnbFees, nb_winners: winners.length,
                start: times[i], end: times[i+1]});
        }
        else {
            let dateStr = period === "hourly" ? DateUtils.PrintDateTime(times[i], false) : DateUtils.PrintDate(times[i], false);
            profitStats.push({date: dateStr, final: 0, initial: 0, profit: 0, usdProfit: 0, bnbFees: 0, nb_winners: 0,
                start: times[i], end: times[i+1]});
        }
    }
    return profitStats;
}

const updateProfitStatic = async function (period, winner) {
    let times = [];
    if (PROFIT_STATS != null && Object.keys(PROFIT_STATS).length > 0) {
        for (const key of Object.keys(PROFIT_STATS)) {
            times.push(PROFIT_STATS[key].start);
        }
        times.push(PROFIT_STATS[Object.keys(PROFIT_STATS)[Object.keys(PROFIT_STATS).length-1]]["end"]);
    }
    let key = null;
    if (times.length > 0) {
        let found = false;
        let i = 0;
        while (i < times.length - 1 && !found) {
            if (times[i] <= winner["trade_date"] && winner["trade_date"] < times[i+1]) {
                found = true;
            }
            else {
                i++;
            }
        }
        if (found) {
            key = Object.keys(PROFIT_STATS)[i];
        }
    }
    if (key != null) {
        if (winner["initial_usd_amount"] !== PROFIT_STATS["finalUsdAmount"]) {

        }
        else {
            //PROFIT_STATS[key].
        }
    }
}

module.exports = {
    profitStatistics
}
