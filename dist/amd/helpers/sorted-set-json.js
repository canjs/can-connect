/*can-connect@0.2.7#helpers/sorted-set-json*/
define(function (require, exports, module) {
    module.exports = function (set) {
        if (set == null) {
            return set;
        } else {
            var sorted = {};
            Object.keys(set).sort().forEach(function (prop) {
                sorted[prop] = set[prop];
            });
            return JSON.stringify(sorted);
        }
    };
});
//# sourceMappingURL=sorted-set-json.js.map