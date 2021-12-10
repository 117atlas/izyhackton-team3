let WebSocketClient = require('websocket').client;
let ping = require("ping");

const AppState = require('../applauncher/appdata');

const DateUtils = require('../dateutils');
const Utils = require('../utils');

let clearLogsTickerId = null;
let wsPingId = null;

let wsPingStart = 0;

let force = false;

const SocketData = {
    exchange: 'binance',
    ws: null,
    client: null,
    pingBinanceLags: [],
    bookTicker: {},
    updatedMdpIds: [],
    msgCount: 0,
    lastUpdateDate: 0,
};

const resetSocketData = function (reconnection = false) {
    SocketData["ws"] = null;
    SocketData["client"] = null;
    if (!reconnection) {
        SocketData["pingBinanceLags"] = [];
        Object.keys(SocketData.bookTicker).forEach((key) => delete SocketData.bookTicker[key]);
        //Utils.cleanObject(SocketData.bookTicker);
        SocketData["updatedMdpIds"] = [];
        SocketData.msgCount = 0;
        SocketData.lastUpdateDate = 0;
    }
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
    if (SocketData["ws"] != null && SocketData["ws"].state === 'open') {
        wsPingId = setTimeout(async () => {
            for (let i=0; i<4; i++) {
                const result = await ping.promise.probe('api.binance.com', {});
                //console.log("API Binance com pinged ", result["time"], " ms");
                SocketData.pingBinanceLags = SocketData.pingBinanceLags.concat(result["times"]);
                if (SocketData.pingBinanceLags > 20)
                    SocketData.pingBinanceLags = SocketData.pingBinanceLags.splice(0, SocketData.pingBinanceLags-20);
            }
            wsPing();
        }, 1000);
    }
}

const openConnection = function (callback, notifier, reconnection = false) {
    resetSocketData(reconnection);

    let client = new WebSocketClient();

    client.on('connectFailed', function(error) {
        console.log('Connection to Failed: ' + error.toString());
        if (callback != null) {
            callback(error);
        }
        else {
            closeConnectionAfterFailed();
            notifier(error);
        }
    });

    client.on('connect', function(connection) {
        console.log("Websocket Binance connected - " + new Date().toUTCString());

        SocketData.ws = connection;

        connection.send(JSON.stringify({method: 'SUBSCRIBE', params: ['!bookTicker'], id: 1}));

        connection.on('error', function(error) {
            console.log("Websocket Binance error - " + error.message);
        });

        connection.on('close', function() {
            console.log("Websocket Binance closed - " + new Date().toUTCString());
            if (force) {
                force = false;
            } else {
                openConnection(null, notifier, true);
            }
        });

        connection.on('message', function(message) {
            if (message.type === 'utf8') {
                const data = JSON.parse(message.utf8Data);
                if (data.stream && (data.stream.split('@')[1] === 'bookTicker' || data.stream === '!bookTicker')){
                    //console.log(JSON.stringify(data));
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
                    if (!SocketData.updatedMdpIds.map(x => x["s"]).includes(s)){
                        SocketData.updatedMdpIds.push({s: s, t: Date.now()});
                    }
                }
            }
        });

        connection.on('ping', function (data) {
            console.log("Binance pinged our server");
            connection.pong(new Buffer(""));
        });

        if (callback != null)
            callback(null, AppState.APP_STATE_VALUES.ON);

        wsPing();

    });

    client.connect('wss://stream.binance.com/stream');

    SocketData.client = client;

}

const closeConnection = function () {
    if (SocketData["ws"] != null) {
        force = true;
        SocketData["ws"].close();
    }
    if (wsPingId != null){
        clearInterval(wsPingId);
        wsPingId = null;
    }
    if (clearLogsTickerId != null){
        clearInterval(clearLogsTickerId);
        clearLogsTickerId = null;
    }
    resetSocketData();
}

const closeConnectionAfterFailed = function () {
    if (wsPingId != null){
        clearInterval(wsPingId);
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
    let _umi = SocketData.updatedMdpIds;
    let now = Date.now();
    //console.log("UMI length before = ", _umi.length);
    _umi = _umi.filter(x => x["t"] > now - 1000).map(x => x["s"]);
    //console.log("UMI length after = ", _umi.length);
    let data = {
        bookTicker: SocketData.bookTicker,
        updatedMdpIds: _umi
    };
    SocketData.updatedMdpIds = [];
    return data;
}

const getSocketConnectionData = function () {
    let pingLag = -1;
    if (SocketData.pingBinanceLags.length > 0) {
        pingLag = SocketData.pingBinanceLags.reduce((a, b)=> a + b, 0);
        pingLag = pingLag / (2 * SocketData.pingBinanceLags.length);
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

