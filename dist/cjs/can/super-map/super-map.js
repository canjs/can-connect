/*can-connect@0.5.4#can/super-map/super-map*/
var connect = require('../../can-connect.js');
require('../../constructor/constructor.js');
require('../map/map.js');
require('../can.js');
require('../../constructor/store/store.js');
require('../../constructor/callbacks-once/callbacks-once.js');
require('../../data/callbacks/callbacks.js');
require('../../data/callbacks-cache/callbacks-cache.js');
require('../../data/combine-requests/combine-requests.js');
require('../../data/inline-cache/inline-cache.js');
require('../../data/localstorage-cache/localstorage-cache.js');
require('../../data/parse/parse.js');
require('../../data/url/url.js');
require('../../fall-through-cache/fall-through-cache.js');
require('../../real-time/real-time.js');
var $ = require('jquery');
connect.superMap = function (options) {
    var behaviors = [
        'constructor',
        'can-map',
        'constructor-store',
        'data-callbacks',
        'data-callbacks-cache',
        'data-combine-requests',
        'data-inline-cache',
        'data-parse',
        'data-url',
        'real-time',
        'constructor-callbacks-once'
    ];
    if (typeof localStorage !== 'undefined') {
        if (!options.cacheConnection) {
            options.cacheConnection = connect(['data-localstorage-cache'], {
                name: options.name + 'Cache',
                idProp: options.idProp,
                algebra: options.algebra
            });
        }
        behaviors.push('fall-through-cache');
    }
    options.ajax = $.ajax;
    return connect(behaviors, options);
};
module.exports = connect.superMap;
//# sourceMappingURL=super-map.js.map