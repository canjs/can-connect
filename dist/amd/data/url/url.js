/*can-connect@0.6.0-pre.21#data/url/url*/
define(function (require, exports, module) {
    var isArray = require('can-util/js/is-array');
    var assign = require('can-util/js/assign');
    var each = require('can-util/js/each');
    var ajax = require('can-util/dom/ajax');
    var string = require('can-util/js/string');
    var getIdProps = require('../../helpers/get-id-props');
    var dev = require('can-util/js/dev');
    var connect = require('../../can-connect');
    var makePromise = require('can-util/js/make-promise');
    module.exports = connect.behavior('data/url', function (baseConnect) {
        var behavior = {};
        each(pairs, function (reqOptions, name) {
            behavior[name] = function (params) {
                if (typeof this.url === 'object') {
                    if (typeof this.url[reqOptions.prop] === 'function') {
                        return makePromise(this.url[reqOptions.prop](params));
                    } else if (this.url[reqOptions.prop]) {
                        return makePromise(makeAjax(this.url[reqOptions.prop], params, reqOptions.type, this.ajax || ajax, findContentType(this.url), reqOptions));
                    }
                }
                var resource = typeof this.url === 'string' ? this.url : this.url.resource;
                if (resource) {
                    var idProps = getIdProps(this);
                    return makePromise(makeAjax(createURLFromResource(resource, idProps[0], reqOptions.prop), params, reqOptions.type, this.ajax || ajax, findContentType(this.url), reqOptions));
                }
                return baseConnect[name].call(this, params);
            };
        });
        return behavior;
    });
    var pairs = {
        getListData: {
            prop: 'getListData',
            type: 'GET'
        },
        getData: {
            prop: 'getData',
            type: 'GET'
        },
        createData: {
            prop: 'createData',
            type: 'POST'
        },
        updateData: {
            prop: 'updateData',
            type: 'PUT'
        },
        destroyData: {
            prop: 'destroyData',
            type: 'DELETE',
            includeData: false
        }
    };
    var findContentType = function (url) {
        if (typeof url === 'object' && url.contentType) {
            var acceptableType = url.contentType === 'application/x-www-form-urlencoded' || url.contentType === 'application/json';
            if (acceptableType) {
                return url.contentType;
            } else {
                dev.warn('Unacceptable contentType on can-connect request. ' + 'Use \'application/json\' or \'application/x-www-form-urlencoded\'');
            }
        }
        return 'application/json';
    };
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
        params.data = typeof data === 'object' && !isArray(data) ? assign(params.data || {}, data) : data;
        params.url = string.sub(params.url, params.data, true);
        var encodeJSON = contentType !== 'application/x-www-form-urlencoded' && (type && (type === 'POST' || type === 'PUT'));
        if (encodeJSON) {
            params.data = JSON.stringify(params.data);
            params.contentType = contentType;
        }
        if (reqOptions.includeData === false) {
            delete params.data;
        }
        return ajax(assign({
            type: type || 'post',
            dataType: 'json'
        }, params));
    };
    var createURLFromResource = function (resource, idProp, name) {
        var url = resource.replace(/\/+$/, '');
        if (name === 'getListData' || name === 'createData') {
            return url;
        } else {
            return url + '/{' + idProp + '}';
        }
    };
});
//# sourceMappingURL=url.js.map