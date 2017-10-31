/*can-connect@1.5.9#helpers/get-items*/
define(function (require, exports, module) {
    module.exports = function (data) {
        if (Array.isArray(data)) {
            return data;
        } else {
            return data.data;
        }
    };
});
//# sourceMappingURL=get-items.js.map