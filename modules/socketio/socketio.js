let jwt = require('jsonwebtoken');

const ErrorCodes = require('../../configs/errorcodes');
const Response = require('../../configs/response');

const User = require('../../models/user');

let io = null;
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

const init = (server) => {
    let options = {
        path: "izyhackton/socketio",
        serveClient: false,
        pingInterval: 10000,
        pingTimeout: 5000,
        cookie: false
    };

    io = require("socket.io")(server, options);

    io.use(async (socket, next) => {
        let authResponse = await __authentication(socket);
        if (!authResponse.response.auth) {
            console.log(authResponse);
            let e = new Error(authResponse.response.error_message);
            e.data = authResponse.response;
            next(e);
        }
        else {
            socket.handshake.headers["user"] = authResponse.user;
            next();
        }
    });

    io.on("connection", async (socket) => {
        let user = socket.handshake.headers["user"];
        console.log("Socket.io client connected : " + socket.id + " --> User " + user);

        __addClient(user, socket);

        socket.on("disconnect", function () {
            __removeClient(user);
        });

        socket.on("obs-period", function() {

        });

    });
};

const send = (uid, message, data) => {
    let client = __getClient(uid);
    if (client != null) {
        client.emit(message, data);
    }
};

const broadcast = (message, data, exclude = null) => {
    if (exclude != null && typeof exclude === "string")
        exclude = [exclude];
    for (const client of clients) {
        if (exclude == null || !exclude.includes(client.uid))
            client.socket.emit(message, data);
    }
}

module.exports = {
    init: init,
    send: send,
    broadcast: broadcast,
    MESSAGES: MESSAGES
}
