let shortId = require('shortid');

const Constants = require('../../configs/constants');
const AppState = require('../applauncher/appdata');
const Strategy = require('../strategy/strategy');

const State = require('../../models/state');

const DateUtils = require('../dateutils');

const on = async function (user = null) {
    try {
        let currentState = await State.findOne({current: true}).exec();
        if (currentState != null && currentState["state"] === "ON") {
            return Constants.done(null, {state: currentState}, 0);
        }

        await State.updateMany({current: true}, {current: false}, {new: true}).exec();
        let nState = new State();
        nState.state_id = shortId.generate();
        nState.current = false;
        nState.state = AppState.APP_STATE_VALUES.CONNECTING;
        nState.on_date = DateUtils.now();
        nState.off_date = 0;
        await nState.save();

        const SocketIO = require('../socketio/socketio');
        SocketIO.broadcast(SocketIO.MESSAGES.APP_STATE, nState, user);

        let o = await Strategy.StrategyOn(nState.state_id);
        if (o != null && typeof o === "string") {
            return Constants.done(null, null, -1, o);
        }

        if (AppState.APP_STATE == null || AppState.APP_STATE["state"] !== AppState.APP_STATE_VALUES.ON)
            AppState.APP_STATE = nState;

        console.log(AppState.APP_STATE);

        return Constants.done(null, {state: nState}, 0);
    } catch (e) {
        console.log(e);
        return Constants.done(e, null, -1);
    }
}

const off = async function (user = null) {
    try {
        let currentState = await State.findOne({current: true}).exec();
        if (currentState["state"] === "OFF") {
            return Constants.done(null, {state: currentState}, 0);
        }

        await Strategy.StrategyOff();

        let nState = await State.findOneAndUpdate({current: true}, {state: AppState.APP_STATE_VALUES.OFF, off_date: Date.now()}, {new: true}).exec();
        AppState.APP_STATE = nState;

        const SocketIO = require('../socketio/socketio');
        SocketIO.broadcast(SocketIO.MESSAGES.APP_STATE, nState, user);

        return Constants.done(null, {state: nState}, 0);
    } catch (e) {
        return Constants.done(e, null, -1);
    }
}

const restart = async function (user = null) {
    try {
        let currentState = AppState.APP_STATE;
        if (currentState == null) {
            currentState = await State.findOne({current: true}).exec();
        }
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
        nState.on_date = DateUtils.now();
        nState.off_date = 0;
        await nState.save();

        let o = await Strategy.StrategyOn();
        if (o != null && typeof o === "string") {
            return Constants.done(null, null, -1, o);
        }

        if (AppState.APP_STATE == null || AppState.APP_STATE["state"] !== AppState.APP_STATE_VALUES.ON)
            AppState.APP_STATE = nState;

        const SocketIO = require('../socketio/socketio');
        SocketIO.broadcast(SocketIO.MESSAGES.APP_STATE, nState, user);
        SocketIO.broadcast(SocketIO.MESSAGES.APP_RESTARTED, true, user);

        return Constants.done(null, {state: nState}, 0);
    } catch (e) {
        return Constants.done(e, null, -1);
    }
}

const state = async function () {
    let currentState = AppState.APP_STATE;
    if (currentState == null) {
        currentState = await State.findOne({current: true}).exec();
        AppState.APP_STATE = currentState;
    }
    return Constants.done(null, {state: currentState == null ? null : currentState}, 0);
}

const changeObsPeriod = async function (params) {
    if (params["period"] != null)
        await Strategy.ChangeWinnersObsPeriod(params["period"]);
}

module.exports = {
    on, off, restart, state, changeObsPeriod
}
