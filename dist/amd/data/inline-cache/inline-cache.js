/*can-connect@0.6.0-pre.10#data/inline-cache/inline-cache*/
define(function (require, exports, module) {
    (function (global) {
        var connect = require('../../can-connect');
        var sortedSetJSON = require('../../helpers/sorted-set-json');
        module.exports = connect.behavior('data/inline-cache', function (baseConnect) {
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
                    set = set || {};
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
        });
    }(function () {
        return this;
    }()));
});
//# sourceMappingURL=inline-cache.js.map