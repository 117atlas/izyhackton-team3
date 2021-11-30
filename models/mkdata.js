const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const MarketDataSchema = new Schema({
    exchange: {type: Number},
    pair_id: {type: String},
    name: {type: String},
    precision: {
        base: {type: Number},
        quote: {type: Number},
        amount: {type: Number},
        price: {type: Number},
    },
    fee_side: {type: String},
    base: {type: String},
    quote: {type: String},
    default_values: {
        last_update: {type: Number},
        bid_price: {type: Number},
        bid_qty: {type: Number},
        ask_price: {type: Number},
        ask_qty: {type: Number}
    },
    taker_fee: {type: Number},
    maker_fee: {type: Number},
    active: {type: Boolean},
    spot: {type: Boolean}
});

module.exports = mongoose.model('MarketData', MarketDataSchema);
