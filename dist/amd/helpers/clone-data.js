/*can-connect@1.5.15#helpers/clone-data*/
define(function (require, exports, module) {
    var deepAssign = require('can-util/js/deep-assign');
    module.exports = function (data) {
        return Array.isArray(data) ? data.slice(0) : deepAssign({}, data);
    };
});
//# sourceMappingURL=clone-data.js.map