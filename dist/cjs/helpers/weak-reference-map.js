/*can-connect@1.5.17#helpers/weak-reference-map*/
var assign = require('can-util/js/assign/assign');
var WeakReferenceMap = function () {
    this.set = {};
};
assign(WeakReferenceMap.prototype, {
    has: function (key) {
        return !!this.set[key];
    },
    addReference: function (key, item, referenceCount) {
        if (typeof key === 'undefined') {
            throw new Error('can-connect: You must provide a key to store a value in a WeakReferenceMap');
        }
        var data = this.set[key];
        if (!data) {
            data = this.set[key] = {
                item: item,
                referenceCount: 0,
                key: key
            };
        }
        data.referenceCount += referenceCount || 1;
    },
    referenceCount: function (key) {
        var data = this.set[key];
        if (data) {
            return data.referenceCount;
        }
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