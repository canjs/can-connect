/*can-connect@1.5.17#helpers/weak-reference-set*/
define([
    'require',
    'exports',
    'module',
    'can-util/js/assign'
], function (require, exports, module) {
    var assign = require('can-util/js/assign');
    var WeakReferenceSet = function () {
        this.set = [];
    };
    assign(WeakReferenceSet.prototype, {
        has: function (item) {
            return this._getIndex(item) !== -1;
        },
        addReference: function (item, referenceCount) {
            var index = this._getIndex(item);
            var data = this.set[index];
            if (!data) {
                data = {
                    item: item,
                    referenceCount: 0
                };
                this.set.push(data);
            }
            data.referenceCount += referenceCount || 1;
        },
        deleteReference: function (item) {
            var index = this._getIndex(item);
            var data = this.set[index];
            if (data) {
                data.referenceCount--;
                if (data.referenceCount === 0) {
                    this.set.splice(index, 1);
                }
            }
        },
        delete: function (item) {
            var index = this._getIndex(item);
            if (index !== -1) {
                this.set.splice(index, 1);
            }
        },
        get: function (item) {
            var data = this.set[this._getIndex(item)];
            if (data) {
                return data.item;
            }
        },
        referenceCount: function (item) {
            var data = this.set[this._getIndex(item)];
            if (data) {
                return data.referenceCount;
            }
        },
        _getIndex: function (item) {
            var index;
            this.set.every(function (data, i) {
                if (data.item === item) {
                    index = i;
                    return false;
                }
            });
            return index !== undefined ? index : -1;
        },
        forEach: function (cb) {
            return this.set.forEach(cb);
        }
    });
    module.exports = WeakReferenceSet;
});
//# sourceMappingURL=weak-reference-set.js.map