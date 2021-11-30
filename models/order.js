const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const OrderSchema = new Schema({
    order_id: {type: String},
    pair: {type: String},
    side: {type: String},
    amount: {type: Number},
    price: {type: Number},
    fees_percentage: {type: Number},
    fees_pair_base: {type: Number},
    fees_triplet_base: {type: Number},
    total: {type: String},
    link: {type: String},
    order_date: {type: Number}
});

module.exports = mongoose.model('Orders', OrderSchema);
