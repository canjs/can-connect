
/**
 * @module {function} can-connect/can/super-map can/super-map
 * @parent can-connect.modules
 * 
 * Create connection with many of the best behaviors in can-connect and hook it up to a map.
 * 
 * @signature `superMap(options)`
 * 
 *   Creates a connection with the following behaviors: [can-connect/constructor],
 *   [can-connect/can/map],
 *   [can-connect/constructor/store],
 *   [can-connect/data/callbacks],
 *   [can-connect/data/callbacks-cache],
 *   [can-connect/data/combine-requests],
 *   [can-connect/data/inline-cache],
 *   [can-connect/data-parse],
 *   [can-connect/data-url],
 *   [can-connect/real-time],
 *   [can-connect/constructor/callbacks-once].
 * 
 *   And creates a [can-connect/data/localstorage-cache] to use as a [connect.base.cacheConnection].
 * 
 * @body 
 * 
 * ## Use
 * 
 * ```
 * var Todo = can.Map.extend({ ... });
 * TodoList = can.List.extend({Map: Todo},{ ... });
 * 
 * 
 * var todoConnection = superMap({
 *   idProp: "_id",
 *   Map: Todo,
 *   List: TodoList,
 *   url: "/services/todos"
 * });
 * ```
 */
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
		options.cacheConnection = connect(["data-localstorage-cache"],{
			name: options.name+"Cache",
			idProp: options.idProp,
			algebra: options.algebra
		});
		behaviors.push("fall-through-cache");
	}
	options.ajax = $.ajax;

	return connect(behaviors,options);
};

module.exports = connect.superMap;



