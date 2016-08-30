/*can-connect@0.6.0-pre.17#helpers/overwrite*/
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