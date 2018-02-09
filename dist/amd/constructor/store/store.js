/*can-connect@1.5.17#constructor/store/store*/
define([
    'require',
    'exports',
    'module',
    '../../can-connect',
    '../../helpers/weak-reference-map',
    '../../helpers/weak-reference-set',
    '../../helpers/sorted-set-json',
    'can-event',
    'can-util/js/assign'
], function (require, exports, module) {
    var connect = require('../../can-connect');
    var WeakReferenceMap = require('../../helpers/weak-reference-map');
    var WeakReferenceSet = require('../../helpers/weak-reference-set');
    var sortedSetJSON = require('../../helpers/sorted-set-json');
    var canEvent = require('can-event');
    var assign = require('can-util/js/assign');
    var pendingRequests = 0;
    var noRequestsTimer = null;
    var requests = {
        increment: function (connection) {
            pendingRequests++;
            clearTimeout(noRequestsTimer);
        },
        decrement: function (connection) {
            pendingRequests--;
            if (pendingRequests === 0) {
                noRequestsTimer = setTimeout(function () {
                    requests.dispatch('end');
                }, module.exports.requestCleanupDelay);
            }
            if (pendingRequests < 0) {
                pendingRequests = 0;
            }
        },
        count: function () {
            return pendingRequests;
        }
    };
    assign(requests, canEvent);
    var constructorStore = connect.behavior('constructor/store', function (baseConnection) {
        var behavior = {
            instanceStore: new WeakReferenceMap(),
            newInstanceStore: new WeakReferenceSet(),
            listStore: new WeakReferenceMap(),
            init: function () {
                if (baseConnection.init) {
                    baseConnection.init.apply(this, arguments);
                }
                if (!this.hasOwnProperty('_requestInstances')) {
                    this._requestInstances = {};
                }
                if (!this.hasOwnProperty('_requestLists')) {
                    this._requestLists = {};
                }
                requests.on('end', function () {
                    var id;
                    for (id in this._requestInstances) {
                        this.instanceStore.deleteReference(id);
                    }
                    this._requestInstances = {};
                    for (id in this._requestLists) {
                        this.listStore.deleteReference(id);
                        this._requestLists[id].forEach(this.deleteInstanceReference.bind(this));
                    }
                    this._requestLists = {};
                }.bind(this));
            },
            _finishedRequest: function () {
                requests.decrement(this);
            },
            addInstanceReference: function (instance, id) {
                var ID = id || this.id(instance);
                if (ID === undefined) {
                    this.newInstanceStore.addReference(instance);
                } else {
                    this.instanceStore.addReference(ID, instance);
                }
            },
            createdInstance: function (instance, props) {
                baseConnection.createdInstance.apply(this, arguments);
                this.moveCreatedInstanceToInstanceStore(instance);
            },
            moveCreatedInstanceToInstanceStore: function (instance) {
                var ID = this.id(instance);
                if (this.newInstanceStore.has(instance) && ID !== undefined) {
                    var referenceCount = this.newInstanceStore.referenceCount(instance);
                    this.newInstanceStore.delete(instance);
                    this.instanceStore.addReference(ID, instance, referenceCount);
                }
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
                var ID = this.id(instance);
                if (ID === undefined) {
                    this.newInstanceStore.deleteReference(instance);
                } else {
                    this.instanceStore.deleteReference(this.id(instance), instance);
                }
            },
            addListReference: function (list, set) {
                var id = sortedSetJSON(set || this.listSet(list));
                if (id) {
                    this.listStore.addReference(id, list);
                    list.forEach(function (instance) {
                        this.addInstanceReference(instance);
                    }.bind(this));
                }
            },
            deleteListReference: function (list, set) {
                var id = sortedSetJSON(set || this.listSet(list));
                if (id) {
                    this.listStore.deleteReference(id, list);
                    list.forEach(this.deleteInstanceReference.bind(this));
                }
            },
            hydratedInstance: function (instance) {
                if (requests.count() > 0) {
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
                var instance = baseConnection.hydrateInstance.call(this, props);
                this.hydratedInstance(instance);
                return instance;
            },
            hydratedList: function (list, set) {
                if (requests.count() > 0) {
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
                var list = baseConnection.hydrateList.call(this, listData, set);
                this.hydratedList(list, set);
                return list;
            },
            getList: function (listSet) {
                var self = this;
                requests.increment(this);
                var promise = baseConnection.getList.call(this, listSet);
                promise.then(function (instances) {
                    self._finishedRequest();
                }, function () {
                    self._finishedRequest();
                });
                return promise;
            },
            get: function (params) {
                var self = this;
                requests.increment(this);
                var promise = baseConnection.get.call(this, params);
                promise.then(function (instance) {
                    self._finishedRequest();
                }, function () {
                    self._finishedRequest();
                });
                return promise;
            },
            save: function (instance) {
                var self = this;
                requests.increment(this);
                var updating = !this.isNew(instance);
                if (updating) {
                    this.addInstanceReference(instance);
                }
                var promise = baseConnection.save.call(this, instance);
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
                this.addInstanceReference(instance);
                requests.increment(this);
                var promise = baseConnection.destroy.call(this, instance);
                promise.then(function (instance) {
                    self._finishedRequest();
                    self.deleteInstanceReference(instance);
                }, function () {
                    self._finishedRequest();
                });
                return promise;
            },
            updatedList: function (list, listData, set) {
                var oldList = list.slice(0);
                if (!listData.data && typeof listData.length === 'number') {
                    listData = { data: listData };
                }
                if (baseConnection.updatedList) {
                    baseConnection.updatedList.call(this, list, listData, set);
                    list.forEach(function (instance) {
                        this.addInstanceReference(instance);
                    }.bind(this));
                } else if (listData.data) {
                    listData.data.forEach(function (instance) {
                        this.addInstanceReference(instance);
                    }.bind(this));
                }
                oldList.forEach(this.deleteInstanceReference.bind(this));
            }
        };
        return behavior;
    });
    constructorStore.requests = requests;
    constructorStore.requestCleanupDelay = 10;
    module.exports = constructorStore;
});
//# sourceMappingURL=store.js.map