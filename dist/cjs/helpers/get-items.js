/*can-connect@0.2.7#helpers/get-items*/
module.exports = function (data) {
    if (Array.isArray(data)) {
        return data;
    } else {
        return data.data;
    }
};
//# sourceMappingURL=get-items.js.map