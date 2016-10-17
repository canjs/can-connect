/*can-connect@0.6.1#helpers/deferred*/
module.exports = function () {
    var def = {};
    def.promise = new Promise(function (resolve, reject) {
        def.resolve = resolve;
        def.reject = reject;
    });
    return def;
};
//# sourceMappingURL=deferred.js.map