/*can-connect@0.5.0-pre.2#constructor/store/store*/
var connect = require('../../can-connect.js');
var WeakReferenceMap = require('../../helpers/weak-reference-map.js');
var sortedSetJSON = require('../../helpers/sorted-set-json.js');
module.exports = connect.behavior('constructor-store', function (baseConnect) {
    var behavior = {
            instanceStore: new WeakReferenceMap(),
            listStore: new WeakReferenceMap(),
            _requestInstances: {},
            _requestLists: {},
            _pendingRequests: 0,
            _finishedRequest: function () {
                this._pendingRequests--;
                if (this._pendingRequests === 0) {
                    for (var id in this._requestInstances) {
                        this.instanceStore.deleteReference(id);
                    }
                    this._requestInstances = {};
                    for (var id in this._requestLists) {
                        this.listStore.deleteReference(id);
                    }
                    this._requestLists = {};
                }
            },
            addInstanceReference: function (instance, id) {
                this.instanceStore.addReference(id || this.id(instance), instance);
            },
            addInstanceMetaData: function (instance, name, value) {
                var data = this.instanceStore.set[this.id(instance)];
                if (data) {
                    data[name] = value;
                }
            },
            getInstanceMetaData: function (instance, name) {
                var data = this.instanceStore.set[this.id(instance)];
                if (data) {
                    return data[name];
                }
            },
            deleteInstanceMetaData: function (instance, name) {
                var data = this.instanceStore.set[this.id(instance)];
                delete data[name];
            },
            deleteInstanceReference: function (instance) {
                this.instanceStore.deleteReference(this.id(instance), instance);
            },
            addListReference: function (list, set) {
                var id = sortedSetJSON(set || this.listSet(list));
                if (id) {
                    this.listStore.addReference(id, list);
                }
            },
            deleteListReference: function (list, set) {
                var id = sortedSetJSON(set || this.listSet(list));
                if (id) {
                    this.listStore.deleteReference(id, list);
                }
            },
            hydratedInstance: function (instance) {
                if (this._pendingRequests > 0) {
                    var id = this.id(instance);
                    if (!this._requestInstances[id]) {
                        this.addInstanceReference(instance);
                        this._requestInstances[id] = instance;
                    }
                }
            },
            hydrateInstance: function (props) {
                var id = this.id(props);
                if ((id || id === 0) && this.instanceStore.has(id)) {
                    var storeInstance = this.instanceStore.get(id);
                    this.updatedInstance(storeInstance, props);
                    return storeInstance;
                }
                var instance = baseConnect.hydrateInstance.call(this, props);
                this.hydratedInstance(instance);
                return instance;
            },
            hydratedList: function (list, set) {
                if (this._pendingRequests > 0) {
                    var id = sortedSetJSON(set || this.listSet(list));
                    if (id) {
                        if (!this._requestLists[id]) {
                            this.addListReference(list, set);
                            this._requestLists[id] = list;
                        }
                    }
                }
            },
            hydrateList: function (listData, set) {
                set = set || this.listSet(listData);
                var id = sortedSetJSON(set);
                if (id && this.listStore.has(id)) {
                    var storeList = this.listStore.get(id);
                    this.updatedList(storeList, listData, set);
                    return storeList;
                }
                var list = baseConnect.hydrateList.call(this, listData, set);
                this.hydratedList(list, set);
                return list;
            },
            getList: function (params) {
                var self = this;
                self._pendingRequests++;
                var promise = baseConnect.getList.call(this, params);
                promise.then(function (instances) {
                    self._finishedRequest();
                }, function () {
                    self._finishedRequest();
                });
                return promise;
            },
            get: function (params) {
                var self = this;
                self._pendingRequests++;
                var promise = baseConnect.get.call(this, params);
                promise.then(function (instance) {
                    self._finishedRequest();
                }, function () {
                    self._finishedRequest();
                });
                return promise;
            },
            save: function (instance) {
                var self = this;
                self._pendingRequests++;
                var updating = !this.isNew(instance);
                if (updating) {
                    this.addInstanceReference(instance);
                }
                var promise = baseConnect.save.call(this, instance);
                promise.then(function (instances) {
                    if (updating) {
                        self.deleteInstanceReference(instance);
                    }
                    self._finishedRequest();
                }, function () {
                    self._finishedRequest();
                });
                return promise;
            },
            destroy: function (instance) {
                var self = this;
                self._pendingRequests++;
                var promise = baseConnect.destroy.call(this, instance);
                promise.then(function (instance) {
                    self._finishedRequest();
                }, function () {
                    self._finishedRequest();
                });
                return promise;
            }
        };
    return behavior;
});
//# sourceMappingURL=store.js.map