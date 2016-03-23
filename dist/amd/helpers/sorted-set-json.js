/*can-connect@0.5.0-pre.2#helpers/sorted-set-json*/
define(function (require, exports, module) {
    var helpers = require('./helpers');
    var forEach = helpers.forEach;
    var keys = helpers.keys;
    module.exports = function (set) {
        if (set == null) {
            return set;
        } else {
            var sorted = {};
            forEach.call(keys(set).sort(), function (prop) {
                sorted[prop] = set[prop];
            });
            return JSON.stringify(sorted);
        }
    };
});
//# sourceMappingURL=sorted-set-json.js.map