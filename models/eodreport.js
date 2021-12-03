const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const EODReportSchema = new Schema({
    report_id: {type: String},
    period_timestamp: {type: String},
    period: {type: String},
    url: {type: String},
    filepath: {type: String},
    filename: {type: String}
});

module.exports = mongoose.model('EODReports', EODReportSchema);
