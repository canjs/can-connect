var connect = require("./can-connect");

connect.cacheRequests = require("./cache-requests/");

connect.constructor = require("./constructor/");
connect.constructorCallbacksOnce = require("./constructor/callbacks-once/");
connect.constructorStore = require("./constructor/store/");
connect.dataCallbacks = require("./data/callbacks/");
connect.dataCallbacksCache = require("./data/callbacks-cache/");
connect.dataCombineRequests = require("./data/combine-requests/");
connect.dataLocalStorageCache = require("./data/localstorage-cache/");
connect.dataMemoryCache = require("./data/memory-cache/");
connect.dataParse = require("./data/parse/");
connect.dataUrl = require("./data/url/");
connect.fallThroughCache = require("./fall-through-cache/");
connect.realTime = require("./real-time/");

connect.superMap = require("./can/super-map/");
connect.tag = require("./can/tag/");
connect.baseMap = require('./can/base-map/');

module.exports = connect;
