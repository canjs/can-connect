/*can-connect@1.5.1#can/base-map/base-map*/
define(function (require, exports, module) {
    (function (global) {
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
    }()));
});
//# sourceMappingURL=base-map.js.map