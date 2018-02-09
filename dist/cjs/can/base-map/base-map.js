/*can-connect@1.5.17#can/base-map/base-map*/
var connect = require('../../can-connect.js');
var constructor = require('../../constructor/constructor.js');
var canMap = require('../map/map.js');
var canRef = require('../ref/ref.js');
var constructorStore = require('../../constructor/store/store.js');
var dataCallbacks = require('../../data/callbacks/callbacks.js');
var callbacksCache = require('../../data/callbacks-cache/callbacks-cache.js');
var dataParse = require('../../data/parse/parse.js');
var dataUrl = require('../../data/url/url.js');
var realTime = require('../../real-time/real-time.js');
var callbacksOnce = require('../../constructor/callbacks-once/callbacks-once.js');
var GLOBAL = require('can-util/js/global/global');
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
//# sourceMappingURL=base-map.js.map