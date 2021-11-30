let express = require('express');
let router = express.Router();

let Authentication = require('./auth/auth');
const Router = require('./router/Router');

const Variables = require('../modules/variables/variables');
const Strategy = require('../modules/strategy/strategy');

router.patch('/change-initial-amount', Authentication.verifyAuthAD, async function(req, res, next) {
    let response = await Router(Strategy.changeInitialAmount, {new_initial_amount: req.body.new_initial_amount});
    res.send(response);
});

router.patch('/change/:var_name', Authentication.verifyAuthAD, async function (req, res, next) {
    let response = await Router(Variables.changeVariable, {name: req.params.var_name, new_value: req.body.new_value});
    res.send(response);
});

router.get('/:var_name', Authentication.verifyAuth, async function (req, res, next) {
    let response = await Router(Variables.getVariable, {name: req.params.var_name});
    res.send(response);
});

router.get('/', Authentication.verifyAuth, async function (req, res, next) {
    let response = await Router(Variables.getAllVariables, {});
    res.send(response);
});

module.exports = router;
