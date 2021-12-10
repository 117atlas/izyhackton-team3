const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const TradeSchema = new Schema({
    trade_id: {type: String},
    trade_date: {type: Number},
    trade_num: {type: Number},
    exchange: {type: String},
    triplet: {type: String},
    time: {type: Number},
    orders: [{type: mongoose.Schema.Types.ObjectId, ref: 'Orders'}],
    initial_amount: {type: Number},
    final_amount: {type: Number},
    initial_usd_amount: {type: Number},
    final_usd_amount: {type: Number},
    fees: {type: Number},
    bnb_fees: {type: Number},
    profit: {type: Number},
    usd_profit: {type: Number},
    usd_gross_profit: {type: Number}
});

module.exports = mongoose.model('Trades', TradeSchema);
