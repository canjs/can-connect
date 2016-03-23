/*can-connect@0.5.0-pre.2#all*/
var connect = window.connect = require('./can-connect.js');
connect.cacheRequests = require('./cache-requests/cache-requests.js');
connect.canMap = require('./can/map/map.js');
connect.constructor = require('./constructor/constructor.js');
connect.constructorCallbacksOnce = require('./constructor/callbacks-once/callbacks-once.js');
connect.constructorStore = require('./constructor/store/store.js');
connect.dataCallbacks = require('./data/callbacks/callbacks.js');
connect.dataCallbacksCache = require('./data/callbacks-cache/callbacks-cache.js');
connect.dataCombineRequests = require('./data/combine-requests/combine-requests.js');
connect.dataInlineCache = require('./data/inline-cache/inline-cache.js');
connect.dataLocalStorageCache = require('./data/localstorage-cache/localstorage-cache.js');
connect.dataMemoryCache = require('./data/memory-cache/memory-cache.js');
connect.dataParse = require('./data/parse/parse.js');
connect.dataUrl = require('./data/url/url.js');
connect.fallThroughCache = require('./fall-through-cache/fall-through-cache.js');
connect.realTime = require('./real-time/real-time.js');
connect.fixture = require('can-fixture');
connect.Model = require('./can/model/model.js');
connect.superMap = require('./can/super-map/super-map.js');
require('./can/tag/tag.js');
//# sourceMappingURL=all.js.map