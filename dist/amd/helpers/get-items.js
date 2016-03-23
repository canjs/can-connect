/*can-connect@0.5.0-pre.2#helpers/get-items*/
define(function (require, exports, module) {
    var isArray = require('./helpers').isArray;
    module.exports = function (data) {
        if (isArray(data)) {
            return data;
        } else {
            return data.data;
        }
    };
});
//# sourceMappingURL=get-items.js.map