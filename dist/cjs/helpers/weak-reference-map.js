/*can-connect@0.5.0-pre.2#helpers/weak-reference-map*/
var helpers = require('./helpers.js');
var WeakReferenceMap = function () {
    this.set = {};
};
helpers.extend(WeakReferenceMap.prototype, {
    has: function (key) {
        return !!this.set[key];
    },
    addReference: function (key, item) {
        var data = this.set[key];
        if (!data) {
            data = this.set[key] = {
                item: item,
                referenceCount: 0,
                key: key
            };
        }
        data.referenceCount++;
    },
    deleteReference: function (key) {
        var data = this.set[key];
        if (data) {
            data.referenceCount--;
            if (data.referenceCount === 0) {
                delete this.set[key];
            }
        }
    },
    get: function (key) {
        var data = this.set[key];
        if (data) {
            return data.item;
        }
    },
    forEach: function (cb) {
        for (var id in this.set) {
            cb(this.set[id].item, id);
        }
    }
});
module.exports = WeakReferenceMap;
//# sourceMappingURL=weak-reference-map.js.map