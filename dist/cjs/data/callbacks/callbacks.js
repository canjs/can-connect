/*can-connect@0.5.0-pre.2#data/callbacks/callbacks*/
var connect = require('../../can-connect.js');
var helpers = require('../../helpers/helpers.js');
var pairs = {
        getListData: 'gotListData',
        createData: 'createdData',
        updateData: 'updatedData',
        destroyData: 'destroyedData'
    };
var returnArg = function (item) {
    return item;
};
module.exports = connect.behavior('data-callbacks', function (baseConnect) {
    var behavior = {};
    helpers.each(pairs, function (callbackName, name) {
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