let express = require('express');
let router = express.Router();

let Authentication = require('./auth/auth').verifyAuth;
const Router = require('./router/Router');

const Launcher = require('../modules/applauncher/launcher');

router.get('/on', async function(req, res, next) {
    let response = await Router(Launcher.on, {user: req.user}, {user: true});
    res.send(response);
});

router.get('/off', async function(req, res, next) {
    let response = await Router(Launcher.off, {user: req.user}, {user: true});
    res.send(response);
});

router.get('/restart', async function(req, res, next) {
    let response = await Router(Launcher.restart, {user: req.user}, {user: true});
    res.send(response);
});

router.get('/state', async function(req, res, next) {
    let response = await Router(Launcher.state, {});
    res.send(response);
});



module.exports = router;
