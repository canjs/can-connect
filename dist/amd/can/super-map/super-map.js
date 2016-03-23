/*can-connect@0.5.0-pre.2#can/super-map/super-map*/
define(function (require, exports, module) {
    var connect = require('../../can-connect');
    require('../../constructor/constructor');
    require('../map/map');
    require('../can');
    require('../../constructor/store/store');
    require('../../constructor/callbacks-once/callbacks-once');
    require('../../data/callbacks/callbacks');
    require('../../data/callbacks-cache/callbacks-cache');
    require('../../data/combine-requests/combine-requests');
    require('../../data/inline-cache/inline-cache');
    require('../../data/localstorage-cache/localstorage-cache');
    require('../../data/parse/parse');
    require('../../data/url/url');
    require('../../fall-through-cache/fall-through-cache');
    require('../../real-time/real-time');
    var Map = require('can/map');
    var List = require('can/list');
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
            options.cacheConnection = connect(['data-localstorage-cache'], {
                name: options.name + 'Cache',
                idProp: options.idProp,
                algebra: options.algebra
            });
            behaviors.push('fall-through-cache');
        }
        options.ajax = $.ajax;
        return connect(behaviors, options);
    };
    module.exports = connect.superMap;
});
//# sourceMappingURL=super-map.js.map