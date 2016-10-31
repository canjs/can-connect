/*can-connect@1.0.5-0#can-connect*/
define(function (require, exports, module) {
    var connect = require('./connect');
    var base = require('./base/base');
    var ns = require('can-util/namespace');
    connect.base = base;
    module.exports = ns.connect = connect;
});
//# sourceMappingURL=can-connect.js.map