let shortId = require('shortid');

const User = require('../../models/user');

const Auth = require('../../routes/auth/auth');
const ErrorCodes = require('../../configs/errorcodes');
const done = require('../../configs/constants').done;

const register = async function (params) {
    let userName = params["username"], email = params["email"], password = params["password"], role = params["role"];
    try {
        let existing = await User.countDocuments({$or: [{username: userName}, {email: email}], deleted_account: {$ne: true}}).exec();
        if (existing > 0) {
            return done(null, null, ErrorCodes.CODES.USER_ALREADY_EXISTS);
        }
        let user = new User();
        user.user_id = shortId.generate();
        user.username = userName;
        user.email = email;
        user.role = role;
        user.hashPassword(password);
        await user.save();
        user = await User.findOne({_id: user._id})
            .select('-password')
            .exec();
        return done(null, {user}, 0);
    } catch (e) {
        return done(e, null, -1);
    }
}

const login = async function (params) {
    let login = params["login"], password = params["password"];
    try {
        let user = await User.findOne({$or: [{username: login}, {email: login}], deleted_account: {$ne: true}}).exec();
        if (user == null) return done(null, null, ErrorCodes.CODES.USER_NOT_EXISTS);
        //else if (user["deleted_account"]) return done(null, null, ErrorCodes.CODES.USER_ACCOUNT_DELETED);
        else if (!user.isValidPassword(password)) return done(null, null, ErrorCodes.CODES.USER_INCORRECT_PASSWORD);
        let token = Auth.generateToken(user);
        user = await User.findOne({_id: user._id})
            .select('-password')
            .exec();
        return done(null, {user, token}, 0);
    } catch (e) {
        console.log(e);
        return done(e, null, -1);
    }
}

const refreshToken = async function (params) {
    let userId = params["user_id"];
    try {
        let user = await User.find({user_id: userId}).select('user_id').exec();
        let token = null;
        if (user != null && !user["deleted_account"]) {
            token = Auth.generateToken(user);
        }
        return done(null, {token}, 0);
    } catch (e) {
        return done(e, null, -1);
    }
}

const getUser = async function (params) {
    let userId = params["user_id"];
    try {
        let user = await User.findOne({user_id: userId, deleted_account: {$ne: true}})
            .select('-password')
            .exec();
        return done(null, {user}, 0);
    } catch (e) {
        return done(e, null, -1);
    }
}

const updateUser = async function (params) {
    let userId = params["user_id"], field = params["field"], value = params["value"], password = params["password"];
    try {
        let user = await User.findOne({user_id: userId}).exec();
        if (user == null) return done(null, null, ErrorCodes.CODES.USER_NOT_EXISTS);
        if (user["account_deleted"]) return done(null, null, ErrorCodes.CODES.USER_ACCOUNT_DELETED);
        if (!["username", "email"].includes(field))
            return done(null, null, ErrorCodes.CODES.USER_UPDATE_INVALID_FIELD);
        else if (typeof value !== "string")
            return done(null, null, ErrorCodes.CODES.USER_UPDATE_INVALID_VALUE);
        if (field === "username") {
            let existing = await User.countDocuments({_id: {$ne: user._id}, username: value, deleted_account: {$ne: true}}).exec();
            if (existing > 0) return done(null, null, ErrorCodes.CODES.USER_USERNAME_ALREADY_TAKEN);
        }
        else if (field === "email") {
            let existing = await User.countDocuments({_id: {$ne: user._id}, email: value, deleted_account: {$ne: true}}).exec();
            if (existing > 0) return done(null, null, ErrorCodes.CODES.USER_EMAIL_ALREADY_TAKEN);
            if (!password || !user.isValidPassword(password)) return done(null, null, ErrorCodes.CODES.USER_INCORRECT_PASSWORD);
        }
        let update = {};
        update[field] = value;
        user = await User.findOneAndUpdate({_id: user._id}, update, {new: true}).exec();
        user = await User.findOne({_id: user._id})
            .select('-password')
            .exec();
        return done(null, {user}, 0);
    } catch (e) {
        return done(e, null, -1);
    }
}

const updatePassword = async function (params) {
    let userId = params["user_id"], oldPassword = params["old_password"], newPassword = params["new_password"];
    try {
        let user = await User.findOne({user_id: userId}).exec();
        if (user == null) return done(null, null, ErrorCodes.CODES.USER_NOT_EXISTS);
        if (user["account_deleted"]) return done(null, null, ErrorCodes.CODES.USER_INCORRECT_PASSWORD);
        if (!user.isValidPassword(oldPassword)) return done(null, null, ErrorCodes.CODES.USER_INCORRECT_PASSWORD);
        user.hashPassword(newPassword)
        await user.save();
        user = await User.findOne({_id: user._id})
            .select('-password')
            .exec();
        return done(null, {user}, 0);
    } catch (e) {
        return done(e, null, -1);
    }
}

const deleteAccount = async function (params) {
    let userId = params["user_id"];
    try {
        let user = await User.findOne({user_id: userId}).exec();
        if (user == null) return done(null, null, ErrorCodes.CODES.USER_NOT_EXISTS);
        if (user["account_deleted"]) return done(null, null, ErrorCodes.CODES.USER_ACCOUNT_DELETED);
        user.deleted_account = true;
        await user.save();
        user = await User.findOne({_id: user._id})
            .select('-password')
            .exec();
        return done(null, {user}, 0);
    } catch (e) {
        return done(e, null, -1);
    }
}

module.exports = {
    register, login, refreshToken, updateUser, updatePassword, getUser, deleteAccount
}
