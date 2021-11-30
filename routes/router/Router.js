
const ErrorCodes = require('../../configs/errorcodes');
const Response = require('../../configs/response');

module.exports = async function (execute, params, eParams = null) {
    let response = Response();
    for (const k in params) {
        if (params.hasOwnProperty(k)){
            if (eParams == null || eParams[k]==null){
                if (params[k] == null || params[k] === undefined) {
                    response.error_code = ErrorCodes.CODES.MISSING_PARAMS;
                    break;
                }
            }
        }
    }
    if (response.error_code === ErrorCodes.CODES.SUCCESS) {
        let exe = await execute(params);
        if (exe["e"] != null) {
            response.error_code = ErrorCodes.CODES.SERVER_ERROR;
            ErrorCodes.ErrorMessage(response);
        }
        else if (exe["code"] !== 0) {
            response.error_code = exe["code"];
            ErrorCodes.ErrorMessage(response);
        }
        else {
            response.error = false;
            let data = exe["data"];
            if (data != null) {
                for (const k in data) {
                    if (data.hasOwnProperty(k)) {
                        response[k] = data[k];
                    }
                }
            }
        }
    }
    return response;
}
