/*can-connect@1.5.0-pre.7#helpers/get-items*/
define(function (require, exports, module) {
    var isArray = require('can-util/js/is-array');
    module.exports = function (data) {
        if (isArray(data)) {
            return data;
        } else {
            return data.data;
        }
    };
});
//# sourceMappingURL=get-items.js.map