/*can-connect@0.5.0-pre.2#data/url/url*/
var isArray = require('../../helpers/helpers.js').isArray;
var connect = require('../../can-connect.js');
var helpers = require('../../helpers/helpers.js');
var ajax = require('../../helpers/ajax.js');
module.exports = connect.behavior('data-url', function (baseConnect) {
    var behavior = {};
    helpers.each(pairs, function (reqOptions, name) {
        behavior[name] = function (params) {
            if (typeof this.url === 'object') {
                if (typeof this.url[reqOptions.prop] === 'function') {
                    return this.url[reqOptions.prop](params);
                } else if (this.url[reqOptions.prop]) {
                    return makeAjax(this.url[reqOptions.prop], params, reqOptions.type, this.ajax || ajax);
                }
            }
            var resource = typeof this.url === 'string' ? this.url : this.url.resource;
            if (resource && this.idProp) {
                return makeAjax(createURLFromResource(resource, this.idProp, reqOptions.prop), params, reqOptions.type, this.ajax || ajax);
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
            type: 'DELETE'
        }
    };
var makeAjax = function (ajaxOb, data, type, ajax) {
    var params = {};
    if (typeof ajaxOb === 'string') {
        var parts = ajaxOb.split(/\s+/);
        params.url = parts.pop();
        if (parts.length) {
            params.type = parts.pop();
        }
    } else {
        helpers.extend(params, ajaxOb);
    }
    params.data = typeof data === 'object' && !isArray(data) ? helpers.extend(params.data || {}, data) : data;
    params.url = helpers.sub(params.url, params.data, true);
    return ajax(helpers.extend({
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
//# sourceMappingURL=url.js.map