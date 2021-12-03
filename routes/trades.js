let express = require('express');
let router = express.Router();

let Authentication = require('./auth/auth').verifyAuth;
const Router = require('./router/Router');

const ErrorCodes = require('../configs/errorcodes');
const Response = require('../configs/response');

const Launcher = require('../modules/applauncher/launcher');

/* GET home page. */
router.get('/intra-day', async function(req, res, next) {
    /*let response = await Router(Launcher.intraDay, {}, {});
    res.send(response);*/
    let response = Response();
    let itd = await Launcher.intraDay();
    if (itd.e) response.error_code = ErrorCodes.CODES.SERVER_ERROR;
    else if (itd.code !== 0) {
        if (itd.code < 0) response.error_message = itd.message;
        else response.error_code = itd.code;
    }
    else if (itd.data === null) {
        response.error = false;
    }
    else {
        res.set({
            "Content-Length": Buffer.byteLength(itd.data.buffer),
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": "attachment; filename=" + itd.data.filename
        });
        res.status(200).send(itd.data.buffer);
    }
});

router.get('/end-of-day/:period/:id', async function (req, res, next) {
    let reportId = req.params.id;
    let response = Response();
    if (reportId == null) {
        response.error_code = ErrorCodes.CODES.MISSING_PARAMS;
    } else {
        let eod = await Launcher.EndOfDay(reportId);
        if (eod.e) response.error_code = ErrorCodes.CODES.SERVER_ERROR;
        else if (eod.code !== 0) {
            if (eod.code < 0) response.error_message = eod.message;
            else response.error_code = eod.code;
        }
        else if (eod.data === null) {
            response.error = false;
        }
        else {
            res.set({
                "Content-Length": Buffer.byteLength(eod.data.buffer),
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": "attachment; filename=" + eod.data.filename
            });
            res.status(200).send(eod.data.buffer);
        }
    }
});

router.patch('/observation-period', async function(req, res, next) {
    res.send({error: false, error_code: 0, error_message: null});
    Launcher.changeObsPeriod(req.body["period"]).then();
});

module.exports = router;
