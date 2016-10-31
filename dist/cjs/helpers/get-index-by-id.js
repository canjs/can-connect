/*can-connect@1.0.5-0#helpers/get-index-by-id*/
module.exports = function (connection, props, items) {
    var id = connection.id(props);
    for (var i = 0; i < items.length; i++) {
        var connId = connection.id(items[i]);
        if (id == connId) {
            return i;
        }
    }
    return -1;
};
//# sourceMappingURL=get-index-by-id.js.map