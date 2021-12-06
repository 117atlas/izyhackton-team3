let shortId = require('shortid');

const Constants = require('../../configs/constants');
const AppState = require('../applauncher/appdata');
const Strategy = require('../strategy/strategy');

const State = require('../../models/state');

const DateUtils = require('../dateutils');

const SocketIO = require('../socketio/websocket');

const on = async function (user = null, callback) {
    try {
        let currentState = await State.findOne({current: true}).exec();
        if (currentState != null && currentState["state"] === "ON") {
            if (callback == null) {
                return Constants.done(null, {state: currentState}, 0);
            }
            else {
                callback({state: currentState}, true);
                return;
            }
        }

        await State.deleteMany({state: "CONNECTING"}).exec();
        await State.updateMany({current: true}, {current: false}, {new: true}).exec();

        let nState = new State();
        nState.state_id = shortId.generate();
        nState.current = false;
        nState.state = AppState.APP_STATE_VALUES.CONNECTING;
        nState.obs_period = "daily";
        nState.on_date = DateUtils.now();
        nState.off_date = 0;
        await nState.save();

        const SocketIO = require('../socketio/socketio');
        SocketIO.broadcast(SocketIO.MESSAGES.APP_STATE, nState, user);

        let o = await Strategy.StrategyOn(nState.state_id);
        if (o != null && typeof o === "string") {
            await State.deleteOne({state_id: nState.state_id}).exec();
            if (callback == null) {
                return Constants.done(null, null, -1, o);
            }
            else {
                callback(null, true, o);
                return;
            }
        }

        if (AppState.APP_STATE == null || AppState.APP_STATE["state"] !== AppState.APP_STATE_VALUES.ON)
            AppState.APP_STATE = nState;

        if (callback == null) {
            const SocketIO = require('../socketio/socketio');
            SocketIO.broadcast(SocketIO.MESSAGES.APP_STATE, nState, user);
            return Constants.done(null, {state: nState}, 0);
        } else {
            callback({state: nState}, true);
        }
    } catch (e) {
        console.log(e);
        if (callback == null) {
            return Constants.done(e, null, -1);
        } else {
            callback(null, true, -1);
        }
    }
}

const off = async function (user = null, callback) {
    try {
        let currentState = await State.findOne({current: true}).exec();
        if (currentState["state"] === "OFF") {
            if (callback == null) {
                return Constants.done(null, {state: currentState}, 0);
            }
            else {
                callback({state: currentState}, true);
                return;
            }
        }

        await Strategy.StrategyOff();

        let nState = await State.findOneAndUpdate({current: true}, {state: AppState.APP_STATE_VALUES.OFF, off_date: Date.now()}, {new: true}).exec();
        AppState.APP_STATE = nState;

        if (callback == null) {
            const SocketIO = require('../socketio/socketio');
            SocketIO.broadcast(SocketIO.MESSAGES.APP_STATE, nState, user);
            return Constants.done(null, {state: nState}, 0);
        } else {
            callback({state: nState}, true);
        }
    } catch (e) {
        if (callback == null) {
            return Constants.done(e, null, -1);
        } else {
            callback(null, true, -1);
        }
    }
}

const restart = async function (user = null, callback) {
    try {
        let currentState = AppState.APP_STATE;
        if (currentState == null) {
            currentState = await State.findOne({current: true}).exec();
        }
        await State.deleteMany({state: "CONNECTING"}).exec();
        if (currentState["state"] !== AppState.APP_STATE_VALUES.OFF) {
            await Strategy.StrategyOff();
            currentState["state"] = AppState.APP_STATE_VALUES.OFF;
            currentState["off_date"] = DateUtils.now();
            await currentState.save();
            AppState.APP_STATE = currentState;
        }

        await State.updateMany({current: true}, {current: false}, {new: true}).exec();
        let nState = new State();
        nState.state_id = shortId.generate();
        nState.current = false;
        nState.state = AppState.APP_STATE_VALUES.CONNECTING;
        nState.obs_period = "daily";
        nState.on_date = DateUtils.now();
        nState.off_date = 0;
        await nState.save();

        let o = await Strategy.StrategyOn(nState.state_id);
        if (o != null && typeof o === "string") {
            await State.deleteOne({state_id: nState.state_id}).exec();
            if (callback == null) {
                return Constants.done(null, null, -1, o);
            }
            else {
                callback(null, true, o);
                return;
            }
        }

        if (AppState.APP_STATE == null || AppState.APP_STATE["state"] !== AppState.APP_STATE_VALUES.ON)
            AppState.APP_STATE = nState;

        if (callback == null) {
            const SocketIO = require('../socketio/socketio');
            SocketIO.broadcast(SocketIO.MESSAGES.APP_STATE, nState, user);
            SocketIO.broadcast(SocketIO.MESSAGES.APP_RESTARTED, true, user);
            return Constants.done(null, {state: nState}, 0);
        } else {
            callback({state: nState}, true);
        }
    } catch (e) {
        if (callback == null) {
            return Constants.done(e, null, -1);
        } else {
            callback(null, true, -1);
        }
    }
}

const autoRestart =  function () {
    Strategy.StrategyAutoRestart().then();
}

const state = async function (callback = null) {
    try {
        let currentState = AppState.APP_STATE;
        if (currentState == null) {
            currentState = await State.findOne({current: true}).exec();
            if (currentState == null) {
                currentState = await State.findOne({}).sort('-on_date').exec();
                if (currentState != null) {
                    currentState.current = true;
                    await currentState.save();
                }
            }
            AppState.APP_STATE = currentState;
        }
        if (callback == null) {
            return Constants.done(null, {state: currentState == null ? null : currentState}, 0);
        } else {
            callback({state: currentState == null ? null : currentState}, false);
        }
    } catch (e) {
        if (callback == null) {
            return Constants.done(e, null, -1);
        } else {
            callback(null, true, -1);
        }
    }
}

const intraDay = async function () {
    try {
        let itd = await Strategy.IntraDayFile();
        return Constants.done(null, itd, 0);
    } catch (e) {
        return Constants.done(e, null, -1);
    }
}

const EndOfDay = async function (reportId) {
    try {
        let eod = await Strategy.EndOfDayFile(reportId);
        return Constants.done(null, eod, 0);
    } catch (e) {
        return Constants.done(e, null, -1);
    }
}

const changeObsPeriod = async function (params, callback) {
    try {
        let user = params["user_id"];
        let state = await Strategy.ChangeWinnersObsPeriod(params["period"]);
        if (callback == null) {
            const SocketIO = require('../socketio/socketio');
            SocketIO.broadcast(SocketIO.MESSAGES.APP_STATE, state, user);
            return Constants.done(null, {state: state}, 0);
        } else {
            callback({state: state}, true);
        }
    } catch (e) {
        if (callback == null) {
            return Constants.done(e, null, -1);
        } else {
            callback(null, true, -1);
        }
    }
}

module.exports = {
    on, off, restart, state, changeObsPeriod, autoRestart,intraDay, EndOfDay
}
