/*can-connect@1.5.17#base/base*/
var connect = require('../connect.js');
module.exports = connect.behavior('base', function (baseConnection) {
    return {
        id: function (instance) {
            var ids = [], algebra = this.algebra;
            if (algebra && algebra.clauses && algebra.clauses.id) {
                for (var prop in algebra.clauses.id) {
                    ids.push(instance[prop]);
                }
            }
            if (this.idProp && !ids.length) {
                ids.push(instance[this.idProp]);
            }
            if (!ids.length) {
                ids.push(instance.id);
            }
            return ids.length > 1 ? ids.join('@|@') : ids[0];
        },
        idProp: baseConnection.idProp || 'id',
        listSet: function (list) {
            return list[this.listSetProp];
        },
        listSetProp: '__listSet',
        init: function () {
        }
    };
});
//# sourceMappingURL=base.js.map