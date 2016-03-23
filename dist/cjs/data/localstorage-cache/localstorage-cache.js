/*can-connect@0.5.0-pre.2#data/localstorage-cache/localstorage-cache*/
var getItems = require('../../helpers/get-items.js');
var connect = require('../../can-connect.js');
var sortedSetJSON = require('../../helpers/sorted-set-json.js');
var canSet = require('can-set');
require('when/es6-shim/Promise');
var helpers = require('../../helpers/helpers.js');
var forEach = helpers.forEach;
var map = helpers.map;
var indexOf = function (connection, props, items) {
    var id = connection.id(props);
    for (var i = 0; i < items.length; i++) {
        if (id == connection.id(items[i])) {
            return i;
        }
    }
    return -1;
};
var setAdd = function (set, items, item, algebra) {
    return items.concat([item]);
};
module.exports = connect.behavior('data-localstorage-cache', function (baseConnect) {
    var behavior = {
            _instances: {},
            getSetData: function () {
                var sets = {};
                var self = this;
                forEach.call(JSON.parse(localStorage.getItem(this.name + '-sets')) || [], function (set) {
                    var setKey = sortedSetJSON(set);
                    if (localStorage.getItem(self.name + '/set/' + setKey)) {
                        sets[setKey] = {
                            set: set,
                            setKey: setKey
                        };
                    }
                });
                return sets;
            },
            _getSets: function (setData) {
                var sets = [];
                setData = setData || this.getSetData();
                for (var setKey in setData) {
                    sets.push(setData[setKey].set);
                }
                return sets;
            },
            getInstance: function (id) {
                var res = localStorage.getItem(this.name + '/instance/' + id);
                if (res) {
                    return JSON.parse(res);
                }
            },
            getInstances: function (ids) {
                var self = this;
                return map.call(ids, function (id) {
                    return self.getInstance(id);
                });
            },
            removeSet: function (setKey, noUpdate) {
                var sets = this.getSetData();
                localStorage.removeItem(this.name + '/set/' + setKey);
                delete sets[setKey];
                if (noUpdate !== true) {
                    this.updateSets(sets);
                }
            },
            updateSets: function (sets) {
                var setData = this._getSets(sets);
                localStorage.setItem(this.name + '-sets', JSON.stringify(setData));
            },
            updateSet: function (setDatum, items, newSet) {
                var newSetKey = newSet ? sortedSetJSON(newSet) : setDatum.setKey;
                if (newSet) {
                    if (newSetKey !== setDatum.setKey) {
                        var sets = this.getSetData();
                        var oldSetKey = setDatum.setKey;
                        sets[newSetKey] = setDatum;
                        setDatum.setKey = newSetKey;
                        this.removeSet(oldSetKey);
                    }
                }
                setDatum.items = items;
                var self = this;
                var ids = map.call(items, function (item) {
                        var id = self.id(item);
                        localStorage.setItem(self.name + '/instance/' + id, JSON.stringify(item));
                        return id;
                    });
                localStorage.setItem(this.name + '/set/' + newSetKey, JSON.stringify(ids));
            },
            addSet: function (set, data) {
                var items = getItems(data);
                var sets = this.getSetData();
                var setKey = sortedSetJSON(set);
                sets[setKey] = {
                    setKey: setKey,
                    items: items,
                    set: set
                };
                var self = this;
                var ids = map.call(items, function (item) {
                        var id = self.id(item);
                        localStorage.setItem(self.name + '/instance/' + id, JSON.stringify(item));
                        return id;
                    });
                localStorage.setItem(this.name + '/set/' + setKey, JSON.stringify(ids));
                this.updateSets(sets);
            },
            _eachSet: function (cb) {
                var sets = this.getSetData();
                var self = this;
                var loop = function (setDatum, setKey) {
                    return cb.call(self, setDatum, setKey, function () {
                        if (!('items' in setDatum)) {
                            var ids = JSON.parse(localStorage.getItem(self.name + '/set/' + setKey));
                            setDatum.items = self.getInstances(ids);
                        }
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
            clear: function () {
                var sets = this.getSetData();
                for (var setKey in sets) {
                    localStorage.removeItem(this.name + '/set/' + setKey);
                }
                localStorage.removeItem(this.name + '-sets');
                var keys = [];
                for (var i = 0, len = localStorage.length; i < len; ++i) {
                    if (localStorage.key(i).indexOf(this.name + '/instance/') === 0) {
                        keys.push(localStorage.key(i));
                    }
                }
                forEach.call(keys, function (key) {
                    localStorage.removeItem(key);
                });
                this._instances = {};
            },
            getSets: function () {
                return Promise.resolve(this._getSets());
            },
            getListData: function (set) {
                var setKey = sortedSetJSON(set);
                var setDatum = this.getSetData()[setKey];
                if (setDatum) {
                    var localData = localStorage.getItem(this.name + '/set/' + setKey);
                    if (localData) {
                        return Promise.resolve({ data: this.getInstances(JSON.parse(localData)) });
                    }
                }
                return Promise.reject({
                    message: 'no data',
                    error: 404
                });
            },
            getData: function (params) {
                var id = this.id(params);
                var res = localStorage.getItem(this.name + '/instance/' + id);
                if (res) {
                    return Promise.resolve(JSON.parse(res));
                } else {
                    return Promise.reject({
                        message: 'no data',
                        error: 404
                    });
                }
            },
            updateListData: function (data, set) {
                var items = getItems(data);
                var sets = this.getSetData();
                var self = this;
                for (var setKey in sets) {
                    var setDatum = sets[setKey];
                    var union = canSet.union(setDatum.set, set, this.algebra);
                    if (union) {
                        return this.getListData(setDatum.set).then(function (setData) {
                            self.updateSet(setDatum, canSet.getUnion(setDatum.set, set, getItems(setData), items, this.algebra), union);
                        });
                    }
                }
                this.addSet(set, data);
                return Promise.resolve();
            },
            createData: function (props) {
                var self = this;
                this._eachSet(function (setDatum, setKey, getItems) {
                    if (canSet.has(setDatum.set, props, this.algebra)) {
                        self.updateSet(setDatum, setAdd(setDatum.set, getItems(), props, this.algebra), setDatum.set);
                    }
                });
                var id = this.id(props);
                localStorage.setItem(this.name + '/instance/' + id, JSON.stringify(props));
                return Promise.resolve({});
            },
            updateData: function (props) {
                var self = this;
                this._eachSet(function (setDatum, setKey, getItems) {
                    var items = getItems();
                    var index = indexOf(self, props, items);
                    if (canSet.has(setDatum.set, props, this.algebra)) {
                        if (index == -1) {
                            self.updateSet(setDatum, setAdd(setDatum.set, getItems(), props, this.algebra));
                        } else {
                            items.splice(index, 1, props);
                            self.updateSet(setDatum, items);
                        }
                    } else if (index != -1) {
                        items.splice(index, 1);
                        self.updateSet(setDatum, items);
                    }
                });
                var id = this.id(props);
                localStorage.setItem(this.name + '/instance/' + id, JSON.stringify(props));
                return Promise.resolve({});
            },
            destroyData: function (props) {
                var self = this;
                this._eachSet(function (setDatum, setKey, getItems) {
                    var items = getItems();
                    var index = indexOf(self, props, items);
                    if (index != -1) {
                        items.splice(index, 1);
                        self.updateSet(setDatum, items);
                    }
                });
                var id = this.id(props);
                localStorage.removeItem(this.name + '/instance/' + id);
                return Promise.resolve({});
            }
        };
    return behavior;
});
//# sourceMappingURL=localstorage-cache.js.map