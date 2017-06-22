/*can-connect@1.5.0-pre.5#helpers/clone-data*/
var isArray = require('can-util/js/is-array/is-array');
var deepAssign = require('can-util/js/deep-assign/deep-assign');
module.exports = function (data) {
    return isArray(data) ? data.slice(0) : deepAssign({}, data);
};
//# sourceMappingURL=clone-data.js.map