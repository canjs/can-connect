/*can-connect@1.5.17#can/super-map/super-map*/
var connect = require('../../can-connect.js');
var constructor = require('../../constructor/constructor.js');
var canMap = require('../map/map.js');
var canRef = require('../ref/ref.js');
var constructorStore = require('../../constructor/store/store.js');
var dataCallbacks = require('../../data/callbacks/callbacks.js');
var callbacksCache = require('../../data/callbacks-cache/callbacks-cache.js');
var combineRequests = require('../../data/combine-requests/combine-requests.js');
var localCache = require('../../data/localstorage-cache/localstorage-cache.js');
var dataParse = require('../../data/parse/parse.js');
var dataUrl = require('../../data/url/url.js');
var fallThroughCache = require('../../fall-through-cache/fall-through-cache.js');
var realTime = require('../../real-time/real-time.js');
var callbacksOnce = require('../../constructor/callbacks-once/callbacks-once.js');
var GLOBAL = require('can-util/js/global/global');
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
//# sourceMappingURL=super-map.js.map