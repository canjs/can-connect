var helpers = require("./helpers/");
/**
 *
 * @param {Array<String,Behavior,function>} behaviors - An array of behavior names or custom behaviors.
 * The order of named execution gets run in order.
 * @param {Object} options
 */
var connect = function(behaviors, options){

	behaviors = helpers.map.call(behaviors, function(behavior, index){
		var sortedIndex;
		if(typeof behavior === "string") {
			sortedIndex = helpers.indexOf.call(connect.order, behavior);
			behavior = behaviorsMap[behavior];
		} else if(behavior.isBehavior) {

		} else {
			behavior = connect.behavior(behavior);
		}

		return {
			originalIndex: index,
			sortedIndex: sortedIndex,
			behavior: behavior
		};
	})
		.sort(function(b1, b2){
			// if both have a sorted index
			if(b1.sortedIndex != null && b2.sortedIndex != null) {
				return b1.sortedIndex - b2.sortedIndex;
			}
			return b1.originalIndex - b2.originalIndex;
		})

	behaviors = helpers.map.call(behaviors, function(b){
		return b.behavior;
	});

	var behavior = core( connect.behavior("options",function(){return options; })() );

	helpers.forEach.call(behaviors, function(behave){
		behavior = behave(behavior);
	});
	if(behavior.init) {
		behavior.init();
	}
	return behavior;
};

connect.order = ["data-localstorage-cache","data-url","data-parse","cache-requests","data-combine-requests",

	"constructor","constructor-store","can-map",
	"fall-through-cache","data-inline-cache",

	"data-worker",

	"data-callbacks-cache","data-callbacks","constructor-callbacks-once"
	];

connect.behavior = function(name, behavior){
	if(typeof name !== "string") {
		behavior = name;
		name = undefined;
	}
	var behaviorMixin = function(base){
		// basically Object.create
		var Behavior = function(){};
		Behavior.name = name;
		Behavior.prototype = base;
		var newBehavior = new Behavior;
		// allows behaviors to be a simple object, not always a function
		var res = typeof behavior === "function" ? behavior.apply(newBehavior, arguments) : behavior;
		helpers.extend(newBehavior, res);
		newBehavior.__behaviorName = name;
		return newBehavior;
	};
	if(name) {
		behaviorMixin.name = name;
		behaviorsMap[name] = behaviorMixin;
	}
	behaviorMixin.isBehavior = true;
	return behaviorMixin;
};

var behaviorsMap = {};

/**
 * @function {Behavior} connect.base base
 * @parent can-connect.behaviors
 *
 * The base behavior added to every `connect` behavior.
 *
 * @signature `base(options)`
 *
 * @body
 *
 * ## Use
 *
 * The `"base"` behavior is added automatically to every connection created by `connect`. So even we do:
 *
 * ```
 * var connection = connect([],{});
 * ```
 *
 * The connection still has `"base"` functionality:
 *
 * ```
 * connection.id({id: 1}) //-> 1
 * ```
 */
var core = connect.behavior("base",function(base){
	return {
		/**
		 * @function connect.base.id id
		 * @parent connect.base
		 *
		 * Uniquely identify an instance or raw instance data.
		 *
		 * @signature `connection.id(instance)`
		 *
		 *   Returns the [connect.base.idProp] if it exists, otherwise the `id` property.
		 *
		 *   @param {Instance|Object} instance The instance or raw `props` for an instance.
		 *
		 *   @return {String|Number} A string or number uniquely representing `instance`.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * Many extensions, such as the [can-connect/constructor/store], need
		 * to have a unique identifier for an instance or instance data.  The
		 * `connection.id` method should return that.
		 *
		 * Typically, an item's `id` is a simply propertly value on the object.
		 * For example, `todo` data might look like:
		 *
		 * ```
		 * {_id: 5, name: "do the dishes"}
		 * ```
		 *
		 * In this case [connect.base.idProp] should be set to `"_id"`.  However,
		 * some data sources have compound ids.  For example, "Class Assignment"
		 * connection might be represented by two properties, the `studentId` and the
		 * `classId`.  For this kind of setup, you can provide your own id function as
		 * follows:
		 *
		 * ```
		 * var overwrites = {
		 *   id: function(classAssignment){
		 *     return classAssignment.studentId+"-"+classAssignment.classId;
		 *   }
		 * };
		 * var classAssignmentConnection = connect(['data-url', overwrites],{
		 *   url: "/class_assignments"
		 * });
		 * ```
		 *
		 */
		id: function(instance){
			return instance[this.idProp || "id"];
		},
		/**
		 * @property {String} connect.base.idProp idProp
		 * @parent connect.base
		 *
		 * Specifies the property that uniquely identifies an instance.
		 *
		 * @option {String} The name of the property that uniquely identifies
		 * an instance.  Defaults to `"id"`.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * connect(["data-url"],{
		 *   idProp: "_id"
		 * });
		 * ```
		 *
		 */
		idProp: base.idProp || "id",
		/**
		 * @function connect.base.listSet listSet
		 * @parent connect.base
		 *
		 * Uniquely identify the set a list represents.
		 *
		 * @signature `connection.listSet(list)`
		 *
		 *   Returns the [connect.base.listSetProp] if it exists.
		 *
		 *   @param {List} list A list instance.
		 *
		 *   @return {Object} An object that can be passed to `JSON.stringify`
		 *   to represent the list.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * Many extensions, such as the [can-connect/constructor/store], need
		 * to have a unique identifier for a list.  The
		 * `connection.listSet` method should return that.
		 *
		 * Typically, an item's `set` is an expando property added to
		 * a list.  For example, a list of todos might looks like todos
		 * after the following has run:
		 *
		 * ```
		 * var todos = [{_id: 5, name: "do the dishes"}]
		 * todos.set = {due: 'today'};
		 * ```
		 *
		 * In this case [connect.base.listSetProp] should be set to `"set"`.
		 *
		 */
		listSet: function(list){
			return list[this.listSetProp];
		},
		/**
		 * @property {String} connect.base.listSetProp listSetProp
		 * @parent connect.base
		 *
		 * Specifies the property that uniquely identifies a list.
		 *
		 * @option {String} The name of the property that uniquely identifies
		 * the list.  Defaults to `"__listSet"`.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * connect(["data-url"],{
		 *   listSetProp: "set"
		 * });
		 * ```
		 *
		 */
		listSetProp: "__listSet",
		init: function(){}
		/**
		 * @property {set.Algebra} connect.base.algebra algebra
		 * @parent connect.base
		 *
		 * @option {set.Algebra} A [set algebra](https://github.com/canjs/can-set#setalgebra) that is used by
		 * many behaviors to compare the `set` objects passed to
		 * [connection.getListData] and [connection.getList]. By
		 * default no algebra is provided.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var algebra = new set.Algebra(set.comparators.range("start","end"));
		 *
		 * connect([...behavior names...],{
		 *   algebra: algebra
		 * });
		 * ```
		 */
		/**
		 * @property {connection} connect.base.cacheConnection cacheConnection
		 * @parent connect.base
		 *
		 * A connection used for caching.
		 *
		 * @option {connection} A connection that can be used for
		 * "Data Interface" requests. Several behaviors
		 * look for this property.  By `cacheConnection` is null.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var cacheConnection = connect(['memory-cache'],{})
		 *
		 * connect([...behavior names...],{
		 *   cacheConnection: cacheConnection
		 * });
		 * ```
		 */
	};
});

connect.base = core;



module.exports = connect;
