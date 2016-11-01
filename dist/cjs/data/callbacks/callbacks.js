/*can-connect@1.0.5#data/callbacks/callbacks*/
var connect = require('../../can-connect.js');
var each = require('can-util/js/each/each');
var pairs = {
    getListData: 'gotListData',
    createData: 'createdData',
    updateData: 'updatedData',
    destroyData: 'destroyedData'
};
module.exports = connect.behavior('data/callbacks', function (baseConnect) {
    var behavior = {};
    each(pairs, function (callbackName, name) {
        behavior[name] = function (params, cid) {
            var self = this;
            return baseConnect[name].call(this, params).then(function (data) {
                if (self[callbackName]) {
                    return self[callbackName].call(self, data, params, cid);
                } else {
                    return data;
                }
            });
        };
    });
    return behavior;
});
//# sourceMappingURL=callbacks.js.map