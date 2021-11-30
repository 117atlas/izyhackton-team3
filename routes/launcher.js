let express = require('express');
let router = express.Router();

let Authentication = require('./auth/auth').verifyAuth;
const Router = require('./router/Router');

const Launcher = require('../modules/applauncher/launcher');

router.get('/on', async function(req, res, next) {
    let response = await Router(Launcher.on, {});
    res.send(response);
});

router.get('/off', async function(req, res, next) {
    let response = await Router(Launcher.off, {});
    res.send(response);
});

router.get('/restart', async function(req, res, next) {
    let response = await Router(Launcher.restart, {});
    res.send(response);
});

module.exports = router;
