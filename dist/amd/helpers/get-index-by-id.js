/*can-connect@0.6.0-pre.15#helpers/get-index-by-id*/
define(function (require, exports, module) {
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
});
//# sourceMappingURL=get-index-by-id.js.map