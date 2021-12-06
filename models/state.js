const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const StateSchema = new Schema({
    state_id: {type: String},
    current: {type: Boolean, default: true},
    state: {type: String, enum: ["ON", "OFF", "CONNECTING"]},
    obs_period: {type: String},
    on_date: {type: Number},
    off_date: {type: Number}
});

module.exports = mongoose.model('States', StateSchema);
