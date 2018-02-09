/*can-connect@1.5.17#can/super-map/super-map*/
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
    '../../data/combine-requests/combine-requests',
    '../../data/localstorage-cache/localstorage-cache',
    '../../data/parse/parse',
    '../../data/url/url',
    '../../fall-through-cache/fall-through-cache',
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
        var combineRequests = require('../../data/combine-requests/combine-requests');
        var localCache = require('../../data/localstorage-cache/localstorage-cache');
        var dataParse = require('../../data/parse/parse');
        var dataUrl = require('../../data/url/url');
        var fallThroughCache = require('../../fall-through-cache/fall-through-cache');
        var realTime = require('../../real-time/real-time');
        var callbacksOnce = require('../../constructor/callbacks-once/callbacks-once');
        var GLOBAL = require('can-util/js/global');
        var $ = GLOBAL().$;
        connect.superMap = function (options) {
            var behaviors = [
                constructor,
                canMap,
                canRef,
                constructorStore,
                dataCallbacks,
                combineRequests,
                dataParse,
                dataUrl,
                realTime,
                callbacksOnce
            ];
            if (typeof localStorage !== 'undefined') {
                if (!options.cacheConnection) {
                    options.cacheConnection = connect([localCache], {
                        name: options.name + 'Cache',
                        idProp: options.idProp,
                        algebra: options.algebra
                    });
                }
                behaviors.push(callbacksCache, fallThroughCache);
            }
            if ($ && $.ajax) {
                options.ajax = $.ajax;
            }
            return connect(behaviors, options);
        };
        module.exports = connect.superMap;
    }(function () {
        return this;
    }(), require, exports, module));
});
//# sourceMappingURL=super-map.js.map