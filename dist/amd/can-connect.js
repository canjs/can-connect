/*can-connect@1.5.17#can-connect*/
define([
    'require',
    'exports',
    'module',
    './connect',
    './base/base',
    'can-namespace'
], function (require, exports, module) {
    var connect = require('./connect');
    var base = require('./base/base');
    var ns = require('can-namespace');
    connect.base = base;
    module.exports = ns.connect = connect;
});
//# sourceMappingURL=can-connect.js.map