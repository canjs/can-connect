"use strict";
var each = require("can-util/js/each/each");

var connect = require("can-connect");
var canBatch = require("can-event/batch/batch");
var canEvent = require("can-event");
var Observation = require("can-observation");

var isPlainObject = require("can-util/js/is-plain-object/is-plain-object");
var isArray = require("can-util/js/is-array/is-array");
var types = require("can-types");
var each = require("can-util/js/each/each");
var isFunction = require("can-util/js/is-function/is-function");
var dev = require("can-util/js/dev/dev");

var setExpando = function(map, prop, value) {
	if("attr" in map) {
		map[prop] = value;
	} else {
		map._data[prop] = value;
	}
};
var getExpando = function(map, prop) {
	if("attr" in map) {
		return map[prop];
	} else {
		return map._data[prop];
	}
};

var canMapBehavior = connect.behavior("can/map",function(baseConnection){

	// overwrite
	var behavior = {
		init: function(){
			this.Map = this.Map || types.DefaultMap.extend({});
			this.List = this.List || types.DefaultList.extend({});
			overwrite(this, this.Map, mapOverwrites, mapStaticOverwrites);
			overwrite(this, this.List, listPrototypeOverwrites, listStaticOverwrites);
			baseConnection.init.apply(this, arguments);
		},
		/**
		 * @function can-connect/can/map/map.id id
		 * @parent can-connect/can/map/map.identifiers
		 *
		 * Returns a unique identifier value for an instance.
		 *
		 * @signature `connection.id( instance )`
		 *
		 *   Reads the [can-connect/base/base.algebra]'s id so that it's observable unless
		 *   the id is being read as part of the map being bound or
		 *   unbound.
		 *
		 *   @param {can-connect/Instance} instance
		 *
		 *   @return {*}
		 */
		id: function(instance) {

			if(!isPlainObject(instance)) {
				var ids = [],
					algebra = this.algebra;

				if(algebra && algebra.clauses && algebra.clauses.id) {
					for(var prop in algebra.clauses.id) {
						ids.push(readObservabe(instance,prop));
					}
				}

				if(this.idProp && !ids.length) {
					ids.push(readObservabe(instance,this.idProp));
				}
				if(!ids.length) {
					ids.push(readObservabe(instance,"id"));
				}

				// Use `__get` instead of `attr` for performance. (But that means we have to remember to call `Observation.add`.)
				return ids.length > 1 ? ids.join("@|@"): ids[0];
			} else {
				return baseConnection.id(instance);
			}
		},
		/**
		 * @function can-connect/can/map/map.serializeInstance serializeInstance
		 * @parent can-connect/can/map/map.serializers
		 *
		 * Calls `instance.serialize()`.
		 *
		 * @signature `connection.serializeInstance( instance )`
		 *
		 *   Simply calls [can-define/map/map.prototype.serialize] on the underlying map.
		 */
		serializeInstance: function(instance){
			return instance.serialize();
		},
		/**
		 * @function can-connect/can/map/map.serializeList serializeList
		 * @parent can-connect/can/map/map.serializers
		 *
		 * Calls `list.serialize()`.
		 *
		 * @signature `connection.serializeList( list )`
		 *
		 *   Simply calls [can-define/list/list.prototype.serialize] on the underlying list.
		 */
		serializeList: function(list){
			return list.serialize();
		},
		/**
		 * @property {Map} can-connect/can/map/map._Map Map
		 * @parent can-connect/can/map/map.hydrators
		 *
		 * Specify what type of `Map` should be hydrated.
		 *
		 * @option {Map} Defaults to [can-types.DefaultMap] if a Map is
		 * not specified.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```js
		 * var DefineMap = require("can-define/map/map");
		 *
		 * var Todo = DefineMap.extend({
		 *   completed: "boolean",
		 *   complete: function(){
		 *     this.completed = true
		 *   }
		 * });
		 *
		 * var todoConnection = connect([
		 *   require("can-connect/can/map/map"),
		 *   require("can-connect/constructor/constructor"),
		 *   require("can-connect/data/url/url")
		 * ],{
		 *   Map: Todo,
		 *   url: "/todos"
		 * })
		 * ```
		 */
		//
		/**
		 * @property {CanList} can-connect/can/map/map._List List
		 * @parent can-connect/can/map/map.hydrators
		 *
		 * Specify what type of `CanList` should be hydrated.
		 *
		 * @option {CanList} Defaults to [can-connect/can/map/map._Map]'s `.List` and
		 * then [can-util/js/types/types.DefaultList] if `connection.List` is not specified.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```js
		 * var DefineMap = require("can-define/map/map");
		 * var DefineList = require("can-define/list/list");
		 *
		 * var Todo = DefineMap.extend({
		 *   completed: "boolean",
		 *   complete: function(){
		 *     this.completed = true
		 *   }
		 * });
		 *
		 * var Todo.List = DefineList.extend({
		 *   "*": Todo,
		 *   completed: function(){
		 *     this.filter(function(todo){
		 *       return todo.completed;
		 *     });
		 *   }
		 * });
		 *
		 * var todoConnection = connect([
		 *   require("can-connect/can/map/map"),
		 *   require("can-connect/constructor/constructor"),
		 *   require("can-connect/data/url/url")
		 * ],{
		 *   Map: Todo,
		 *   List: Todo.List,
		 *   url: "/todos"
		 * });
		 * ```
		 */
		//
		/**
		 * @function can-connect/can/map/map.instance instance
		 * @parent can-connect/can/map/map.hydrators
		 *
		 * Creates a `Map` instance.
		 *
		 * @signature `connection.instance( props )`
		 *
		 *   Uses the [can-connect/can/map/map._Map] property if available, otherwise
		 *   creates the [can-types.DefaultMap].
		 *
		 *   @param {Object} props The raw instance data.
		 *   @return {Map} An observable map type.
		 */
		instance: function(props){
			var _Map = this.Map || types.DefaultMap;
			return new _Map(props);
		},
		/**
		 * @function can-connect/can/map/map.list list
		 * @parent can-connect/can/map/map.hydrators
		 *
		 * Creates a `List` instance given raw data.
		 *
		 * @signature `connection.list(listData, set)`
		 *
		 *   Uses the [can-connect/can/map/map._List] property if available, otherwise
		 *   creates the [can-connect/can/map/map._Map].List if available, and then finally
		 *   defaults to [can-util/js/types/types.DefaultList].
		 *
		 *   This will add properties on `listData` to the list too.
		 *
		 *   @param {can-connect.listData} listData The raw list data.
		 *   @param {can-set/Set} set The set the data belongs to.
		 *   @return {can-connect.List} An observable list.
		 */
		list: function(listData, set){
			var _List = this.List || (this.Map && this.Map.List) || types.DefaultList;
			var list = new _List(listData.data);
			each(listData, function (val, prop) {
				if (prop !== 'data') {
					list[list.set ? "set" : "attr"](prop, val);
				}
			});

			list.__listSet = set;
			return list;
		},
		/**
		 * @function can-connect/can/map/map.updatedList updatedList
		 * @parent can-connect/can/map/map.instance-callbacks
		 *
		 * Updates a list with response data.
		 *
		 * @signature `connection.updatedList( list, listData, set)`
		 *
		 *   Updates the list within a batch event. Overwrite this if you want custom updating behavior.
		 *
		 *   @param {can-connect.List} list The list to be updated.
		 *   @param {can-connect.listData} listData Raw list data.
		 *   @param {can-set/Set} set The set of the list being updated.
		 */
		updatedList: function(){
			canBatch.start();
			var res = baseConnection.updatedList.apply(this, arguments);
			canBatch.stop();
			return res;
		},
		save: function(instance){
			setExpando(instance, "_saving", true);
			canEvent.dispatch.call(instance, "_saving", [true, false]);
			var done = function(){
				setExpando(instance, "_saving", false);
				canEvent.dispatch.call(instance, "_saving", [false, true]);
			};
			var base = baseConnection.save.apply(this, arguments);
			base.then(done,done);
			return base;
		},
		destroy: function(instance){
			setExpando(instance, "_destroying", true);
			canEvent.dispatch.call(instance, "_destroying", [true, false]);
			var done = function(){
				setExpando(instance, "_destroying", false);
				canEvent.dispatch.call(instance, "_destroying", [false, true]);
			};
			var base = baseConnection.destroy.apply(this, arguments);
			base.then(done,done);
			return base;
		}
	};

	each([
		/**
		 * @function can-connect/can/map/map.createdInstance createdInstance
		 * @parent can-connect/can/map/map.instance-callbacks
		 *
		 * Updates the instance with the response from [can-connect/connection.createData].
		 *
		 * @signature `connection.createdInstance( instance, props )`
		 *
		 *   Updates the instance with `props` and dispatches a
		 *   "created" event on the map and the map's constructor function.
		 *
		 *   @param {Map} instance a Map instance
		 *   @param {Object} props the updated properties
		 */
		"created",
		/**
		 * @function can-connect/can/map/map.updatedInstance updatedInstance
		 * @parent can-connect/can/map/map.instance-callbacks
		 *
		 * Updates the instance with the response from [can-connect/connection.updateData].
		 *
		 * @signature `connection.updatedInstance( instance, props )`
		 *
		 *   Updates the instance with `props` and dispatches a
		 *   "updated" event on the map and the map's constructor function.
		 */
		"updated",
		/**
		 * @function can-connect/can/map/map.destroyedInstance destroyedInstance
		 * @parent can-connect/can/map/map.instance-callbacks
		 *
		 * Updates the instance with the response from [can-connect/connection.destroyData].
		 *
		 * @signature `connection.destroyedInstance( instance, props )`
		 *
		 *   Updates the instance with `props` and dispatches a
		 *   "destroyed" event on the map and the map's constructor function.
		 */
		"destroyed"
	], function (funcName) {
		// Each of these is pretty much the same, except for the events they trigger.
		behavior[funcName+"Instance"] = function (instance, props) {

			// Update attributes if attributes have been passed
			if(props && typeof props === 'object') {
				if("set" in instance) {
					instance.set(isFunction(props.get) ? props.get() : props, this.constructor.removeAttr || false);
				} else if("attr" in instance) {
					instance.attr(isFunction(props.attr) ? props.attr() : props, this.constructor.removeAttr || false);
				} else {
					canBatch.start();
					each(props, function(value, prop){
						instance[prop] = value;
					});
					canBatch.stop();
				}
			}

			canMapBehavior.callbackInstanceEvents(funcName, instance);
		};
	});


	return behavior;

});

/**
 * @function can-connect/can/map/map.callbackInstanceEvents callbackInstanceEvents
 * @parent can-connect/can/map/map.static
 *
 * Dispatch events for instance callbacks, e.g. [can-connect/can/map/map.updatedInstance].
 *
 * @signature `canMapBehavior.callbackInstanceEvents( cbName, instance )`
 *
 *   Dispatches events in the end of instance callbacks. This static method could be useful for overriding
 *   instance callbacks. E.g.: to override `updatedInstance` callback:
 *
 *   ```
 *   connect( [ canMap, {
 *       updatedInstance: function( instance, props ) {
 *           instance = smartMerge( instance, props );
 *           canMapBehavior.callbackInstanceEvents( "updated", instance );
 *       }
 *   } ], {} )
 *   ```
 *
 *   @param {String} cbName Callback name prefix, e.g. ("created" | "updated" | "destroyed") to form a string "createdInstance", etc.
 *   @param {Map} instance A Map instance.
 */
canMapBehavior.callbackInstanceEvents = function (funcName, instance) {
	var constructor = instance.constructor;

	// triggers change event that bubble's like
	// handler( 'change','1.destroyed' ). This is used
	// to remove items on destroyed from Model Lists.
	// but there should be a better way.
	canEvent.dispatch.call(instance, {type: funcName, target: instance});

	//!steal-remove-start
	if (this.id) {
		dev.log("can-connect/can/map/map.js - " + (constructor.shortName || this.name) + " " + this.id(instance) + " " + funcName);
	}
	//!steal-remove-end

	// Call event on the instance's Class
	canEvent.dispatch.call(constructor, funcName, [instance]);
};

var callCanReadingOnIdRead = true;


var mapStaticOverwrites = {
	/**
	 * @function can-connect/can/map/map.getList getList
	 * @parent can-connect/can/map/map.map-static
	 *
	 * Gets a list of instances of the map type.
	 *
	 * @signature `Map.getList(set)`
	 *
	 *   @param {can-set/Set} set
	 *   @return {Promise<CanList>}
	 *
	 * @body
	 *
	 * ## Use
	 *
	 * ```
	 * var Todo = DefineMap.extend({
	 *   id: "number",
	 *   complete: "boolean",
	 *   name: "string"
	 * });
	 *
	 * connect([
	 *   require("can-connect/can/map/map"),
	 *   require("can-connect/constructor/constructor"),
	 *   require("can-connect/data/url/url")
	 * ],{
	 *   Map: Todo,
	 *   url: "/todos"
	 * })
	 *
	 * Todo.getList({due: "today"}).then(function(todos){
	 *
	 * });
	 * ```
	 */
	getList: function (base, connection) {
		return function(set) {
			return connection.getList(set);
		};
	},
	/**
	 * @function can-connect/can/map/map.findAll findAll
	 * @parent can-connect/can/map/map.map-static
	 * @hide
	 *
	 * Alias of [can-connect/can/map/map.getList]. You should use `.getList()`.
	 */
	findAll: function (base, connection) {
		return function(set) {
			return connection.getList(set);
		};
	},
	/**
	 * @function can-connect/can/map/map.get get
	 * @parent can-connect/can/map/map.map-static
	 *
	 * Gets an instance of the map type.
	 *
	 * @signature `Map.get(params)`
	 *
	 *   @param {Object} [params]
	 *   @return {Promise<Map>}
	 *
	 * @body
	 *
	 * ## Use
	 *
	 * ```js
	 * var Todo = DefineMap.extend({
	 *   id: "number",
	 *   complete: "boolean",
	 *   name: "string"
	 * });
	 *
	 * connect([
	 *   require("can-connect/can/map/map"),
	 *   require("can-connect/constructor/constructor"),
	 *   require("can-connect/data/url/url")
	 * ],{
	 *   Map: Todo,
	 *   url: "/todos"
	 * })
	 *
	 * Todo.get({id: 5}).then(function(todo){
	 *
	 * });
	 * ```
	 */
	get: function (base, connection) {
		return function(params) {
			// adds .then for compat
			return connection.get(params);
		};
	},
	/**
	 * @function can-connect/can/map/map.findOne findOne
	 * @parent can-connect/can/map/map.map-static
	 * @hide
	 *
	 * Alias of [can-connect/can/map/map.get]. You should use `.get()`.
	 */
	findOne: function (base, connection) {
		return function(params) {
			// adds .then for compat
			return connection.get(params);
		};
	}
};

var mapOverwrites = {	// ## can.Model#bind and can.Model#unbind
	// These aren't actually implemented here, but their setup needs to be changed to account for the store.
	_eventSetup: function (base, connection) {
		return function(){
			callCanReadingOnIdRead = false;
			connection.addInstanceReference(this);
			callCanReadingOnIdRead = true;
			return base.apply(this, arguments);
		};
	},
	_eventTeardown: function (base, connection) {
		return function(){
			callCanReadingOnIdRead = false;
			connection.deleteInstanceReference(this);
			callCanReadingOnIdRead = true;
			return base.apply(this, arguments);
		};
	},
	// Change the behavior of `___set` to account for the store.
	___set: function (base, connection) {
		return function(prop, val){
			base.apply(this, arguments);
			if ( prop === connection.idProp && this.__bindEvents && this.__bindEvents._lifecycleBindings ) {
				connection.addInstanceReference(this);
			}
		};
	},
	isNew: function (base, connection) {
		/**
		 * @function can-connect/can/map/map.prototype.isNew isNew
		 * @parent can-connect/can/map/map.map
		 *
		 * Returns if the map has not been persisted.
		 *
		 * @signature `map.isNew()`
		 *
		 *   Returns `true` if [can-connect/base/base.id] is 0 or truthy.
		 *
		 *   @return {Boolean}
		 */
		return function () {
			var id = connection.id(this);
			// 0 is a valid ID.
			// TODO: Why not `return id === null || id === undefined;`?
			return !(id || id === 0); // If `null` or `undefined`
		};
	},
	isSaving: function (base, connection) {
		/**
		 * @function can-connect/can/map/map.prototype.isSaving isSaving
		 * @parent can-connect/can/map/map.map
		 *
		 * Returns if the map is currently being saved.
		 *
		 * @signature `map.isSaving()`
		 *
		 *   Returns `true` if .save() has been called, but has not resolved yet.
		 *
		 *   @return {Boolean}
		 */
		return function () {
			Observation.add(this,"_saving");
			return !!getExpando(this, "_saving");
		};
	},
	isDestroying: function (base, connection) {
		/**
		 * @function can-connect/can/map/map.prototype.isDestroying isDestroying
		 * @parent can-connect/can/map/map.map
		 *
		 * Returns if the map is currently being destroyed.
		 *
		 * @signature `map.isDestroying()`
		 *
		 * Observes if the promise returned by `.destroy()` has completed.  This is
		 * often used in template like:
		 *
		 * ```
		 * <button ($click)="todo.destroy()"
		 *    {{#todo.isDestroying}}disabled{{/todo.isDestroying}}>
		 *   X
		 * </button>
		 * ```
		 *
		 *   @return {Boolean} `true` if `.destroy()` has been called but is not resolved yet.
		 */
		return function () {
			Observation.add(this,"_destroying");
			return !!getExpando(this, "_destroying");
		};
	},
	save: function (base, connection) {
		/**
		 * @function can-connect/can/map/map.prototype.save save
		 * @parent can-connect/can/map/map.map
		 *
		 * Persists the map's data to the connection.
		 *
		 * @signature `map.save( [success], [error] )`
		 *
		 *   Calls [can-connect/connection.save].
		 *
		 *   @param {function} [success] A function that is called if the save is successful.
		 *   @param {function} [error] A function that is called if the save is rejected.
		 *   @return {Promise<Instance>} A promise that resolves to the instance is successful.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var Todo = DefineMap.extend({
		 *   id: "number",
		 *   complete: "boolean",
		 *   name: "string"
		 * });
		 *
		 * connect([
		 *   require("can-connect/can/map/map"),
		 *   require("can-connect/constructor/constructor"),
		 *   require("can-connect/data/url/url")
		 * ],{
		 *   Map: Todo,
		 *   url: "/todos"
		 * })
		 *
		 * new Todo({name: "dishes"}).save();
		 * ```
		 */
		return function(success, error){
			// return only one item for compatability
			var promise = connection.save(this);
			promise.then(success,error);
			return promise;
		};
	},
	destroy: function (base, connection) {
		/**
		 * @function can-connect/can/map/map.prototype.destroy destroy
		 * @parent can-connect/can/map/map.map
		 *
		 * Delete's the instance with the connection.
		 *
		 * @signature `map.destroy( [success], [error] )`
		 *
		 *   @param {function} [success] A function that is called if the destroy is successful.
		 *   @param {function} [error] A function that is called if the destroy is rejected.
		 *   @return {Promise<Instance>} A promise that resolves to the instance is successful.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var Todo = DefineMap.extend({
		 *   id: "number",
		 *   complete: "boolean",
		 *   name: "string"
		 * });
		 *
		 * connect([
		 *   require("can-connect/can/map/map"),
		 *   require("can-connect/constructor/constructor"),
		 *   require("can-connect/data/url/url")
		 * ],{
		 *   Map: Todo,
		 *   url: "/todos"
		 * })
		 *
		 * new Todo({name: "dishes"}).save(function(todo){
		 *   todo.destroy();
		 * });
		 * ```
		 */
		return function(success, error){
			var promise;
			if (this.isNew()) {

				promise = Promise.resolve(this);
				connection.destroyedInstance(this, {});
			} else {
				promise = connection.destroy(this);
			}

			promise.then(success,error);
			return promise;
		};
	}
};

var listPrototypeOverwrites = {
	setup: function(base, connection){
		return function (params) {
			// If there was a plain object passed to the List constructor,
			// we use those as parameters for an initial getList.
			if (isPlainObject(params) && !isArray(params)) {
				this.__listSet = params;
				base.apply(this);
				this.replace(types.isPromise(params) ? params : connection.getList(params));
			} else {
				// Otherwise, set up the list like normal.
				base.apply(this, arguments);
			}
		};
	},
	_eventSetup: function (base, connection) {
		return function(){
			connection.addListReference(this);
			if(base) {
				return base.apply(this, arguments);
			}
		};
	},
	_eventTeardown: function (base, connection) {
		return function(){
			connection.deleteListReference(this);
			if(base) {
				return base.apply(this, arguments);
			}
		};
	}
};



var listStaticOverwrites = {
	_bubbleRule: function(base, connection) {
		return function(eventName, list) {
			var bubbleRules = base(eventName, list);
			bubbleRules.push('destroyed');
			return bubbleRules;
		};
	}
};

var readObservabe = function(instance, prop){
	if("__get" in instance) {
		if(callCanReadingOnIdRead) {
			Observation.add(instance, prop);
		}
		return instance.__get(prop);
	} else {
		if(callCanReadingOnIdRead) {
			return instance[prop];
		} else {
			return Observation.ignore(function(){
				return instance[prop];
			})();
		}
	}

};

var overwrite = function( connection, Constructor, prototype, statics) {
	var prop;

	for(prop in prototype) {
		Constructor.prototype[prop] = prototype[prop](Constructor.prototype[prop], connection);
	}
	if(statics) {
		for(prop in statics) {
			Constructor[prop] = statics[prop](Constructor[prop], connection);
		}
	}
};

module.exports = canMapBehavior;