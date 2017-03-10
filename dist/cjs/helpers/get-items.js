/*can-connect@1.3.7#helpers/get-items*/
var isArray = require('can-util/js/is-array/is-array');
module.exports = function (data) {
    if (isArray(data)) {
        return data;
    } else {
        return data.data;
    }
};
//# sourceMappingURL=get-items.js.map