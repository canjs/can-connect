/*can-connect@1.5.17#can/base-map/base-map*/
define([
    'require',
    'exports',
    'module',
    '../../can-connect',
    '../../constructor/constructor',
    '../map/map',
    '../ref/ref',
    '../../constructor/store/store',
    '../../data/callbacks/callbacks',
    '../../data/callbacks-cache/callbacks-cache',
    '../../data/parse/parse',
    '../../data/url/url',
    '../../real-time/real-time',
    '../../constructor/callbacks-once/callbacks-once',
    'can-util/js/global'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        var connect = require('../../can-connect');
        var constructor = require('../../constructor/constructor');
        var canMap = require('../map/map');
        var canRef = require('../ref/ref');
        var constructorStore = require('../../constructor/store/store');
        var dataCallbacks = require('../../data/callbacks/callbacks');
        var callbacksCache = require('../../data/callbacks-cache/callbacks-cache');
        var dataParse = require('../../data/parse/parse');
        var dataUrl = require('../../data/url/url');
        var realTime = require('../../real-time/real-time');
        var callbacksOnce = require('../../constructor/callbacks-once/callbacks-once');
        var GLOBAL = require('can-util/js/global');
        var $ = GLOBAL().$;
        connect.baseMap = function (options) {
            var behaviors = [
                constructor,
                canMap,
                canRef,
                constructorStore,
                dataCallbacks,
                dataParse,
                dataUrl,
                realTime,
                callbacksOnce
            ];
            if ($ && $.ajax) {
                options.ajax = $.ajax;
            }
            return connect(behaviors, options);
        };
        module.exports = connect.baseMap;
    }(function () {
        return this;
    }(), require, exports, module));
});
//# sourceMappingURL=base-map.js.map