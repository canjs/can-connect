/*can-connect@0.6.0-pre.7#all*/
define(function (require, exports, module) {
    var connect = window.connect = require('./can-connect');
    connect.cacheRequests = require('./cache-requests/cache-requests');
    connect.constructor = require('./constructor/constructor');
    connect.constructorCallbacksOnce = require('./constructor/callbacks-once/callbacks-once');
    connect.constructorStore = require('./constructor/store/store');
    connect.dataCallbacks = require('./data/callbacks/callbacks');
    connect.dataCallbacksCache = require('./data/callbacks-cache/callbacks-cache');
    connect.dataCombineRequests = require('./data/combine-requests/combine-requests');
    connect.dataInlineCache = require('./data/inline-cache/inline-cache');
    connect.dataLocalStorageCache = require('./data/localstorage-cache/localstorage-cache');
    connect.dataMemoryCache = require('./data/memory-cache/memory-cache');
    connect.dataParse = require('./data/parse/parse');
    connect.dataUrl = require('./data/url/url');
    connect.fallThroughCache = require('./fall-through-cache/fall-through-cache');
    connect.realTime = require('./real-time/real-time');
    connect.fixture = require('can-fixture');
    connect.Model = require('./can/model/model');
    connect.superMap = require('./can/super-map/super-map');
    require('./can/tag/tag');
});
//# sourceMappingURL=all.js.map