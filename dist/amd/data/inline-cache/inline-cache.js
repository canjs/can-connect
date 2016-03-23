/*can-connect@0.5.0-pre.2#data/inline-cache/inline-cache*/
define(function (require, exports, module) {
    var connect = require('../../can-connect');
    var sortedSetJSON = require('../../helpers/sorted-set-json');
    module.exports = connect.behavior('data-inline-cache', function (baseConnect) {
        if (typeof INLINE_CACHE === 'undefined') {
            return {};
        }
        var getData = function (id) {
            var type = INLINE_CACHE[this.name];
            if (type) {
                var data = type[id];
                if (data) {
                    delete type[id];
                    return data;
                }
            }
        };
        return {
            getListData: function (set) {
                var id = sortedSetJSON(set);
                var data = getData.call(this, id);
                if (data !== undefined) {
                    if (this.cacheConnection) {
                        this.cacheConnection.updateListData(data, set);
                    }
                    return Promise.resolve(data);
                } else {
                    return baseConnect.getListData.apply(this, arguments);
                }
            },
            getData: function (params) {
                var id = this.id(params);
                var data = getData.call(this, id);
                if (data !== undefined) {
                    if (this.cacheConnection) {
                        this.cacheConnection.updateData(data);
                    }
                    return Promise.resolve(data);
                } else {
                    return baseConnect.getData.apply(this, arguments);
                }
            }
        };
        return behavior;
    });
});
//# sourceMappingURL=inline-cache.js.map