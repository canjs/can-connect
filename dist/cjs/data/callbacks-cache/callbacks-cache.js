/*can-connect@0.6.0-pre.6#data/callbacks-cache/callbacks-cache*/
var connect = require('../../can-connect.js');
var assign = require('can-util/js/assign/assign');
var each = require('can-util/js/each/each');
var pairs = {
    createdData: 'createData',
    updatedData: 'updateData',
    destroyedData: 'destroyData'
};
module.exports = connect.behavior('data-callbacks-cache', function (baseConnect) {
    var behavior = {};
    each(pairs, function (cacheCallback, dataCallbackName) {
        behavior[dataCallbackName] = function (data, set, cid) {
            this.cacheConnection[cacheCallback](assign(assign({}, set), data));
            return baseConnect[dataCallbackName].call(this, data, set, cid);
        };
    });
    return behavior;
});
//# sourceMappingURL=callbacks-cache.js.map