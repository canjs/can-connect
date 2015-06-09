
var can = require("can/util/util");
var connect = require("can-connect");

var ajax = function (ajaxOb, data, type, dataType) {

	var params = {};

	// A string here would be something like `"GET /endpoint"`.
	if (typeof ajaxOb === 'string') {
		// Split on spaces to separate the HTTP method and the URL.
		var parts = ajaxOb.split(/\s+/);
		params.url = parts.pop();
		if (parts.length) {
			params.type = parts.pop();
		}
	} else {
		// If the first argument is an object, just load it into `params`.
		can.extend(params, ajaxOb);
	}

	// If the `data` argument is a plain object, copy it into `params`.
	params.data = typeof data === "object" && !can.isArray(data) ?
		can.extend(params.data || {}, data) : data;

	// Substitute in data for any templated parts of the URL.
	params.url = can.sub(params.url, params.data, true);

	return can.ajax(can.extend({
		type: type || 'post',
		dataType: dataType || 'json'
	}, params));
};

var createURLFromResource = function(resource, idProp, name) {

	var url = resource.replace(/\/+$/, "");
	if (name === "findAllURL" || name === "createURL") {
		return url;
	} else {
		return url + "/{" + idProp + "}";
	}
};

var pairs = {
	getListData: {prop: "findAllURL", type: "GET"},
	getInstanceData: {prop: "findOneURL", type: "GET"},
	createInstanceData: {prop: "createURL", type: "POST"},
	updateInstanceData: {prop: "updateURL", type: "PUT"},
	destroyInstanceData: {prop: "destroyURL", type: "DELETE"}
};

/**
 * @module can-connect/data-url data-url
 * @parent can-connect.modules
 * 
 * Provides getListData, getInstanceData, etc, and
 * hooks them up to parse
 * 
 * @body
 * 
 * ```js
 * var persistBehavior = persist({
 *   findAll: "GET /todos"
 * });
 * 
 * persistBehavior.getListData({}) //-> promise(Array<items>)
 * ```
 */
module.exports = connect.behavior("data-url",function(baseConnect){
	
	var behavior = {};
	can.each(pairs, function(reqOptions, name){
		behavior[name] = function(params){
			if(typeof this[reqOptions.prop] === "function"){
				return this[reqOptions.prop](params);
			} 
			else if(this[reqOptions.prop]) {
				return ajax(this[reqOptions.prop], params, reqOptions.type);
			} else if( this.resource && (this.idProp || this.idProp) ) {
				return ajax( createURLFromResource(this.resource, this.idProp || this.idProp, reqOptions.prop ),  params, reqOptions.type  );
			} else {
				return baseConnect[name].call(this, params);
			}
		};
	});
	
	return behavior;
	
});
