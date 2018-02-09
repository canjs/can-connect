/*can-connect@1.5.17#cache-requests/cache-requests*/
var connect = require('../can-connect.js');
var getItems = require('../helpers/get-items.js');
var canSet = require('can-set');
var forEach = [].forEach;
var cacheRequestsBehaviour = connect.behavior('cache-requests', function (baseConnection) {
    return {
        getDiff: function (params, availableSets) {
            var minSets, self = this;
            forEach.call(availableSets, function (set) {
                var curSets;
                var difference = canSet.difference(params, set, self.algebra);
                if (typeof difference === 'object') {
                    curSets = {
                        needed: difference,
                        cached: canSet.intersection(params, set, self.algebra),
                        count: canSet.count(difference, self.algebra)
                    };
                } else if (canSet.subset(params, set, self.algebra)) {
                    curSets = {
                        cached: params,
                        count: 0
                    };
                }
                if (curSets) {
                    if (!minSets || curSets.count < minSets.count) {
                        minSets = curSets;
                    }
                }
            });
            if (!minSets) {
                return { needed: params };
            } else {
                return {
                    needed: minSets.needed,
                    cached: minSets.cached
                };
            }
        },
        getUnion: function (params, diff, neededItems, cachedItems) {
            return { data: canSet.getUnion(diff.needed, diff.cached, getItems(neededItems), getItems(cachedItems), this.algebra) };
        },
        getListData: function (set) {
            set = set || {};
            var self = this;
            return this.cacheConnection.getSets(set).then(function (sets) {
                var diff = self.getDiff(set, sets);
                if (!diff.needed) {
                    return self.cacheConnection.getListData(diff.cached);
                } else if (!diff.cached) {
                    return baseConnection.getListData(diff.needed).then(function (data) {
                        return self.cacheConnection.updateListData(getItems(data), diff.needed).then(function () {
                            return data;
                        });
                    });
                } else {
                    var cachedPromise = self.cacheConnection.getListData(diff.cached);
                    var needsPromise = baseConnection.getListData(diff.needed);
                    var savedPromise = needsPromise.then(function (data) {
                        return self.cacheConnection.updateListData(getItems(data), diff.needed).then(function () {
                            return data;
                        });
                    });
                    var combinedPromise = Promise.all([
                        cachedPromise,
                        needsPromise
                    ]).then(function (result) {
                        var cached = result[0], needed = result[1];
                        return self.getUnion(set, diff, needed, cached);
                    });
                    return Promise.all([
                        combinedPromise,
                        savedPromise
                    ]).then(function (data) {
                        return data[0];
                    });
                }
            });
        }
    };
});
module.exports = cacheRequestsBehaviour;
//# sourceMappingURL=cache-requests.js.map