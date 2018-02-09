/*can-connect@1.5.17#data/callbacks/callbacks*/
define([
    'require',
    'exports',
    'module',
    '../../can-connect',
    'can-util/js/each'
], function (require, exports, module) {
    var connect = require('../../can-connect');
    var each = require('can-util/js/each');
    var pairs = {
        getListData: 'gotListData',
        createData: 'createdData',
        updateData: 'updatedData',
        destroyData: 'destroyedData'
    };
    var dataCallbackBehavior = connect.behavior('data/callbacks', function (baseConnection) {
        var behavior = {};
        each(pairs, function (callbackName, name) {
            behavior[name] = function (params, cid) {
                var self = this;
                return baseConnection[name].call(this, params).then(function (data) {
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
    module.exports = dataCallbackBehavior;
});
//# sourceMappingURL=callbacks.js.map