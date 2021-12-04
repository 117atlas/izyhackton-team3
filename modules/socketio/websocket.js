let jwt = require('jsonwebtoken');

const WebSocketServer = require('websocket').server;

const ErrorCodes = require('../../configs/errorcodes');
const Response = require('../../configs/response');

const User = require('../../models/user');

let websocketServer = null;
let clients = [];

const MESSAGES = {
    SECOND_PERIODIC: 'second-lives-updates',
    STRATEGY: 'trades-lives-updates',
    BINANCE_CONNECTION_ERROR: 'binance-connection-error',
    BINANCE_CONNECTION_SUCCESS: 'binance-connection-success',
    APP_STATE: 'app-state',
    APP_RESTARTED: 'app-restarted'
}

const __authentication = (socket) => {
    return new Promise(async (resolve, reject) => {
        let headers = socket.handshake.headers;
        let token = headers["x-access-token"];
        let response = Response();
        if (!token) {
            response.error_code = ErrorCodes.CODES.AUTH_TOKEN_NOT_PROVIDED;
            response.auth = false;
            ErrorCodes.ErrorMessage(response);
            resolve({response});
        }
        jwt.verify(token, process.env.TOKEN_SECRET, async (err, decoded) => {
            if (err) {
                console.log("Socket connection err");
                console.log(err);
                response.error_code = ErrorCodes.CODES.AUTH_FAILED;
                response.auth = false;
                ErrorCodes.ErrorMessage(response);
                reject(err);
            } else {
                response.auth = true;
                resolve({response, user: decoded.data.user_id});
            }
        });
    })
};

const __addClient = (uid, socket) => {
    let i = -1, j = 0;
    if (clients==null) clients = [];
    for (const client of clients){
        if (client.uid === uid) {
            i = j;
            break;
        }
        else{
            j++;
        }
    }
    if (i>=0){
        clients[i].socket = socket;
    }
    else{
        clients.push({uid: uid, socket: socket});
    }
};

const __removeClient = (uid) => {
    if (clients!=null){
        let i=-1, j=0;
        for (const client of clients){
            if (client.uid === uid){
                i=j;
                break;
            }
            else{
                j++;
            }
        }
        if (i>=0){
            clients.splice(i, 1);
        }
    }
};

const __getClient = (uid) => {
    let socket = null;
    if (clients!=null){
        for (const client of clients){
            if (client.uid === uid){
                socket = client.socket;
                break;
            }
        }
    }
    return socket;
};

const __disconnectClient = (uid, socket) => {
    __removeClient(uid);
    console.log("Disconnected : " + socket.id)
    socket.disconnect(true);
};

const __sendData = (uid) => {
    setTimeout(()=>{
        let client = __getClient(uid);
        if (client != null && client.state === 'open') {
            client.sendUTF(JSON.stringify({message: 'message'}));
            //__sendData(uid);
        }
    }, 2000);
}

const init = (server) => {
    websocketServer = new WebSocketServer({
        httpServer: server,
        autoAcceptConnections: false
    });

    function originIsAllowed(origin) {
        // put logic here to detect whether the specified origin is allowed.
        //return origin === 'izyhackton-team-3';
        return true;
    }

    function dexwwwfurlenc(urljson){
        let dstjson = {};
        let ret;
        let reg = /(?:^|&)(\w+)=(\w+)/g;
        while((ret = reg.exec(urljson)) !== null){
            dstjson[ret[1]] = ret[2];
        }
        return dstjson;
    }

    function auth(request) {
        let resource = request.resource;
        let params = resource.substring(resource.lastIndexOf("?")+1);
        console.log(params);
        params = dexwwwfurlenc(params);
        console.log(params);
        let userId = params["userid"];
        let timestamp = params["timestamp"];
        let _sign = params["sign"];
        //console.log({userId, timestamp, _sign});
        let token = process.env.TOKEN_SECRET;
        let s = userId + "$" + timestamp + "$" + token;
        let sign = require('js-sha1')(s);
        return sign === _sign;
    }

    websocketServer.on("request", (request) => {
        /*if (!originIsAllowed(request.origin)) {
            request.reject();
            console.log('Connection from origin ' + request.origin + ' rejected.');
            return;
        }*/
        if(!auth(request)) {
            request.reject();
            console.log('Connection from origin ' + request.origin + ' rejected. Auth failed');
            return;
        }

        let connection = request.accept('echo-protocol', request.origin);
        let userId = request.httpRequest.headers["userid"];
        console.log('Connection accepted.' + (userId == null ? "": userId));

        __addClient(userId, connection);

        connection.on('message', function(message) {
            /*if (message.type === 'utf8') {
                console.log('Received Message: ' + message.utf8Data);
                connection.sendUTF(message.utf8Data);
            }
            else if (message.type === 'binary') {
                console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
                connection.sendBytes(message.binaryData);
            }*/
        });

        connection.on('close', function(reasonCode, description) {
            __removeClient(userId);
        });

        __sendData(userId);
    });

};

const send = (uid, message, data) => {
    let client = __getClient(uid);
    if (client != null) {
        client.sendUTF(JSON.stringify(message, data));
    }
};

const broadcast = (message, data, exclude = null) => {
    if (exclude != null && typeof exclude === "string")
        exclude = [exclude];
    for (const client of clients) {
        if (exclude == null || !exclude.includes(client.uid))
            client.sendUTF(JSON.stringify(message, data));
    }
}

module.exports = {
    init: init,
    send: send,
    broadcast: broadcast,
    MESSAGES: MESSAGES
}
