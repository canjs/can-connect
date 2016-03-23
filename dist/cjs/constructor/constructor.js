/*can-connect@0.5.0-pre.2#constructor/constructor*/
var helpers = require('../helpers/helpers.js');
var bind = helpers.bind;
var isArray = helpers.isArray;
var connect = require('../can-connect.js');
var WeakReferenceMap = require('../helpers/weak-reference-map.js');
var overwrite = require('../helpers/overwrite.js');
var idMerge = require('../helpers/id-merge.js');
var helpers = require('../helpers/helpers.js');
var addToCanWaitData = require('../helpers/wait.js');
module.exports = connect.behavior('constructor', function (baseConnect) {
    var behavior = {
            cidStore: new WeakReferenceMap(),
            _cid: 0,
            get: function (params) {
                var self = this;
                return addToCanWaitData(this.getData(params).then(function (data) {
                    return self.hydrateInstance(data);
                }), this.name, params);
            },
            getList: function (set) {
                var self = this;
                return addToCanWaitData(this.getListData(set).then(function (data) {
                    return self.hydrateList(data, set);
                }), this.name, set);
            },
            hydrateList: function (listData, set) {
                if (isArray(listData)) {
                    listData = { data: listData };
                }
                var arr = [];
                for (var i = 0; i < listData.data.length; i++) {
                    arr.push(this.hydrateInstance(listData.data[i]));
                }
                listData.data = arr;
                if (this.list) {
                    return this.list(listData, set);
                } else {
                    var list = listData.data.slice(0);
                    list[this.listSetProp || '__listSet'] = set;
                    return list;
                }
            },
            hydrateInstance: function (props) {
                if (this.instance) {
                    return this.instance(props);
                } else {
                    return helpers.extend({}, props);
                }
            },
            save: function (instance) {
                var serialized = this.serializeInstance(instance);
                var id = this.id(instance);
                var self = this;
                if (id === undefined) {
                    var cid = this._cid++;
                    this.cidStore.addReference(cid, instance);
                    return this.createData(serialized, cid).then(function (data) {
                        if (data !== undefined) {
                            self.createdInstance(instance, data);
                        }
                        self.cidStore.deleteReference(cid, instance);
                        return instance;
                    });
                } else {
                    return this.updateData(serialized).then(function (data) {
                        if (data !== undefined) {
                            self.updatedInstance(instance, data);
                        }
                        return instance;
                    });
                }
            },
            destroy: function (instance) {
                var serialized = this.serializeInstance(instance), self = this;
                return this.destroyData(serialized).then(function (data) {
                    if (data !== undefined) {
                        self.destroyedInstance(instance, data);
                    }
                    return instance;
                });
            },
            createdInstance: function (instance, props) {
                helpers.extend(instance, props);
            },
            updatedInstance: function (instance, data) {
                overwrite(instance, data, this.idProp);
            },
            updatedList: function (list, listData, set) {
                var instanceList = [];
                for (var i = 0; i < listData.data.length; i++) {
                    instanceList.push(this.hydrateInstance(listData.data[i]));
                }
                idMerge(list, instanceList, bind(this.id, this), bind(this.hydrateInstance, this));
            },
            destroyedInstance: function (instance, data) {
                overwrite(instance, data, this.idProp);
            },
            serializeInstance: function (instance) {
                return helpers.extend({}, instance);
            },
            serializeList: function (list) {
                var self = this;
                return helpers.map.call(list, function (instance) {
                    return self.serializeInstance(instance);
                });
            },
            isNew: function (instance) {
                var id = this.id(instance);
                return !(id || id === 0);
            }
        };
    return behavior;
});
//# sourceMappingURL=constructor.js.map