/*can-connect@1.5.3#helpers/overwrite*/
define(function (require, exports, module) {
    module.exports = function (d, s, id) {
        for (var prop in d) {
            if (d.hasOwnProperty(prop) && !prop.startsWith('__') && prop !== id && !(prop in s)) {
                delete d[prop];
            }
        }
        for (prop in s) {
            d[prop] = s[prop];
        }
        return d;
    };
});
//# sourceMappingURL=overwrite.js.map