var connect = require("can-connect");

require("../../constructor/");
require("../map/");
require("../can");
require("../../constructor/store/");
require("../../constructor/callbacks-once/");
require("../../data/callbacks/");
require("../../data/callbacks-cache/");
require("../../data/combine-requests/");
require("../../data/inline-cache/");
require("../../data/localstorage-cache/");
require("../../data/parse/");
require("../../data/url/");
require("../../fall-through-cache/");
require("../../real-time/");

var Map = require("can/map/map");
var List = require("can/list/list");

connect.superMap = function(options){

	var behaviors = [
		"constructor",
		"can-map",
		"constructor-store",
		"data-callbacks",
		"data-callbacks-cache",
		"data-combine-requests",
		"data-inline-cache",
		"data-parse",
		"data-url",
		"real-time",
		"constructor-callbacks-once"];

	if(typeof localStorage !== "undefined") {
		// if no cacheConnection provided, create one
		if(typeof options.cacheConnection === 'undefined') {
            options.cacheConnection = connect(['data-localstorage-cache'], {
                name: options.name + 'Cache',
                idProp: options.idProp,
                algebra: options.algebra
            });

        }else if ( options.cacheConnection.__behaviorName !== 'data-localstorage-cache' && options.cacheConnection.__behaviorName !== 'data-memory-cache') {
            options.cacheConnection = connect(['data-localstorage-cache'], {
                name: options.name + 'Cache',
                idProp: options.idProp,
                algebra: options.algebra
            });
        }
        // use the cacheConnection options if none are set by superMap
        options.name = options.name || options.cacheConnection.name;
        options.idProp = options.idProp || options.cacheConnection.idProp;
        options.algebra = options.algebra || options.cacheConnection.algebra;
        
		behaviors.push("fall-through-cache");
	}
	options.ajax = $.ajax;

	return connect(behaviors,options);
};

module.exports = connect.superMap;



