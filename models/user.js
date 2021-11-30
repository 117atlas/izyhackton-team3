const mongoose = require('mongoose'),
    Schema = mongoose.Schema;
const bcrypt = require("bcrypt-nodejs");

const UserSchema = new Schema({
    user_id: {type: String},
    email: {type: String},
    username: {type: String},
    password: {type: String},
    role: {type: String, enum: ["ADMIN", "VIEWER"]},
    account_creation_date: {type: Number},
    deleted_account: {type: Boolean, default: false}
});

UserSchema.methods.hashPassword = function (password) {
    let salt =  bcrypt.genSaltSync(8) ;
    this.password = bcrypt.hashSync(password, salt);
};

UserSchema.methods.isValidPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);
