let shortId = require('shortid');

const Variables = require('../variables/variables');
const DateUtils = require('../dateutils');

const State = require('../../models/state');
const AppState = require('../applauncher/appdata');

const Socket = require('../binance/socket');

const Triplet = require('./triplet');
const Profit = require('./profit');
const Statistics = require('./statistics');

const Trade = require('../../models/trade');
const Order = require('../../models/order');

const SocketIO = require('../socketio/socketio');

let tripletCombUpdaterId = null;
let endOfDayRestartId = null;

const StrategyData = {
    tripletsNb: [],
    tripletsChecked: [],
    tripletsTimes: [],
    mdPairsTimes: {}
};

let Winners = [];
let WinnersObsPeriod = "daily", WinnersObsPeriodReference = 0;
let ProfitObsPeriod = "daily", ProfitObsPeriodReference = 0;

const StrategyUpdateMethod = "second"; //second, real_time

let StrategyTimeOutId = null;
let SecondUpdatesIntervalId = null;

let INITIAL_AMOUNT = 0;

const tripletCombinationUpdater = function (autoProcessVars) {
    tripletCombUpdaterId = setInterval(async () => {
        console.log("Triplet combinaisons update");
        await Triplet.generateCombinations();
    }, autoProcessVars["mdUpdatePeriod"]*60*1000);
    console.log("Triplet combinaisons updater scheduled for every " + autoProcessVars["mdUpdatePeriod"] + " min");
}

const endOfDayScheduler = function (autoProcessVars) {
    if (endOfDayRestartId != null) {
        console.log("Clear old End of Day process scheduler");
        clearTimeout(endOfDayRestartId);
    }
    let delay = 60*1000;
    let thisTime = Date.now();
    let endOfDayTimeOut = DateUtils.endOfDayTime(autoProcessVars["autoResetPeriod"], thisTime, delay);
    endOfDayTimeOut -= delay;
    endOfDayRestartId = setTimeout(async () => {
        console.log("End of day process start");
        await StrategyAutoRestart();
    }, endOfDayTimeOut - thisTime);
    console.log("End of day process scheduled to happen in " + DateUtils.RemainingTime(endOfDayTimeOut - thisTime));
}

const StrategyOn = async function (stateId) {
    await Variables.updateStrategyVariables();
    let val = await Variables.validateStrategyVars();
    console.log(val);
    if (val["error"]) {
        return val["errorMessage"];
    }
    let autoProcessVars = await Variables.getAutoProcessesVariables();
    console.log(autoProcessVars);
    WinnersObsPeriodReference = Date.now();
    Winners = await Trade.find({trade_date: {$gte: DateUtils.StartOfPeriodTime(Date.now(), WinnersObsPeriod)}})
        .populate({path: 'orders'})
        .sort('trade_date trade_num')
        .exec();
    console.log(Winners);
    INITIAL_AMOUNT = (await Variables.getVariable({name: "initialAmount"}))["data"]["initialAmount"];
    console.log(INITIAL_AMOUNT);
    await Triplet.generateCombinations();
    console.log("Triplets generated");
    await Socket.openConnection(async (err, state) => {
        if (err) {
            await State.deleteOne({state_id: stateId}).exec();

            AppState.APP_STATE = await State.findOne({current: true}).exec();

            SocketIO.broadcast(SocketIO.MESSAGES.BINANCE_CONNECTION_ERROR, err.message);
            SocketIO.broadcast(SocketIO.MESSAGES.APP_STATE, AppState.APP_STATE);
        }
        else {
            AppState.APP_STATE = await State.findOneAndUpdate({state_id: stateId}, {current: true, state: state},
                {new: true}).exec();
            tripletCombinationUpdater(autoProcessVars);
            endOfDayScheduler(autoProcessVars);

            SocketIO.broadcast(SocketIO.MESSAGES.BINANCE_CONNECTION_SUCCESS, true);
            SocketIO.broadcast(SocketIO.MESSAGES.APP_STATE, AppState.APP_STATE);

            StrategyStart(true);
        }
    }, async (err) => {
        if (err) {
            AppState.APP_STATE = await State.findOneAndUpdate({state_id: stateId}, {state: AppState.APP_STATE_VALUES.OFF},
                {new: true}).exec();

            await StrategyOff(false);

            SocketIO.broadcast(SocketIO.MESSAGES.BINANCE_CONNECTION_ERROR, err.message);
            SocketIO.broadcast(SocketIO.MESSAGES.APP_STATE, AppState.APP_STATE);
        }
    });
}

const StrategyOff = async function (closeSocketConnection = true) {
    if (tripletCombUpdaterId != null) {
        console.log("Triplet combinaisons update scheduler interruption");
        clearInterval(tripletCombUpdaterId);
        tripletCombUpdaterId = null;
    }
    if (StrategyTimeOutId != null) {
        console.log("Strategy Timeout scheduler interruption");
        clearTimeout(StrategyTimeOutId);
        StrategyTimeOutId = null;
    }
    if (SecondUpdatesIntervalId != null){
        console.log("Second updates interval scheduler interruption");
        clearInterval(SecondUpdatesIntervalId);
        SecondUpdatesIntervalId = null;
    }
    WinnersObsPeriodReference = 0;
    Winners = [];
    if (closeSocketConnection) {
        Socket.closeConnection();
    }
}

const StrategyAutoRestart = async function () {

}

const changeInitialAmount = async function (params) {
    let change = await Variables.changeVariable({name: "initialAmount", new_value: params["new_initial_amount"]});
    if (change.e != null || change.code !== 0) return change;
    INITIAL_AMOUNT = change["data"]["initialAmount"];
    return change;
}


const ChangeWinnersObsPeriod = async function (period) {
    try {
        if (!["hourly", "daily", "monthly", "yearly"].includes(period)) {
            period = "daily";
        }
        if (period !== WinnersObsPeriod) {
            let newRef = Date.now();
            let _winners = await Trade.find({trade_date: {$gte: DateUtils.StartOfPeriodTime(newRef, period)}})
                .populate({path: 'orders'})
                .exec();
            WinnersObsPeriod = period;
            WinnersObsPeriodReference = newRef;
            Winners = _winners;
        }
    } catch (e) {
        console.log("ChangeWinnersObsPeriod error - " + e.message);
        console.error(e);
    }
}

const StrategyStart = function (delay = false) {
    if (AppState.APP_STATE != null && AppState.APP_STATE["state"] === AppState.APP_STATE_VALUES.ON) {
        if (delay) {
            StrategyTimeOutId = setTimeout(()=> {
                console.log("Strategy process go");
                Strategy();
            }, 100);
            console.log("Strategy process scheduled to be happen in 50 ms");
        }
        else {
            StrategyTimeOutId = null;
            setTimeout(()=>{Strategy()}, 0);
        }
        if (StrategyUpdateMethod === "second") {
            if (SecondUpdatesIntervalId == null) {
                SecondUpdatesIntervalId = setInterval(()=>{
                    console.log("Second updates interval go");
                    SecondUpdates().then().catch((e)=>{});
                }, 1000);
                console.log("Second updates interval scheduled to be happen every 1s");
            }
        }
    }
    else {
        if (StrategyTimeOutId != null) {
            console.log("Strategy Timeout scheduler interruption");
            clearTimeout(StrategyTimeOutId);
            StrategyTimeOutId = null;
        }
        if (SecondUpdatesIntervalId != null){
            console.log("Second updates interval scheduler interruption");
            clearInterval(SecondUpdatesIntervalId);
            SecondUpdatesIntervalId = null;
        }
        //StrategyTimeOutId = null;
        //SecondUpdatesIntervalId = null;
        console.log(AppState.APP_STATE != null);
        if (AppState.APP_STATE != null)
            console.log(AppState.APP_STATE["state"] === AppState.APP_STATE_VALUES.ON)
    }
}

const SSS = function () {
    StrategyStart(true);
}

const Strategy = function () {
    Triplet.getTotalCombinations().then(tripletData => {
        let socketData = Socket.getBookTickerData(); //require('../../tests/socketresponse2.json'); //await Socket.getBookTickerData();
        let dataForUi = {};
        if (!tripletData || !tripletData.marketData || !tripletData.triplets || !tripletData.triplets.length) {
            // Send Infos to UI
            StrategyStart(true);
            return;
        }
        if (!socketData["bookTicker"] || Object.keys(socketData["bookTicker"]).length === 0 || !socketData["updatedMdpIds"] || !socketData["updatedMdpIds"].length) {
            // Send Infos to UI
            StrategyStart(true);
            return;
        }
        let start = Date.now();
        Profit(tripletData, socketData["bookTicker"], socketData["updatedMdpIds"], INITIAL_AMOUNT).then(p => {
            console.log("profit calculation - ", (Date.now() - start), " ms");
            if (p == null) {
                // Send Infos to UI
                StrategyStart(true);
                return;
            }
            console.log("profit calculation - ", (Date.now() - start), " ms, ", p["trades"].length,
                " trades and ", p["nBTripletsToCheck"], " triplets checked & ", socketData["updatedMdpIds"].length,
                " updated binance pairs.");
            let trades = p["trades"], mdPairsTimes = p["mdPairsTimes"], nBTripletsToCheck = p["nBTripletsToCheck"];
            INITIAL_AMOUNT = p["initialUsdAmount"];
            Variables.changeVariable({name: "initial_amount", new_value: INITIAL_AMOUNT}).then();
            StrategyData.tripletsNb.push(tripletData.triplets.length);
            StrategyData.tripletsChecked.push(nBTripletsToCheck);
            StrategyData.tripletsTimes.push(trades.length > 0 ? trades.map((t) => t.time).reduce((a, b)=> a+b, 0)/trades.length : 0);
            mdPairsTimes.forEach((elm) => {
                StrategyData.mdPairsTimes[elm.mdp] = StrategyData.mdPairsTimes[elm.mdp] || [];
                StrategyData.mdPairsTimes[elm.mdp].push(elm.time);
            });
            let _trades = trades
                .sort((a, b)=>{
                    if (a["profit"] > b["profit"]) return -1;
                    else if (a["profit"] < b["profit"]) return 1;
                    return 0;
                })
            if (_trades.length > 20) {
                _trades = _trades.slice(0, 20);
            }
            dataForUi.trades = _trades;

            let winners = trades.filter((t)=>t.profit > 1);
            if (winners.length > 0) {
                saveWinners(winners)
                    .then()
                    .catch((e)=>{});
            }
            if (DateUtils.SamePeriod(WinnersObsPeriodReference, Date.now(), WinnersObsPeriod)) {
                Winners = Winners.concat(winners);
                WinnersObsPeriodReference = Date.now();
            } else {
                Winners = [].concat(winners);
            }
            dataForUi.winners = Winners;

            console.log(trades.length + " trades found and " + winners.length + " winners detected");

            //dataForUi.newWinners = winners;
            let end = DateUtils.now();
            dataForUi.strategyTime = end - start;

            require('fs').writeFileSync("./tests/logs/lives_updates_"+Date.now()+".json", JSON.stringify(dataForUi, null, 4));
            console.log("Live (strategy) updates executed");

            SocketIO.broadcast(SocketIO.MESSAGES.STRATEGY, dataForUi);

            StrategyStart(false);
        }).catch((err)=>{
            // Send Infos to UI
            console.log(err.message);
            StrategyStart(true);
        })
    }).catch((err)=>{
        // Send Infos to UI
        StrategyStart(true);
    });

}

const Strategy___OLD = async function () {
    try {
        if (StrategyUpdateMethod === "real_time") {
            let tripletData = await Triplet.getTotalCombinations();
            let socketData = await Socket.getData();
            let dataForUi = {};
            if (!tripletData || !tripletData.marketData || !tripletData.triplets || !tripletData.triplets.length) {
                // Send Infos to UI
                StrategyStart(true);
                return;
            }
            let start = DateUtils.now();
            let p = await Profit(tripletData, socketData["bookTicker"], socketData["updatedMdpIds"], INITIAL_AMOUNT);
            if (p == null) {
                // Send Infos to UI
                StrategyStart(true);
                return;
            }
            let trades = p["trades"], mdPairsTimes = p["mdPairsTimes"], nBTripletsToCheck = p["nBTripletsToCheck"];
            INITIAL_AMOUNT = p["initialUsdAmount"];
            Variables.changeVariable({name: "initial_amount", new_value: INITIAL_AMOUNT}).then();
            dataForUi.tripletsNb = tripletData.triplets.length;
            dataForUi.tripletsChecked = nBTripletsToCheck;
            dataForUi.tripletsTimes = trades.length > 0 ? trades.map((t) => t.time).reduce((a, b)=> a+b, 0)/trades.length : 0;
            dataForUi.msgCount = socketData.msgCount;
            let _trades = trades
                .sort((a, b)=>{
                    if (a["profit"] > b["profit"]) return -1;
                    else if (a["profit"] < b["profit"]) return 1;
                    return 0;
                })
            if (_trades.length > 10) {
                _trades = _trades.slice(0, 10);
            }
            dataForUi.trades = _trades;
            let _mdPairsTimes = mdPairsTimes
                .sort((a, b)=>{
                    if (a["time"] > b["time"]) return -1;
                    else if (a["time"] < b["time"]) return 1;
                    return 0;
                });
            if (_mdPairsTimes.length > 10) {
                let part1 = _mdPairsTimes.slice(0, 9);
                let part2 = _mdPairsTimes.slice(9);
                part2 = part2.reduce((a, b)=>a["time"]+b["time"],0);
                part1 = part1.concat([{mdp: "Others", time: part2}]);
                _mdPairsTimes = part1;
            }
            dataForUi.mdPairsTimesAll = mdPairsTimes;
            dataForUi.mdPairsTimes = _mdPairsTimes;
            let winners = trades.filter((t)=>t.profit > 1);
            if (winners.length > 0) {
                saveWinners(winners)
                    .then()
                    .catch((e)=>{});
            }
            if (DateUtils.SamePeriod(WinnersObsPeriodReference, Date.now(), WinnersObsPeriod)) {
                Winners = Winners.concat(winners);
                WinnersObsPeriodReference = Date.now();
            } else {
                Winners = [].concat(winners);
            }
            dataForUi.winners = Winners;
            dataForUi.winners = Winners;

            let end = DateUtils.now();
            dataForUi.pingLag = socketData["pingLag"];
            dataForUi.strategyTime = end - start;
            dataForUi.toFrontEndTime = Date.now();

            SocketIO.broadcast(SocketIO.MESSAGES.STRATEGY, dataForUi);

            StrategyStart(false);
        }
        else if (StrategyUpdateMethod === "second") {
            let tripletData = await Triplet.getTotalCombinations();
            let socketData = Socket.getBookTickerData(); //require('../../tests/socketresponse2.json'); //await Socket.getBookTickerData();
            let dataForUi = {};
            if (!tripletData || !tripletData.marketData || !tripletData.triplets || !tripletData.triplets.length) {
                // Send Infos to UI
                StrategyStart(true);
                return;
            }
            if (!socketData["bookTicker"] || Object.keys(socketData["bookTicker"]).length === 0 || !socketData["updatedMdpIds"] || !socketData["updatedMdpIds"].length) {
                // Send Infos to UI
                StrategyStart(true);
                return;
            }
            let start = DateUtils.now();
            let p = await Profit(tripletData, socketData["bookTicker"], socketData["updatedMdpIds"], INITIAL_AMOUNT);
            if (p == null) {
                // Send Infos to UI
                StrategyStart(true);
                return;
            }
            let trades = p["trades"], mdPairsTimes = p["mdPairsTimes"], nBTripletsToCheck = p["nBTripletsToCheck"];
            INITIAL_AMOUNT = p["initialUsdAmount"];
            Variables.changeVariable({name: "initial_amount", new_value: INITIAL_AMOUNT}).then();
            StrategyData.tripletsNb.push(tripletData.triplets.length);
            StrategyData.tripletsChecked.push(nBTripletsToCheck);
            StrategyData.tripletsTimes.push(trades.length > 0 ? trades.map((t) => t.time).reduce((a, b)=> a+b, 0)/trades.length : 0);
            mdPairsTimes.forEach((elm) => {
                StrategyData.mdPairsTimes[elm.mdp] = StrategyData.mdPairsTimes[elm.mdp] || [];
                StrategyData.mdPairsTimes[elm.mdp].push(elm.time);
            });
            let _trades = trades
                .sort((a, b)=>{
                    if (a["profit"] > b["profit"]) return -1;
                    else if (a["profit"] < b["profit"]) return 1;
                    return 0;
                })
            if (_trades.length > 20) {
                _trades = _trades.slice(0, 20);
            }
            dataForUi.trades = _trades;

            let winners = trades.filter((t)=>t.profit > 1);
            if (winners.length > 0) {
                saveWinners(winners)
                    .then()
                    .catch((e)=>{});
            }
            if (DateUtils.SamePeriod(WinnersObsPeriodReference, Date.now(), WinnersObsPeriod)) {
                Winners = Winners.concat(winners);
                WinnersObsPeriodReference = Date.now();
            } else {
                Winners = [].concat(winners);
            }
            dataForUi.winners = Winners;

            console.log(trades.length + " trades found and " + winners.length + " winners detected");

            //dataForUi.newWinners = winners;
            let end = DateUtils.now();
            dataForUi.strategyTime = end - start;

            require('fs').writeFileSync("./tests/logs/lives_updates_"+Date.now()+".json", JSON.stringify(dataForUi, null, 4));
            console.log("Live (strategy) updates executed");

            SocketIO.broadcast(SocketIO.MESSAGES.STRATEGY, dataForUi);

            StrategyStart(false);
        }

    } catch (e) {
        // Send Infos to UI
        StrategyStart(true);
    }

}

const SecondUpdates = async function () {
    try {
        let socketData = await Socket.getSocketConnectionData();
        let tripletsNb = StrategyData.tripletsNb, tripletsChecked = StrategyData.tripletsChecked,
            tripletsTimes = StrategyData.tripletsTimes, mdPairsTimes = StrategyData.mdPairsTimes;
        StrategyData.tripletsNb = [];
        StrategyData.tripletsChecked = [];
        StrategyData.tripletsTimes = [];
        StrategyData.mdPairsTimes = {};
        tripletsNb = tripletsNb.length > 0 ? Math.round(tripletsNb.reduce((a, b)=> a + b, 0) / tripletsNb.length) : 0;
        tripletsTimes = tripletsTimes.length > 0 ? Math.round(tripletsTimes.reduce((a, b)=> a + b, 0) / tripletsTimes.length) : 0;
        tripletsChecked = tripletsChecked.length > 0 ? Math.round(tripletsChecked.reduce((a, b)=> a + b, 0) / tripletsChecked.length) : 0;
        mdPairsTimes = Object.keys(mdPairsTimes)
            .map((mdp)=> {
                let time = mdPairsTimes[mdp].length > 0 ? Math.round(mdPairsTimes[mdp].reduce((a, b)=> a + b, 0) / mdPairsTimes[mdp].length) : 0;
                return {mdp, time};
            });
        let _mdPairsTimes = mdPairsTimes
            .sort((a, b)=>{
                if (a["time"] > b["time"]) return -1;
                else if (a["time"] < b["time"]) return 1;
                return 0;
            });
        if (_mdPairsTimes.length > 10) {
            let part1 = _mdPairsTimes.slice(0, 9);
            let part2 = _mdPairsTimes.slice(9);
            part2 = part2.map(x => x["time"]).reduce((a, b)=>a+b,0);
            part1 = part1.concat([{mdp: "Others", time: part2}]);
            _mdPairsTimes = part1;
        }
        let dataForUi = {};
        dataForUi.mdPairsTimesAll = mdPairsTimes;
        dataForUi.mdPairsTimes = _mdPairsTimes;
        dataForUi.tripletsNb = tripletsNb;
        dataForUi.tripletsChecked = tripletsChecked;
        dataForUi.tripletsTimes = tripletsTimes;
        dataForUi.msgCount = socketData.msgCount;
        dataForUi.pingLag = socketData["pingLag"];
        dataForUi.toFrontEndTime = Date.now();
        dataForUi.profitStats = await Statistics.profitStatistics(WinnersObsPeriod, Winners);

        require('fs').writeFileSync("./tests/logs/seconds_updates_"+Date.now()+".json", JSON.stringify(dataForUi, null, 4));
        console.log("Second updates executed");

        // Send data to UI
        SocketIO.broadcast(SocketIO.MESSAGES.SECOND_PERIODIC, dataForUi);
    } catch (e) {

    }
}

const saveWinners = function (winners) {
    return new Promise(async (resolve, reject) => {
        try {
            for (const _winner of winners) {
                let ordersIds = await Order.create(_winner["orders"]);
                ordersIds = ordersIds.map(x => x["_id"]);
                let winner = new Trade();
                winner.trade_id = _winner.trade_id;
                winner.trade_date = _winner.trade_date;
                winner.exchange = _winner.exchange;
                winner.triplet = _winner.triplet;
                winner.time = _winner.time;
                winner.orders = ordersIds;
                winner.initial_amount = _winner.initial_amount;
                winner.final_amount = _winner.final_amount;
                winner.initial_usd_amount = _winner.initial_usd_amount;
                winner.final_usd_amount = _winner.final_usd_amount;
                winner.fees = _winner.fees;
                winner.bnb_fees = _winner.bnb_fees;
                winner.profit = _winner.profit;
                winner.usd_profit = _winner.usd_profit;
                await winner.save();
            }
            resolve(true);
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = {
    StrategyOn, StrategyOff, StrategyStart, changeInitialAmount, Strategy, ChangeWinnersObsPeriod
}
