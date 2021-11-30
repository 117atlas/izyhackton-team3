const cleanObject = function (o) {
    if (o.constructor === Object) {
        Object.keys(o).forEach((key) => {
            cleanObject(o[key]);
            delete o[key];
        })
    }
}

module.exports = {
    cleanObject
}
