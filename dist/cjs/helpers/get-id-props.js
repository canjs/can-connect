/*can-connect@1.5.17#helpers/get-id-props*/
module.exports = function (connection) {
    var ids = [], algebra = connection.algebra;
    if (algebra && algebra.clauses && algebra.clauses.id) {
        for (var prop in algebra.clauses.id) {
            ids.push(prop);
        }
    }
    if (connection.idProp && !ids.length) {
        ids.push(connection.idProp);
    }
    if (!ids.length) {
        ids.push('id');
    }
    return ids;
};
//# sourceMappingURL=get-id-props.js.map