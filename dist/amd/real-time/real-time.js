/*can-connect@1.5.17#real-time/real-time*/
define([
    'require',
    'exports',
    'module',
    '../can-connect',
    'can-set',
    '../helpers/set-add',
    '../helpers/get-index-by-id',
    'can-util/js/dev'
], function (require, exports, module) {
    var connect = require('../can-connect');
    var canSet = require('can-set');
    var setAdd = require('../helpers/set-add');
    var indexOf = require('../helpers/get-index-by-id');
    var canDev = require('can-util/js/dev');
    module.exports = connect.behavior('real-time', function (baseConnection) {
        var createPromise = Promise.resolve();
        return {
            createData: function () {
                var promise = baseConnection.createData.apply(this, arguments);
                var cleanPromise = promise.catch(function () {
                    return '';
                });
                createPromise = Promise.all([
                    createPromise,
                    cleanPromise
                ]);
                return promise;
            },
            createInstance: function (props) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    createPromise.then(function () {
                        setTimeout(function () {
                            var id = self.id(props);
                            var instance = self.instanceStore.get(id);
                            var serialized;
                            if (instance) {
                                resolve(self.updateInstance(props));
                            } else {
                                instance = self.hydrateInstance(props);
                                serialized = self.serializeInstance(instance);
                                self.addInstanceReference(instance);
                                Promise.resolve(self.createdData(props, serialized)).then(function () {
                                    self.deleteInstanceReference(instance);
                                    resolve(instance);
                                });
                            }
                        }, 1);
                    });
                });
            },
            createdData: function (props, params, cid) {
                var instance;
                if (cid !== undefined) {
                    instance = this.cidStore.get(cid);
                } else {
                    instance = this.instanceStore.get(this.id(props));
                }
                this.addInstanceReference(instance, this.id(props));
                this.createdInstance(instance, props);
                create.call(this, this.serializeInstance(instance));
                this.deleteInstanceReference(instance);
                return undefined;
            },
            updatedData: function (props, params) {
                var instance = this.instanceStore.get(this.id(params));
                this.updatedInstance(instance, props);
                update.call(this, this.serializeInstance(instance));
                return undefined;
            },
            updateInstance: function (props) {
                var id = this.id(props);
                var instance = this.instanceStore.get(id);
                if (!instance) {
                    instance = this.hydrateInstance(props);
                }
                this.addInstanceReference(instance);
                var serialized = this.serializeInstance(instance), self = this;
                return Promise.resolve(this.updatedData(props, serialized)).then(function () {
                    self.deleteInstanceReference(instance);
                    return instance;
                });
            },
            destroyedData: function (props, params) {
                var id = this.id(params || props);
                var instance = this.instanceStore.get(id);
                if (!instance) {
                    instance = this.hydrateInstance(props);
                }
                var serialized = this.serializeInstance(instance);
                this.destroyedInstance(instance, props);
                destroy.call(this, serialized);
                return undefined;
            },
            destroyInstance: function (props) {
                var id = this.id(props);
                var instance = this.instanceStore.get(id);
                if (!instance) {
                    instance = this.hydrateInstance(props);
                }
                this.addInstanceReference(instance);
                var serialized = this.serializeInstance(instance), self = this;
                return Promise.resolve(this.destroyedData(props, serialized)).then(function () {
                    self.deleteInstanceReference(instance);
                    return instance;
                });
            }
        };
    });
    var create = function (props) {
        var self = this;
        this.listStore.forEach(function (list, id) {
            var set = JSON.parse(id);
            var index = indexOf(self, props, list);
            if (canSet.has(set, props, self.algebra)) {
                if (index === -1) {
                    var items = self.serializeList(list);
                    self.updatedList(list, { data: setAdd(self, set, items, props, self.algebra) }, set);
                } else {
                }
            }
        });
    };
    var update = function (props) {
        var self = this;
        this.listStore.forEach(function (list, id) {
            var items;
            var set = JSON.parse(id);
            var index = indexOf(self, props, list);
            if (canSet.has(set, props, self.algebra)) {
                items = self.serializeList(list);
                if (index === -1) {
                    self.updatedList(list, { data: setAdd(self, set, items, props, self.algebra) }, set);
                } else {
                    var sortedIndex = canSet.index(set, items, props, self.algebra);
                    if (sortedIndex !== undefined && sortedIndex !== index) {
                        var copy = items.slice(0);
                        if (index < sortedIndex) {
                            copy.splice(sortedIndex, 0, props);
                            copy.splice(index, 1);
                        } else {
                            copy.splice(index, 1);
                            copy.splice(sortedIndex, 0, props);
                        }
                        self.updatedList(list, { data: copy }, set);
                    }
                }
            } else if (index !== -1) {
                items = self.serializeList(list);
                items.splice(index, 1);
                self.updatedList(list, { data: items }, set);
            }
        });
    };
    var destroy = function (props) {
        var self = this;
        this.listStore.forEach(function (list, id) {
            var set = JSON.parse(id);
            var index = indexOf(self, props, list);
            if (index !== -1) {
                var items = self.serializeList(list);
                items.splice(index, 1);
                self.updatedList(list, { data: items }, set);
            }
        });
    };
});
//# sourceMappingURL=real-time.js.map