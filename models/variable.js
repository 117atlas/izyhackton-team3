const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const VariableSchema = new Schema({
    name: {type: String},
    type: {type: String},
    value: {type: String}
});

module.exports = mongoose.model('Variables', VariableSchema);
