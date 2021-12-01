let express = require('express');
let router = express.Router();

let Authentication = require('./auth/auth').verifyAuth;
const Router = require('./router/Router');

const Launcher = require('../modules/applauncher/launcher');

/* GET home page. */
router.get('/intra-day', function(req, res, next) {
    let buffer = require('fs').readFileSync('./module/EOD.xlsx');
    res.send({buffer});
});

router.patch('/observation-period', async function(req, res, next) {
    res.send({error: false, error_code: 0, error_message: null});
    Launcher.changeObsPeriod(req.body["period"]).then();
});

module.exports = router;
