/*can-connect@0.5.0-pre.2#fall-through-cache/fall-through-cache*/
define(function (require, exports, module) {
    var getItems = require('../helpers/get-items');
    var connect = require('../can-connect');
    var canSet = require('can-set');
    var sortedSetJSON = require('../helpers/sorted-set-json');
    module.exports = connect.behavior('fall-through-cache', function (baseConnect) {
        var behavior = {
                hydrateList: function (listData, set) {
                    set = set || this.listSet(listData);
                    var id = sortedSetJSON(set);
                    var list = baseConnect.hydrateList.call(this, listData, set);
                    if (this._getHydrateListCallbacks[id]) {
                        this._getHydrateListCallbacks[id].shift()(list);
                        if (!this._getHydrateListCallbacks[id].length) {
                            delete this._getHydrateListCallbacks[id];
                        }
                    }
                    return list;
                },
                _getHydrateListCallbacks: {},
                _getHydrateList: function (set, callback) {
                    var id = sortedSetJSON(set);
                    if (!this._getHydrateListCallbacks[id]) {
                        this._getHydrateListCallbacks[id] = [];
                    }
                    this._getHydrateListCallbacks[id].push(callback);
                },
                getListData: function (set) {
                    var self = this;
                    return this.cacheConnection.getListData(set).then(function (data) {
                        self._getHydrateList(set, function (list) {
                            self.addListReference(list, set);
                            setTimeout(function () {
                                baseConnect.getListData.call(self, set).then(function (listData) {
                                    self.cacheConnection.updateListData(listData, set);
                                    self.updatedList(list, listData, set);
                                    self.deleteListReference(list, set);
                                }, function (e) {
                                    console.log('REJECTED', e);
                                });
                            }, 1);
                        });
                        return data;
                    }, function () {
                        var listData = baseConnect.getListData.call(self, set);
                        listData.then(function (listData) {
                            self.cacheConnection.updateListData(listData, set);
                        });
                        return listData;
                    });
                },
                hydrateInstance: function (props) {
                    var id = this.id(props);
                    var instance = baseConnect.hydrateInstance.apply(this, arguments);
                    if (this._getMakeInstanceCallbacks[id]) {
                        this._getMakeInstanceCallbacks[id].shift()(instance);
                        if (!this._getMakeInstanceCallbacks[id].length) {
                            delete this._getMakeInstanceCallbacks[id];
                        }
                    }
                    return instance;
                },
                _getMakeInstanceCallbacks: {},
                _getMakeInstance: function (id, callback) {
                    if (!this._getMakeInstanceCallbacks[id]) {
                        this._getMakeInstanceCallbacks[id] = [];
                    }
                    this._getMakeInstanceCallbacks[id].push(callback);
                },
                getData: function (params) {
                    var self = this;
                    return this.cacheConnection.getData(params).then(function (instanceData) {
                        self._getMakeInstance(self.id(instanceData) || self.id(params), function (instance) {
                            self.addInstanceReference(instance);
                            setTimeout(function () {
                                baseConnect.getData.call(self, params).then(function (instanceData2) {
                                    self.cacheConnection.updateData(instanceData2);
                                    self.updatedInstance(instance, instanceData2);
                                    self.deleteInstanceReference(instance);
                                }, function (e) {
                                    console.log('REJECTED', e);
                                });
                            }, 1);
                        });
                        return instanceData;
                    }, function () {
                        var listData = baseConnect.getData.call(self, params);
                        listData.then(function (instanceData) {
                            self.cacheConnection.updateData(instanceData);
                        });
                        return listData;
                    });
                }
            };
        return behavior;
    });
});
//# sourceMappingURL=fall-through-cache.js.map