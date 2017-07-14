/*can-connect@1.5.3#can-connect*/
define(function (require, exports, module) {
    var connect = require('./connect');
    var base = require('./base/base');
    var ns = require('can-namespace');
    connect.base = base;
    module.exports = ns.connect = connect;
});
//# sourceMappingURL=can-connect.js.map