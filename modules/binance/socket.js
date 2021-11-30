const {WebSocket} = require('ws');

const AppState = require('../applauncher/appdata');

const DateUtils = require('../dateutils');
const Utils = require('../utils');

let clearLogsTickerId = null;
let wsPingId = null;

let wsPingStart = 0;

const SocketData = {
    exchange: 'binance',
    ws: null,
    pingBinanceLags: [],
    bookTicker: {},
    updatedMdpIds: [],
    msgCount: 0,
    lastUpdateDate: 0,
};

const resetSocketData = function () {
    SocketData["ws"] = null;
    SocketData["pingBinanceLags"] = [];
    Object.keys(SocketData.bookTicker).forEach((key) => delete SocketData.bookTicker[key]);
    //Utils.cleanObject(SocketData.bookTicker);
    SocketData["updatedMdpIds"] = [];
    SocketData.msgCount = 0;
    SocketData.lastUpdateDate = 0;
};

const logsTickerClearer = function () {
    /*clearLogsTickerId = setInterval(async () => {
        await __clearLogsTicker();
    }, 1000);*/
}

const __clearLogsTicker = async function () {
    /*let apv = await require('../variables/variables').getAutoProcessesVariables();
    let mdup = apv["mdUpdatePeriod"];
    Object.keys(SocketData.logsTicker).forEach((id) => {
        if (DateUtils.now() > mdup * 60 * 1000 + SocketData.logsTicker[id].lastUpdateDate)
            delete SocketData.logsTicker[id];
    });*/
}

const wsPing = function () {
    if (SocketData["ws"] != null && SocketData["ws"].readyState === WebSocket.OPEN) {
        wsPingId = setTimeout(()=>{
            wsPingStart = Date.now();
            SocketData["ws"].ping(JSON.stringify({u: 42042042, s: "XXXYYY", b: 0, a: 0, B: 0, A: 0}));
        }, 1000);
    }
}

const openConnection = function (callback) {
    resetSocketData();

    let ws = new WebSocket('wss://stream.binance.com/stream');

    ws.on('open', function open() {
        console.log("Websocket Binance connected");
        ws.send(JSON.stringify({method: 'SUBSCRIBE', params: ['!bookTicker'], id: 1}));

        //logsTickerClearer();
        wsPing();

        callback(null, AppState.APP_STATE_VALUES.ON);
    });

    ws.on('message', function message(buffer) {
        let dataStr = Buffer.from(buffer);
        const data = JSON.parse(Buffer.from(dataStr));
        if (data.stream && (data.stream.split('@')[1] === 'bookTicker' || data.stream === '!bookTicker')){
            SocketData.msgCount += 1;
            let {
                u, s, b, a, B, A,
            } = data.data;
            u = parseFloat(u);
            b = parseFloat(b);
            a = parseFloat(a);
            B = parseFloat(B);
            A = parseFloat(A);
            if (!B || !A || !b || !a) {
                delete SocketData.bookTicker[s];
                return;
            }
            SocketData.lastUpdateDate = DateUtils.now();
            if (SocketData.bookTicker[s] && SocketData.bookTicker[s]["u"] && u < SocketData.bookTicker[s]["u"]){
                return;
            }
            SocketData.bookTicker[s] = {
                lastUpdateDate: SocketData.lastUpdateDate,
                u: u,
                bidPrice: b,
                bidQty: B,
                askPrice: a,
                askQty: A,
            };
            if (!SocketData.updatedMdpIds.includes(s)){
                SocketData.updatedMdpIds.push(s);
            }
        }
    });

    ws.on('error', function (err) {
        callback(err);
    });

    ws.on('close', function () {
        console.log("Websocket Binance closed");
    })

    ws.on('ping', function (){
        ws.pong('pong');
    });

    ws.on('pong', function() {
        if (wsPingStart > 1000000) {
            SocketData.pingBinanceLags.push(Date.now() - wsPingStart);
            wsPingStart = 0;
        }
        wsPing();
    })

    SocketData.ws = ws;

}

const closeConnection = function () {
    if (SocketData["ws"] != null) {
        SocketData["ws"].close();
    }
    if (wsPingId != null){
        clearTimeout(wsPingId);
        wsPingId = null;
    }
    if (clearLogsTickerId != null){
        clearInterval(clearLogsTickerId);
        clearLogsTickerId = null;
    }
    resetSocketData();
}

const getSocketState = function () {
    if (SocketData["ws"] != null) {
        return SocketData["ws"].readyState;
    }
    return "CLOSED";
}

const getData = function () {
    let pingLag = -1;
    if (SocketData.pingBinanceLags.length > 0) {
        pingLag = SocketData.pingBinanceLags.reduce((a, b)=> a + b, 0);
        pingLag = pingLag / SocketData.pingBinanceLags.length;
    }
    SocketData.pingBinanceLags = [];
    let data = {
        pingLag: pingLag,
        bookTicker: SocketData.bookTicker,
        updatedMdpIds: SocketData.updatedMdpIds,
        msgCount: SocketData.msgCount
    };
    SocketData.msgCount = 0;
    SocketData.updatedMdpIds = [];
    return data;
}

const getBookTickerData = function () {
    let data = {
        bookTicker: SocketData.bookTicker,
        updatedMdpIds: SocketData.updatedMdpIds
    };
    SocketData.updatedMdpIds = [];
    return data;
}

const getSocketConnectionData = function () {
    let pingLag = -1;
    if (SocketData.pingBinanceLags.length > 0) {
        pingLag = SocketData.pingBinanceLags.reduce((a, b)=> a + b, 0);
        pingLag = pingLag / SocketData.pingBinanceLags.length;
    }
    SocketData.pingBinanceLags = [];
    let data = {
        pingLag: pingLag,
        msgCount: SocketData.msgCount
    };
    SocketData.msgCount = 0;
    return data;
}

module.exports =  {
    openConnection, closeConnection, getSocketState, getData, getBookTickerData, getSocketConnectionData
}

