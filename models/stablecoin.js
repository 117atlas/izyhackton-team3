const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const StableCoinSchema = new Schema({
    symbols: {type: String},
    logo: {type: String}
});

module.exports = mongoose.model('StableCoins', StableCoinSchema);
