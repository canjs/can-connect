"use strict";
var each = require("can-util/js/each/each");

var connect = require("can-connect");
var canBatch = require("can-event/batch/batch");
var canEvent = require("can-event");
var Observation = require("can-observation");

var isPlainObject = require("can-util/js/is-plain-object/is-plain-object");
var types = require("can-types");
var each = require("can-util/js/each/each");
var isFunction = require("can-util/js/is-function/is-function");
var dev = require("can-util/js/dev/dev");
var canReflect = require("can-reflect");

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
		 * Returns an observable identifier value for an instance.
		 *
		 * @signature `connection.id(instance)`
		 *
		 * Reads the instance's id (in the same manner as [can-connect/base/base.id `base.id()`]) but as an observable value.
		 *
		 * @param {can-connect/Instance} instance the instance to get an identifier of
		 * @return {*} an identifier value
		 */
		id: function(instance) {

			if(!isPlainObject(instance)) {
				var ids = [],
					algebra = this.algebra;

				if(algebra && algebra.clauses && algebra.clauses.id) {
					for(var prop in algebra.clauses.id) {
						ids.push(readObservable(instance,prop));
					}
				}

				if(this.idProp && !ids.length) {
					ids.push(readObservable(instance,this.idProp));
				}
				if(!ids.length) {
					ids.push(readObservable(instance,"id"));
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
		 * Returns the properties of an instance that should be sent to the data source when saving. Done by calling
		 * [can-define/map/map.prototype.serialize `instance.serialize()`].
		 *
		 * @signature `connection.serializeInstance(instance)`
		 * Simply calls [can-define/map/map.prototype.serialize] on the `instance` argument.
		 *
		 * @param {can-connect/can/map/map._Map} instance the instance to serialize
		 * @return {Object} the result of calling [can-define/map/map.prototype.serialize `instance.serialize()`]
		 */
		serializeInstance: function(instance){
			return instance.serialize();
		},
		/**
		 * @function can-connect/can/map/map.serializeList serializeList
		 * @parent can-connect/can/map/map.serializers
		 *
		 * Returns the properties of a list that should be sent to the data source when saving. Done by calling
		 * [can-define/list/list.prototype.serialize `list.serialize()`].
		 *
		 * @signature `connection.serializeList(list)`
		 * Simply calls [can-define/list/list.prototype.serialize] on the `list` argument.
		 *
		 * @param {can-connect/can/map/map._List} list the list to serialize
		 * @return {Object} the result of calling [can-define/list/list.prototype.serialize `list.serialize()`]
		 */
		serializeList: function(list){
			return list.serialize();
		},

		/**
		 * @property {connection.Map} can-connect/can/map/map._Map Map
		 * @parent can-connect/can/map/map.options
		 *
		 * Specify the type of the `[can-define/map/map DefineMap]` that should be instantiated by the connection.
		 *
		 * @option {connection.Map} Defaults to [can-types.DefaultMap] if this option is not specified.
		 *
		 * **Usage:**
		 *
		 * ```js
		 * var DefineMap = require("can-define/map/map");
		 * var canMap = require("can-connect/can/map/map");
		 * var constructor = require("can-connect/constructor/constructor");
		 * var dataUrl = require("can-connect/data/url/url");
		 *
		 * var Todo = DefineMap.extend({
		 *   completed: "boolean",
		 *   complete: function(){
		 *     this.completed = true
		 *   }
		 * });
		 *
		 * var todoConnection = connect([dataUrl, constructor, canMap], {
		 *   Map: Todo,
		 *   url: "/todos"
		 * });
		 *
		 * todoConnect.get({id:1}).then(function(item) {
		 *   item instanceof Todo // true
		 * });
		 * ```
		 */

		/**
		 * @property {connection.List} can-connect/can/map/map._List List
		 * @parent can-connect/can/map/map.options
		 *
		 * Specify the type of the `[can-define/list/list DefineList]` that should be instantiated by the connection.
		 *
		 * @option {connection.List} If this option is not specified it defaults to the [can-connect/can/map/map._Map Map].List
		 * property and then [can-types.DefaultList].
		 *
		 * **Usage:**
		 * ```js
		 * var DefineMap = require("can-define/map/map");
		 * var DefineList = require("can-define/list/list");
		 * var canMap = require("can-connect/can/map/map");
		 * var constructor = require("can-connect/constructor/constructor");
		 * var dataUrl = require("can-connect/data/url/url");
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
		 * var todoConnection = connect([dataUrl, constructor, canMap],{
		 *   Map: Todo,
		 *   List: Todo.List,
		 *   url: "/todos"
		 * });
		 *
		 * todoConnection.getList({}).then(function(list) {
		 *   list instanceOf Todo.List // true
		 * })
		 * ```
		 */

		/**
		 * @function can-connect/can/map/map.instance instance
		 * @parent can-connect/can/map/map.hydrators
		 *
		 * Creates a [can-connect/can/map/map._Map] instance given raw data.
		 *
		 * @signature `connection.instance(props)`
		 *
		 *   Create an instance of [can-connect/can/map/map._Map] if available, otherwise creates an instance of
		 *   [can-types.DefaultMap].
		 *
		 *   @param {Object} props the raw instance data.
		 *   @return [can-connect/can/map/map._Map] a [can-connect/can/map/map._Map] instance containing the `props`.
		 */
		instance: function(props){
			var _Map = this.Map || types.DefaultMap;
			return new _Map(props);
		},

		/**
		 * @function can-connect/can/map/map.list list
		 * @parent can-connect/can/map/map.hydrators
		 *
		 * Creates a [can-connect/can/map/map._List] instance given raw data.
		 *
		 * @signature `connection.list(listData, set)`
		 *
		 *   Creates an instance of [can-connect/can/map/map._List] if available, otherwise creates
		 *   [can-connect/can/map/map._Map].List if available, and then finally defaulting to [can-types.DefaultList].
		 *
		 *   This will add properties on the raw `listData` array to the created list instance. e.g:
		 *   ```js
		 *   var listData = [{id: 1, name:"do dishes"}, ...];
		 *   listData.loadedFrom; // "shard 5"
		 *
		 *   var todoList = todoConnection.list(listData, {});
		 *   todoList.loadedFrom; // "shard 5"
		 *   ```
		 *
		 *   @param {can-connect.listData} listData the raw list data.
		 *   @param {can-set/Set} set the set the data belongs to.
		 *   @return {can-connect.List} a [can-connect/can/map/map._List] instance containing instances of
		 *   [can-connect/can/map/map._Map] built from the list items in `listData`.
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
		 * Implements the [can-connect/constructor/constructor.updatedList] callback so it updates the list and it's items
		 * during a single [can-event/batch/batch batched event].
		 *
		 * @signature `connection.updatedList(list, listData, set)`
		 *
		 *   Updates the list and the items within it during a single [can-event/batch/batch batched event].
		 *
		 *   @param {can-connect.List} list the list to be updated.
		 *   @param {can-connect.listData} listData raw list data.
		 *   @param {can-set/Set} set the set of the list being updated.
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
		 * Implements the [can-connect/constructor/constructor.createdInstance] callback so it dispatches an event and
		 * updates the instance.
		 *
		 * @signature `connection.createdInstance(instance, props)`
		 *
		 *   Updates the instance with `props` and dispatches a "created" event on the instance and the instances's
		 *   constructor function ([can-connect/can/map/map._Map]).
		 *
		 *   Calls [can-connect/constructor/store/store.stores.moveCreatedInstanceToInstanceStore] to ensure new instances
		 *   are moved into the [can-connect/constructor/store/store.instanceStore] after being saved.
		 *
		 *   @param {can-connect/can/map/map._Map} instance a [can-connect/can/map/map._Map] instance
		 *   @param {Object} props the data in the response from [can-connect/connection.createData]
		 */
		"created",
		/**
		 * @function can-connect/can/map/map.updatedInstance updatedInstance
		 * @parent can-connect/can/map/map.instance-callbacks
		 *
		 * Implements the [can-connect/constructor/constructor.updatedInstance] callback so it dispatches an event and
		 * updates the instance.
		 *
		 * @signature `connection.updatedInstance(instance, props)`
		 *
		 *   Updates the instance with `props` and dispatches an "updated" event on the instance and the instances's
		 *   constructor function ([can-connect/can/map/map._Map]).
		 *
		 *   @param {can-connect/can/map/map._Map} instance a [can-connect/can/map/map._Map] instance
		 *   @param {Object} props the data in the response from [can-connect/connection.updateData]
		 */
		"updated",
		/**
		 * @function can-connect/can/map/map.destroyedInstance destroyedInstance
		 * @parent can-connect/can/map/map.instance-callbacks
		 *
		 * Implements the [can-connect/constructor/constructor.destroyedInstance] callback so it dispatches an event and
		 * updates the instance.
		 *
		 * @signature `connection.destroyedInstance(instance, props)`
		 *
		 *   Updates the instance with `props` and dispatches a "destroyed" event on the instance and the instances's
		 *   constructor function ([can-connect/can/map/map._Map]).
		 *
		 *   @param {can-connect/can/map/map._Map} instance a [can-connect/can/map/map._Map] instance
		 *   @param {Object} props the data in the response from [can-connect/connection.destroyData]
		 */
		"destroyed"
	], function (funcName) {
		// Each of these is pretty much the same, except for the events they trigger.
		behavior[funcName+"Instance"] = function (instance, props) {

			// Update attributes if attributes have been passed
			if(props && typeof props === 'object') {

				if(this.constructor.removeAttr) {
					canReflect.updateDeep(instance, props);
				} else {
					canReflect.assignDeep(instance, props);
				}
			}
			// This happens in constructor/store, but we don't call base, so we have to do it ourselves.
			if(funcName === "created" && this.moveCreatedInstanceToInstanceStore) {
				this.moveCreatedInstanceToInstanceStore(instance);
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
 * Utility function to dispatch events for instance callbacks, e.g. [can-connect/can/map/map.updatedInstance].
 *
 * @signature `connection.callbackInstanceEvents(cbName, instance)`
 *
 *   Used to dispatch events as part of instance callbacks implementations. This method could be useful in other
 *   behaviors that implement instance callbacks. E.g. a behavior overriding the
 *   [can-connect/can/map/map.updatedInstance `updatedInstance`] callback:
 *
 *   ```
 *   connect([canMap, {
 *       updatedInstance: function(instance, props) {
 *           instance = smartMerge(instance, props);
 *           canMapBehavior.callbackInstanceEvents("updated", instance);
 *       }
 *   }], {})
 *   ```
 *
 *   @param {String} eventName name of the the event to be triggered
 *   @param {can-connect/can/map/map._Map} instance a [can-connect/can/map/map._Map] instance.
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
	 * Method added to the configured [can-connect/can/map/map._Map] type. Retrieves a [can-connect/can/map/map._List] of
	 * [can-connect/can/map/map._Map] instances via the connection.
	 *
	 * @signature `Map.getList(set)`
	 * @param {can-set/Set} set set definition of the list being retrieved
	 * @return {Promise<Map>} `Promise` returning the [can-connect/can/map/map._List] of instances being retrieved
   *
	 * ### Usage
	 *
	 * ```
	 * // import connection plugins
	 * var canMap = require("can-connect/can/map/map");
	 * var constructor = require("can-connect/constructor/constructor");
	 * var dataUrl = require("can-connect/data/url/url");
	 *
	 * // define connection types
	 * var Todo = DefineMap.extend({
	 *   id: "number",
	 *   complete: "boolean",
	 *   name: "string"
	 * });
	 *
	 * Todo.List = DefineList.extend({
	 *   completed: function() {
	 *     return this.filter(function(item) { return item.completed; });
	 *   }
	 * });
	 *
	 * // create connection
	 * connect([canMap, constructor, dataUrl],{
	 *   Map: Todo,
	 *   url: "/todos"
	 * })
	 *
	 * // retrieve instances
	 * Todo.getList({due: "today"}).then(function(todos){
	 *   ...
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
	 * Method added to the configured [can-connect/can/map/map._Map] type. Retrieves an instance of the
	 * [can-connect/can/map/map._Map] type via the connection.
	 *
	 * @signature `Map.get(params)`
	 * @param {Object} params identifying parameters of the instance to retrieve
	 * @return {Promise<Map>} `Promise` returning the [can-connect/can/map/map._Map] instance being retrieved
	 *
	 * ### Usage
	 *
	 * ```js
	 * // import connection plugins
	 * var canMap = require("can-connect/can/map/map");
	 * var constructor = require("can-connect/constructor/constructor");
	 * var dataUrl = require("can-connect/data/url/url");
	 *
	 * // define connection type
	 * var Todo = DefineMap.extend({
	 *   id: "number",
	 *   complete: "boolean",
	 *   name: "string"
	 * });
	 *
	 * // create connection
	 * connect([canMap, constructor, dataUrl],{
	 *   Map: Todo,
	 *   url: "/todos"
	 * })
	 *
	 * // retrieve instance
	 * Todo.get({id: 5}).then(function(todo){
	 *   ...
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
			if(connection.addInstanceReference) {
				connection.addInstanceReference(this);
			}

			callCanReadingOnIdRead = true;
			return base.apply(this, arguments);
		};
	},

	_eventTeardown: function (base, connection) {
		return function(){
			callCanReadingOnIdRead = false;
			if(connection.deleteInstanceReference) {
				connection.deleteInstanceReference(this);
			}
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
		 * Returns if the instance has not been loaded from or saved to the data source.
		 *
		 * @signature `instance.isNew()`
		 * @return {Boolean} `true` if [can-connect/base/base.id] is `null` or `undefined`
		 */
		return function () {
			return connection.isNew(this);
		}
	},

	isSaving: function (base, connection) {
		/**
		 * @function can-connect/can/map/map.prototype.isSaving isSaving
		 * @parent can-connect/can/map/map.map
		 *
		 * Returns if the instance is currently being saved.
		 *
		 * @signature `instance.isSaving()`
		 *
		 * Observes if a promise returned by [can-connect/connection.save `connection.save`] is in progress for this
		 * instance.  This is often used in a template like:
		 *
		 * ```
		 * <button ($click)="todo.save()"
		 *    {{#todo.isSaving}}disabled{{/todo.isSaving}}>
		 *   Save Changes
		 * </button>
		 * ```
		 *
		 *   @return {Boolean} `true` if [can-connect/connection.save `connection.save`] has been called for this
		 *   instance but the returned promise has not yet resolved.
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
		 * Returns if the instance is currently being destroyed.
		 *
		 * @signature `instance.isDestroying()`
		 *
		 * Observes if a promise returned by [can-connect/connection.destroy `connection.destroy`] is in progress for this
		 * instance.  This is often used in a template like:
		 *
		 * ```
		 * <button ($click)="todo.destroy()"
		 *    {{#todo.isDestroying}}disabled{{/todo.isDestroying}}>
		 *   Delete
		 * </button>
		 * ```
		 *
		 *   @return {Boolean} `true` if [can-connect/connection.destroy `connection.destroy`] has been called for this
		 *   instance but the returned promise has not resolved.
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
		 * Save the instance's data to the service via the connection.
		 *
		 * @signature `instance.save(success, error)`
		 *
		 *   Calls [can-connect/connection.save].
		 *
		 *   @param {function} success A function that is called if the save is successful.
		 *   @param {function} error A function that is called if the save is rejected.
		 *   @return {Promise<Instance>} A promise that resolves to the instance if successful.
		 *
		 * ### Usage
		 *
		 * ```
		 * // import connection plugins
		 * var canMap = require("can-connect/can/map/map");
		 * var constructor = require("can-connect/constructor/constructor");
		 * var dataUrl = require("can-connect/data/url/url");
		 *
		 * // define connection types
		 * var Todo = DefineMap.extend({
		 *   id: "number",
		 *   complete: "boolean",
		 *   name: "string"
		 * });
		 *
		 * // create connection
		 * connect([canMap, constructor, dataUrl], {
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
		 * Delete an instance from the service via the connection.
		 *
		 * @signature `instance.destroy(success, error)`
		 *
		 * Calls [can-connect/connection.destroy] for the `instance`.
		 *
		 * @param {function} success a function that is called if the [can-connect/connection.destroy] call is successful.
		 * @param {function} error a function that is called if the [can-connect/connection.destroy] call is rejected.
		 * @return {Promise<Instance>} a promise that resolves to the instance if successful
		 *
		 * ### Usage
		 * ```
		 * // import connection plugins
		 * var canMap = require("can-connect/can/map/map");
		 * var constructor = require("can-connect/constructor/constructor");
		 * var dataUrl = require("can-connect/data/url/url");
		 *
		 * // define connection types
		 * var Todo = DefineMap.extend({
		 *   id: "number",
		 *   complete: "boolean",
		 *   name: "string"
		 * });
		 *
		 * // create connection
		 * connect([canMap, constructor, dataUrl],{
		 *   Map: Todo,
		 *   url: "/todos"
		 * })
		 *
		 * // read instance
		 * Todo.get({id: 5}).then(function(todo){
		 *   if (todo.complete) {
		 *     // delete instance
		 *     todo.destroy();
		 *   }
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
			if (isPlainObject(params) && !Array.isArray(params)) {
				this.__listSet = params;
				base.apply(this);
				this.replace(canReflect.isPromise(params) ? params : connection.getList(params));
			} else {
				// Otherwise, set up the list like normal.
				base.apply(this, arguments);
			}
		};
	},
	_eventSetup: function (base, connection) {
		return function(){
			if(connection.addListReference) {
				connection.addListReference(this);
			}
			if(base) {
				return base.apply(this, arguments);
			}
		};
	},
	_eventTeardown: function (base, connection) {
		return function(){
			if(connection.deleteListReference) {
				connection.deleteListReference(this);
			}
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

var readObservable = function(instance, prop){
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

//!steal-remove-start
var validate = require("can-connect/helpers/validate");
module.exports = validate(
	canMapBehavior,
	[
		'id', 'get', 'updatedList', 'destroy', 'save', 'getList'
	]
);
//!steal-remove-end
