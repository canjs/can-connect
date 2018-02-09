/*can-connect@1.5.17#helpers/clone-data*/
var deepAssign = require('can-util/js/deep-assign/deep-assign');
module.exports = function (data) {
    return Array.isArray(data) ? data.slice(0) : deepAssign({}, data);
};
//# sourceMappingURL=clone-data.js.map