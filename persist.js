
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

var pairs = {
	getListData: {prop: "findAll", type: "GET", parse: "parseListData"},
	getInstanceData: {prop: "findOne", type: "GET"},
	createInstanceData: {prop: "create", type: "POST"},
	updateInstanceData: {prop: "update", type: "PUT"},
	destroyInstanceData: {prop: "destroy", type: "DELETE"}
};

/**
 * @module can-connect/persist-url
 * 
 * Provides getListData, getInstanceData, etc, and
 * hooks them up to parse
 */
module.exports = connect.behavior("persist",function(baseConnect, options){
	
	var behavior = {};
	can.each(pairs, function(reqOptions, name){
		behavior[name] = function(params){
			if(typeof options[reqOptions.prop] === "function"){
				return options[reqOptions.prop](params);
			} 
			else if(options[reqOptions.prop]) {
				return ajax(options[reqOptions.prop], params, reqOptions.type);
			} else {
				return baseConnect.getListData(params);
			}
		};
	});
	
	return behavior;
	
});
