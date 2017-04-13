/*can-connect@1.3.9#helpers/overwrite*/
module.exports = function (d, s, id) {
    for (var prop in d) {
        if (prop !== id && !(prop in s)) {
            delete d[prop];
        }
    }
    for (prop in s) {
        d[prop] = s[prop];
    }
    return d;
};
//# sourceMappingURL=overwrite.js.map