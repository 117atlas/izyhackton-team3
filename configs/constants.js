module.exports = {
    done: function (e, data, code, message) {
        return {e: e, data: data, code: code, message: message}
    }
}
