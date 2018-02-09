/*can-connect@1.5.17#constructor/constructor*/
define([
    'require',
    'exports',
    'module',
    'can-util/js/make-array',
    'can-util/js/assign',
    '../can-connect',
    '../helpers/weak-reference-map',
    '../helpers/overwrite',
    '../helpers/id-merge'
], function (require, exports, module) {
    var makeArray = require('can-util/js/make-array');
    var assign = require('can-util/js/assign');
    var connect = require('../can-connect');
    var WeakReferenceMap = require('../helpers/weak-reference-map');
    var overwrite = require('../helpers/overwrite');
    var idMerge = require('../helpers/id-merge');
    module.exports = connect.behavior('constructor', function (baseConnection) {
        var behavior = {
            cidStore: new WeakReferenceMap(),
            _cid: 0,
            get: function (params) {
                var self = this;
                return this.getData(params).then(function (data) {
                    return self.hydrateInstance(data);
                });
            },
            getList: function (set) {
                set = set || {};
                var self = this;
                return this.getListData(set).then(function (data) {
                    return self.hydrateList(data, set);
                });
            },
            hydrateList: function (listData, set) {
                if (Array.isArray(listData)) {
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
                    copyMetadata(listData, list);
                    return list;
                }
            },
            hydrateInstance: function (props) {
                if (this.instance) {
                    return this.instance(props);
                } else {
                    return assign({}, props);
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
                assign(instance, props);
            },
            updatedInstance: function (instance, data) {
                overwrite(instance, data, this.idProp);
            },
            updatedList: function (list, listData, set) {
                var instanceList = [];
                for (var i = 0; i < listData.data.length; i++) {
                    instanceList.push(this.hydrateInstance(listData.data[i]));
                }
                idMerge(list, instanceList, this.id.bind(this), this.hydrateInstance.bind(this));
                copyMetadata(listData, list);
            },
            destroyedInstance: function (instance, data) {
                overwrite(instance, data, this.idProp);
            },
            serializeInstance: function (instance) {
                return assign({}, instance);
            },
            serializeList: function (list) {
                var self = this;
                return makeArray(list).map(function (instance) {
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
    function copyMetadata(listData, list) {
        for (var prop in listData) {
            if (prop !== 'data') {
                if (typeof list.set === 'function') {
                    list.set(prop, listData[prop]);
                } else if (typeof list.attr === 'function') {
                    list.attr(prop, listData[prop]);
                } else {
                    list[prop] = listData[prop];
                }
            }
        }
    }
});
//# sourceMappingURL=constructor.js.map