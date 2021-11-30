const CODES = {
    MISSING_PARAMS: 990,
    AUTH_TOKEN_NOT_PROVIDED: 991,
    AUTH_FAILED: 992,
    SERVER_ERROR: 993,
    AUTH_UNAUTHORIZED_OPERATION: 992,
    SUCCESS: 0,

    INVALID_VARIABLE_NAME: 900,
    INVALID_VARIABLE_TYPE: 901,
    INVALID_STABLE_COIN_SYMBOLS: 902,
    INVALID_VARIABLE_VALUE: 903,
    INVALID_EOD_EMAILS: 904,

    USER_ALREADY_EXISTS: 950,
    USER_NOT_EXISTS: 951,
    USER_ACCOUNT_DELETED: 952,
    USER_INCORRECT_PASSWORD: 953,
    USER_UPDATE_INVALID_FIELD: 954,
    USER_UPDATE_INVALID_VALUE: 955,
    USER_USERNAME_ALREADY_TAKEN: 956,
    USER_EMAIL_ALREADY_TAKEN: 957,
}

module.exports = {
    CODES: CODES,
    ErrorMessage: function (r) {
        if (!r.error_message) {
            let errorMsg = "Unknown error";
            for (const errorName of Object.keys(CODES)) {
                if (CODES[errorName] === r.error_code) {
                    errorMsg = errorName.toLowerCase();
                    break;
                }
            }
            r.error_message = errorMsg;
        }
    }
}
