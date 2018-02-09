/*can-connect@1.5.17#data/memory-cache/memory-cache*/
var getItems = require('../../helpers/get-items.js');
var connect = require('../../can-connect.js');
var sortedSetJSON = require('../../helpers/sorted-set-json.js');
var canSet = require('can-set');
var overwrite = require('../../helpers/overwrite.js');
var setAdd = require('../../helpers/set-add.js');
var indexOf = require('../../helpers/get-index-by-id.js');
var assign = require('can-util/js/assign/assign');
var cloneData = require('../../helpers/clone-data.js');
module.exports = connect.behavior('data/memory-cache', function (baseConnection) {
    var behavior = {
        _sets: {},
        getSetData: function () {
            return this._sets;
        },
        __getListData: function (set) {
            var setsData = this.getSetData();
            var setData = setsData[sortedSetJSON(set)];
            if (setData) {
                return setData.items;
            }
        },
        _instances: {},
        getInstance: function (id) {
            return this._instances[id];
        },
        removeSet: function (setKey, noUpdate) {
            var sets = this.getSetData();
            delete sets[setKey];
            if (noUpdate !== true) {
                this.updateSets();
            }
        },
        updateSets: function () {
        },
        updateInstance: function (props) {
            var id = this.id(props);
            if (!(id in this._instances)) {
                this._instances[id] = props;
            } else {
                overwrite(this._instances[id], props, this.idProp);
            }
            return this._instances[id];
        },
        updateSet: function (setDatum, items, newSet) {
            var newSetKey = newSet ? sortedSetJSON(newSet) : setDatum.setKey;
            if (newSet) {
                if (newSetKey !== setDatum.setKey) {
                    var sets = this.getSetData();
                    var oldSetKey = setDatum.setKey;
                    sets[newSetKey] = setDatum;
                    setDatum.setKey = newSetKey;
                    setDatum.set = assign({}, newSet);
                    this.removeSet(oldSetKey);
                }
            }
            setDatum.items = items;
            var self = this;
            items.forEach(function (item) {
                self.updateInstance(item);
            });
        },
        addSet: function (set, data) {
            var items = getItems(data);
            var sets = this.getSetData();
            var setKey = sortedSetJSON(set);
            sets[setKey] = {
                setKey: setKey,
                items: items,
                set: assign({}, set)
            };
            var self = this;
            items.forEach(function (item) {
                self.updateInstance(item);
            });
            this.updateSets();
        },
        _eachSet: function (cb) {
            var sets = this.getSetData();
            var self = this;
            var loop = function (setDatum, setKey) {
                return cb.call(self, setDatum, setKey, function () {
                    return setDatum.items;
                });
            };
            for (var setKey in sets) {
                var setDatum = sets[setKey];
                var result = loop(setDatum, setKey);
                if (result !== undefined) {
                    return result;
                }
            }
        },
        _getSets: function () {
            var sets = [], setsData = this.getSetData();
            for (var prop in setsData) {
                sets.push(setsData[prop].set);
            }
            return sets;
        },
        getSets: function () {
            return Promise.resolve(this._getSets());
        },
        clear: function () {
            this._instances = {};
            this._sets = {};
        },
        getListData: function (set) {
            set = set || {};
            var listData = this.getListDataSync(set);
            if (listData) {
                return Promise.resolve(listData);
            }
            return Promise.reject({
                message: 'no data',
                error: 404
            });
        },
        getListDataSync: function (set) {
            var sets = this._getSets();
            for (var i = 0; i < sets.length; i++) {
                var checkSet = sets[i];
                if (canSet.subset(set, checkSet, this.algebra)) {
                    var source = this.__getListData(checkSet);
                    var items = canSet.getSubset(set, checkSet, source, this.algebra);
                    return {
                        data: items,
                        count: source.length
                    };
                }
            }
        },
        _getListData: function (set) {
            return this.getListDataSync(set);
        },
        updateListData: function (data, set) {
            set = set || {};
            var clonedData = cloneData(data);
            var items = getItems(clonedData);
            var sets = this.getSetData();
            var self = this;
            for (var setKey in sets) {
                var setDatum = sets[setKey];
                var union = canSet.union(setDatum.set, set, this.algebra);
                if (union) {
                    var getSet = assign({}, setDatum.set);
                    return this.getListData(getSet).then(function (setData) {
                        self.updateSet(setDatum, canSet.getUnion(getSet, set, getItems(setData), items, self.algebra), union);
                    });
                }
            }
            this.addSet(set, clonedData);
            return Promise.resolve();
        },
        getData: function (params) {
            var id = this.id(params);
            var res = this.getInstance(id);
            if (res) {
                return Promise.resolve(res);
            } else {
                return Promise.reject({
                    message: 'no data',
                    error: 404
                });
            }
        },
        createData: function (props) {
            var self = this;
            var instance = this.updateInstance(props);
            this._eachSet(function (setDatum, setKey, getItems) {
                if (canSet.has(setDatum.set, instance, this.algebra)) {
                    self.updateSet(setDatum, setAdd(self, setDatum.set, getItems(), instance, self.algebra), setDatum.set);
                }
            });
            return Promise.resolve(assign({}, instance));
        },
        updateData: function (props) {
            var self = this;
            var instance = this.updateInstance(props);
            this._eachSet(function (setDatum, setKey, getItems) {
                var items = getItems();
                var index = indexOf(self, instance, items);
                if (canSet.subset(instance, setDatum.set, this.algebra)) {
                    if (index === -1) {
                        self.updateSet(setDatum, setAdd(self, setDatum.set, getItems(), instance, self.algebra));
                    } else {
                        items.splice(index, 1, instance);
                        self.updateSet(setDatum, items);
                    }
                } else if (index !== -1) {
                    items.splice(index, 1);
                    self.updateSet(setDatum, items);
                }
            });
            return Promise.resolve(assign({}, instance));
        },
        destroyData: function (props) {
            var self = this;
            this._eachSet(function (setDatum, setKey, getItems) {
                var items = getItems();
                var index = indexOf(self, props, items);
                if (index !== -1) {
                    items.splice(index, 1);
                    self.updateSet(setDatum, items);
                }
            });
            var id = this.id(props);
            delete this._instances[id];
            return Promise.resolve(assign({}, props));
        }
    };
    return behavior;
});
//# sourceMappingURL=memory-cache.js.map