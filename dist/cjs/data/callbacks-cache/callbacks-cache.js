/*can-connect@1.5.17#data/callbacks-cache/callbacks-cache*/
var connect = require('../../can-connect.js');
var assign = require('can-util/js/assign/assign');
var each = require('can-util/js/each/each');
var pairs = {
    createdData: 'createData',
    updatedData: 'updateData',
    destroyedData: 'destroyData'
};
var callbackCache = connect.behavior('data/callbacks-cache', function (baseConnection) {
    var behavior = {};
    each(pairs, function (crudMethod, dataCallback) {
        behavior[dataCallback] = function (data, params, cid) {
            this.cacheConnection[crudMethod](assign(assign({}, params), data));
            if (baseConnection[dataCallback]) {
                return baseConnection[dataCallback].call(this, data, params, cid);
            } else {
                return data;
            }
        };
    });
    return behavior;
});
module.exports = callbackCache;
//# sourceMappingURL=callbacks-cache.js.map