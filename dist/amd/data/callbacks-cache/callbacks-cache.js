/*can-connect@0.5.0-pre.2#data/callbacks-cache/callbacks-cache*/
define(function (require, exports, module) {
    var connect = require('../../can-connect');
    var idMerge = require('../../helpers/id-merge');
    var helpers = require('../../helpers/helpers');
    var pairs = {
            createdData: 'createData',
            updatedData: 'updateData',
            destroyedData: 'destroyData'
        };
    module.exports = connect.behavior('data-callbacks-cache', function (baseConnect) {
        var behavior = {};
        helpers.each(pairs, function (cacheCallback, dataCallbackName) {
            behavior[dataCallbackName] = function (data, set, cid) {
                this.cacheConnection[cacheCallback](helpers.extend({}, data));
                return baseConnect[dataCallbackName].call(this, data, set, cid);
            };
        });
        return behavior;
    });
});
//# sourceMappingURL=callbacks-cache.js.map