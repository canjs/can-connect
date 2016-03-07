/*can-connect@0.3.5#helpers/get-items*/
var isArray = require('./helpers.js').isArray;
module.exports = function (data) {
    if (isArray(data)) {
        return data;
    } else {
        return data.data;
    }
};
//# sourceMappingURL=get-items.js.map