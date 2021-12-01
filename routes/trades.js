let express = require('express');
let router = express.Router();

/* GET home page. */
router.get('/intra-day', function(req, res, next) {
    let buffer = require('fs').readFileSync('./module/EOD.xlsx');
    res.send({buffer});
});

module.exports = router;
