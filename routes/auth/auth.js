let jwt = require('jsonwebtoken');

const ErrorCodes = require('../../configs/errorcodes');
const Response = require('../../configs/response');

const User = require('../../models/user');

const generateToken = function (user) {
    return jwt.sign({
        exp: Math.floor(Date.now() / 1000) + (30 * 60),
        data: {
            user_id: user.user_id
        }
    }, process.env.TOKEN_SECRET);
};

const verifyAuth = async function (req, res, next) {
    let token = req.headers['x-access-token'];
    if (!token) {
        let response = Response();
        response.error_code = ErrorCodes.CODES.AUTH_TOKEN_NOT_PROVIDED;
        response.auth = false;
        ErrorCodes.ErrorMessage(response);
        return res.status(401).send(response);
    }
    jwt.verify(token, process.env.TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            console.log(err);
            let response = Response();
            response.error_code = ErrorCodes.CODES.AUTH_FAILED;
            response.auth = false;
            ErrorCodes.ErrorMessage(response);
            return res.status(401).send(response);
        } else {
            req.user = decoded.data.user_id;
            next();
        }
    });
};

const verifyAuthAD = async function (req, res, next) {
    let token = req.headers['x-access-token'];
    if (!token) {
        let response = Response();
        response.error_code = ErrorCodes.CODES.AUTH_TOKEN_NOT_PROVIDED;
        response.auth = false;
        ErrorCodes.ErrorMessage(response);
        return res.status(401).send(response);
    }
    jwt.verify(token, process.env.TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            console.log(err);
            let response = Response();
            response.error_code = ErrorCodes.CODES.AUTH_FAILED;
            response.auth = false;
            ErrorCodes.ErrorMessage(response);
            return res.status(401).send(response);
        } else {
            let u = await User.findOne({user_id: decoded.data.user_id}).exec();
            if (u["role"] !== "ADMIN") {
                let response = Response();
                response.error_code = ErrorCodes.CODES.AUTH_UNAUTHORIZED_OPERATION;
                response.auth = false;
                ErrorCodes.ErrorMessage(response);
                return res.status(401).send(response);
            }
            else {
                req.user = decoded.data.user_id;
                next();
            }
        }
    });
};

const verifyAuthSA = async function (req, res, next) {
    let token = req.headers['x-access-token'];
    if (process.env.ADMIN_TOKEN === token) {
        next();
    }
    else {
        return res.status(401).send({message: "Unauthorized"});
    }
};

module.exports = {
    generateToken, verifyAuth, verifyAuthAD, verifyAuthSA
}

