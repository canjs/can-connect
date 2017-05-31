/*can-connect@1.3.11#helpers/clone-data*/
define(function (require, exports, module) {
    var isArray = require('can-util/js/is-array');
    var deepAssign = require('can-util/js/deep-assign');
    module.exports = function (data) {
        return isArray(data) ? data.slice(0) : deepAssign({}, data);
    };
});
//# sourceMappingURL=clone-data.js.map