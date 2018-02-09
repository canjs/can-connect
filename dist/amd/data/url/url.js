/*can-connect@1.5.17#data/url/url*/
define([
    'require',
    'exports',
    'module',
    'can-util/js/assign',
    'can-util/js/each',
    'can-ajax',
    'can-util/js/string',
    '../../helpers/get-id-props',
    'can-util/js/dev',
    '../../can-connect',
    'can-make-rest',
    'can-util/js/make-promise'
], function (require, exports, module) {
    var assign = require('can-util/js/assign');
    var each = require('can-util/js/each');
    var ajax = require('can-ajax');
    var string = require('can-util/js/string');
    var getIdProps = require('../../helpers/get-id-props');
    var dev = require('can-util/js/dev');
    var connect = require('../../can-connect');
    var makeRest = require('can-make-rest');
    var defaultRest = makeRest('/resource/{id}');
    var makePromise = require('can-util/js/make-promise');
    var urlBehavior = connect.behavior('data/url', function (baseConnection) {
        var behavior = {};
        each(defaultRest, function (defaultData, dataInterfaceName) {
            behavior[dataInterfaceName] = function (params) {
                var meta = methodMetaData[dataInterfaceName];
                if (typeof this.url === 'object') {
                    if (typeof this.url[dataInterfaceName] === 'function') {
                        return makePromise(this.url[dataInterfaceName](params));
                    } else if (this.url[dataInterfaceName]) {
                        var promise = makeAjax(this.url[dataInterfaceName], params, defaultData.method, this.ajax || ajax, findContentType(this.url, defaultData.method), meta);
                        return makePromise(promise);
                    }
                }
                var resource = typeof this.url === 'string' ? this.url : this.url.resource;
                if (resource) {
                    var idProps = getIdProps(this);
                    var resourceWithoutTrailingSlashes = resource.replace(/\/+$/, '');
                    var result = makeRest(resourceWithoutTrailingSlashes, idProps[0])[dataInterfaceName];
                    return makePromise(makeAjax(result.url, params, result.method, this.ajax || ajax, findContentType(this.url, result.method), meta));
                }
                return baseConnection[name].call(this, params);
            };
        });
        return behavior;
    });
    var methodMetaData = {
        getListData: {},
        getData: {},
        createData: {},
        updateData: {},
        destroyData: { includeData: false }
    };
    var findContentType = function (url, method) {
        if (typeof url === 'object' && url.contentType) {
            var acceptableType = url.contentType === 'application/x-www-form-urlencoded' || url.contentType === 'application/json';
            if (acceptableType) {
                return url.contentType;
            } else {
            }
        }
        return method === 'GET' ? 'application/x-www-form-urlencoded' : 'application/json';
    };
    function urlParamEncoder(key, value) {
        return encodeURIComponent(value);
    }
    var makeAjax = function (ajaxOb, data, type, ajax, contentType, reqOptions) {
        var params = {};
        if (typeof ajaxOb === 'string') {
            var parts = ajaxOb.split(/\s+/);
            params.url = parts.pop();
            if (parts.length) {
                params.type = parts.pop();
            }
        } else {
            assign(params, ajaxOb);
        }
        params.data = typeof data === 'object' && !Array.isArray(data) ? assign(params.data || {}, data) : data;
        params.url = string.replaceWith(params.url, params.data, urlParamEncoder, true);
        params.contentType = contentType;
        if (reqOptions.includeData === false) {
            delete params.data;
        }
        return ajax(assign({
            type: type || 'post',
            dataType: 'json'
        }, params));
    };
    module.exports = urlBehavior;
});
//# sourceMappingURL=url.js.map