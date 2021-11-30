let express = require('express');
let router = express.Router();

const Socket = require('../modules/binance/socket');

router.get('/socket/connect', async function (req, res, next) {
    Socket.openConnection((err, state)=>{
        if (err) res.status(400).send({error: err.message});
        else res.status(200).send(state);
    });
});

router.get('/socket/close', async function (req, res, next) {
    Socket.closeConnection();
    res.status(200).send('Closed');
});

router.get('/socket/state', async function (req, res, next) {
    let state = Socket.getSocketState();
    res.status(200).send(state.toString());
});

router.get('/socket/data', async function (req, res, next) {
    let data = Socket.getData();
    res.status(200).send(data);
});

router.get('/socket/bt-data', async function (req, res, next) {
    let data = Socket.getBookTickerData();
    res.status(200).send(data);
});

router.get('/socket/sc-data', async function (req, res, next) {
    let data = Socket.getSocketConnectionData();
    console.log(data);
    res.status(200).send(data);
});

module.exports = router;
