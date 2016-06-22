"use strict";
var each = require("can-util/js/each/each");

var connect = require("can-connect");
var canBatch = require("can-event/batch/batch");
var canEvent = require("can-event");
var Observation = require("can-observation");

var isPlainObject = require("can-util/js/is-plain-object/is-plain-object");
var isArray = require("can-util/js/is-array/is-array");
var types = require("can-util/js/types/types");
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

module.exports = connect.behavior("can-map",function(baseConnect){

	// overwrite
	var behavior = {
		init: function(){
			this.Map = this.Map || types.DefaultMap.extend({});
			this.List = this.List || types.DefaultList.extend({});
			overwrite(this, this.Map, mapOverwrites, mapStaticOverwrites);
			overwrite(this, this.List, listPrototypeOverwrites, listStaticOverwrites);
			baseConnect.init.apply(this, arguments);
		},
		/**
		 * @function can-connect/can/map.id id
		 * @parent can-connect/can/map.identifiers
		 *
		 * Returns a unique identifier value for an instance.
		 *
		 * @signature `connection.id( instance )`
		 *
		 *   Reads [connect.base.idProp] so that it's observable unless
		 *   the id is being read as part of the map being bound or
		 *   unbound.
		 *
		 *   @param {Instance} instance
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
				return baseConnect.id(instance);
			}
		},
		/**
		 * @function can-connect/can/map.serializeInstance serializeInstance
		 * @parent can-connect/can/map.serializers
		 *
		 * Calls `instance.serialize()`.
		 *
		 * @signature `connection.serializeInstance( instance )`
		 */
		serializeInstance: function(instance){
			return instance.serialize();
		},
		/**
		 * @function can-connect/can/map.serializeList serializeList
		 * @parent can-connect/can/map.serializers
		 *
		 * Calls `list.serialize()`.
		 *
		 * @signature `connection.serializeList( list )`
		 */
		serializeList: function(list){
			return list.serialize();
		},
		/**
		 * @property {CanMap} can-connect/can/map.Map Map
		 * @parent can-connect/can/map.hydrators
		 *
		 * Specify what type of `CanMap` should be hydrated.
		 *
		 * @option {CanMap} Defaults to `CanMap` if a Map is
		 * not specified.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var Todo = CanMap.extend({
		 *   complete: function(){
		 *     this.attr("complete", true);
		 *   }
		 * });
		 *
		 * var todoConnection = connect(["can/map","constructor","data-url"],{
		 *   Map: Todo,
		 *   url: "/todos"
		 * })
		 * ```
		 */
		//
		/**
		 * @property {CanList} can-connect/can/map._List List
		 * @parent can-connect/can/map.hydrators
		 *
		 * Specify what type of `CanList` should be hydrated.
		 *
		 * @option {CanList} Defaults to [can-connect/can/map.Map]'s `.List` and
		 * then `CanList` if `connection.List` is not specified.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var Todo = CanMap.extend({
		 *   complete: function(){
		 *     this.attr("complete", true);
		 *   }
		 * });
		 * var Todo.List = CanList.extend({Map: Todo},{
		 *   completed: function(){
		 *     this.filter(function(todo){
		 *       return todo.attr("complete");
		 *     });
		 *   }
		 * });
		 *
		 * var todoConnection = connect(["can/map","constructor","data-url"],{
		 *   Map: Todo,
		 *   List: Todo.List,
		 *   url: "/todos"
		 * });
		 * ```
		 */
		//
		/**
		 * @function can-connect/can/map.instance instance
		 * @parent can-connect/can/map.hydrators
		 *
		 * Creates a `Map` instance.
		 *
		 * @signature `connection.instance( props )`
		 *
		 *   Uses the [can-connect/can/map.Map] property if available, otherwise
		 *   creates the base `CanMap`.
		 */
		instance: function(props){
			var _Map = this.Map || types.DefaultMap;
			return new _Map(props);
		},
		/**
		 * @function can-connect/can/map.list list
		 * @parent can-connect/can/map.hydrators
		 *
		 * Creates a `CanList` instance given raw data.
		 *
		 * @signature `connection.list(listData, set)`
		 *
		 *   Uses the [can-connect/can/map._List] property if available, otherwise
		 *   creates the [can-connect/can/map.Map].List if available, and then finally
		 *   defaults to the base `CanList`.
		 *
		 *   This will add properties on `listData` to the list too.
		 *
		 *   @param {Object} listData
		 *   @param {Object} set
		 *   @return {List}
		 */
		list: function(listData, set){
			var _List = this.List || (this.Map && this.Map.List) || types.DefaultList;
			var list = new _List(listData.data);
			each(listData, function (val, prop) {
				if (prop !== 'data') {
					list.attr(prop, val);
				}
			});
			list.__listSet = set;
			return list;
		},
		/**
		 * @function can-connect/can/map.updatedList updatedList
		 * @parent can-connect/can/map.instance-callbacks
		 *
		 * Updates a list with response data.
		 *
		 * @signature `connection.updatedList( list, listData, set)`
		 *
		 *   Updates the list within a batch event.
		 */
		updatedList: function(){
			canBatch.start();
			var res = baseConnect.updatedList.apply(this, arguments);
			canBatch.stop();
			return res;
		},
		save: function(instance){
			setExpando(instance, "_saving", true);
			canBatch.trigger.call(instance, "_saving", [true, false]);
			var done = function(){
				setExpando(instance, "_saving", false);
				canBatch.trigger.call(instance, "_saving", [false, true]);
			};
			var base = baseConnect.save.apply(this, arguments);
			base.then(done,done);
			return base;
		},
		destroy: function(instance){
			setExpando(instance, "_destroying", true);
			canBatch.trigger.call(instance, "_destroying", [true, false]);
			var done = function(){
				setExpando(instance, "_destroying", false);
				canBatch.trigger.call(instance, "_destroying", [false, true]);
			};
			var base = baseConnect.destroy.apply(this, arguments);
			base.then(done,done);
			return base;
		}
	};

	each([
		/**
		 * @function can-connect/can/map.createdInstance createdInstance
		 * @parent can-connect/can/map.instance-callbacks
		 *
		 * Updates the instance with the response from [connection.createData].
		 *
		 * @signature `connection.createdInstance( instance, props )`
		 *
		 *   Updates the instance with `props` and dispatches a
		 *   "created" event on the map and the map's constructor function.
		 *
		 */
		"created",
		/**
		 * @function can-connect/can/map.updatedInstance updatedInstance
		 * @parent can-connect/can/map.instance-callbacks
		 *
		 * Updates the instance with the response from [connection.updateData].
		 *
		 * @signature `connection.createdInstance( instance, props )`
		 *
		 *   Updates the instance with `props` and dispatches a
		 *   "updated" event on the map and the map's constructor function.
		 */
		"updated",
		/**
		 * @function can-connect/can/map.destroyedInstance destroyedInstance
		 * @parent can-connect/can/map.instance-callbacks
		 *
		 * Updates the instance with the response from [connection.destroyData].
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
			var constructor = instance.constructor;

			// Update attributes if attributes have been passed
			if(props && typeof props === 'object') {
				if("attr" in instance) {
					instance.attr(isFunction(props.attr) ? props.attr() : props, this.constructor.removeAttr || false);
				} else {
					canBatch.start();
					each(props, function(value, prop){
						instance[prop] = value;
					});
					canBatch.stop();
				}

			}

			// triggers change event that bubble's like
			// handler( 'change','1.destroyed' ). This is used
			// to remove items on destroyed from Model Lists.
			// but there should be a better way.
			canEvent.dispatch.call(instance, {type:funcName, target: instance});

			//!steal-remove-start
			dev.log("can-connect/can/map.js - " + (constructor.shortName || this.name) + " " + this.id(instance) + " " + funcName);
			//!steal-remove-end

			// Call event on the instance's Class
			canEvent.dispatch.call(constructor, funcName, [instance]);
		};
	});


	return behavior;

});


var callCanReadingOnIdRead = true;


var mapStaticOverwrites = {
	/**
	 * @function CanMap.getList getList
	 * @parent can-connect/can/map.map-static
	 *
	 * Gets a list of instances of the map type.
	 *
	 * @signature `Map.getList(set)`
	 *
	 *   @param {Set} set
	 *   @return {Promise<CanList>}
	 *
	 * @body
	 *
	 * ## Use
	 *
	 * ```
	 * var Todo = CanMap.extend({});
	 *
	 * connect(["can/map","constructor","data-url"],{
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
	 * @function CanMap.getList getList
	 * @parent can-connect/can/map.map-static
	 *
	 * Alias of [CanMap.getList]. You should use `.getList()`.
	 */
	findAll: function (base, connection) {
		return function(set) {
			return connection.getList(set);
		};
	},
	/**
	 * @function CanMap.get get
	 * @parent can-connect/can/map.map-static
	 *
	 * Gets an instance of the map type.
	 *
	 * @signature `Map.get(params)`
	 *
	 *   @param {Object} [params]
	 *   @return {Promise<CanMap>}
	 *
	 * @body
	 *
	 * ## Use
	 *
	 * ```
	 * var Todo = CanMap.extend({});
	 *
	 * connect(["can/map","constructor","data-url"],{
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
	 * @function CanMap.findOne findOne
	 * @parent can-connect/can/map.map-static
	 *
	 * Alias of [CanMap.get]. You should use `.get()`.
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
			if ( prop === connection.idProp && this._bindings ) {
				connection.addInstanceReference(this);
			}
		};
	},
	isNew: function (base, connection) {
		/**
		 * @function CanMap.prototype.isNew isNew
		 * @parent can-connect/can/map.map
		 *
		 * Returns if the map has not been persisted.
		 *
		 * @signature `map.isNew()`
		 *
		 *   Returns `true` if [connect.base.id] is 0 or truthy.
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
		 * @function CanMap.prototype.isSaving isSaving
		 * @parent can-connect/can/map.map
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
		 * @function CanMap.prototype.isDestroying isDestroying
		 * @parent can-connect/can/map.map
		 *
		 * Returns if the map is currently being destroyed.
		 *
		 * @signature `map.isSaving()`
		 *
		 *   Returns `true` if .destroy() has been called, but has not resolved yet.
		 *
		 *   @return {Boolean}
		 */
		return function () {
			Observation.add(this,"_destroying");
			return !!getExpando(this, "_destroying");
		};
	},
	save: function (base, connection) {
		/**
		 * @function CanMap.prototype.save save
		 * @parent can-connect/can/map.map
		 *
		 * Persists the map's data to the connection.
		 *
		 * @signature `map.save( [success], [error] )`
		 *
		 *   Calls [connection.save].
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
		 * var Todo = CanMap.extend({});
		 *
		 * connect(["can/map","constructor","data-url"],{
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
		 * @function CanMap.prototype.destroy destroy
		 * @parent can-connect/can/map.map
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
		 * var Todo = CanMap.extend({});
		 *
		 * connect(["can/map","constructor","data-url"],{
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
			this._init = 1;
			this.addEventListener('destroyed', this._destroyed.bind(this));
			delete this._init;
		};
	},
	_destroyed: function(){
		return function (ev, attr) {
			if (/\w+/.test(attr)) {
				var index;
				while((index = this.indexOf(ev.target)) > -1) {
					this.splice(index, 1);
				}
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
