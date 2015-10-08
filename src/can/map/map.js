require("when/es6-shim/Promise");
require("../can");

var can = require("can/util/util");
var connect = require("can-connect");
var Map = require("can/map/map");
var List = require("can/list/list");




module.exports = connect.behavior("can-map",function(baseConnect){

	// overwrite
	var behavior = {
		init: function(){
			this.Map = this.Map || Map.extend({});
			this.List = this.List || List.extend({});

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
			var idProp = this.idProp;
			if(instance instanceof can.Map) {
				if(callCanReadingOnIdRead) {
					can.__observe(instance, idProp);
				}
				// Use `__get` instead of `attr` for performance. (But that means we have to remember to call `can.__reading`.)
				return instance.__get(idProp);
			} else {
				return instance[idProp];
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
		 * @property {can.Map} can-connect/can/map.Map Map
		 * @parent can-connect/can/map.hydrators
		 *
		 * Specify what type of `can.Map` should be hydrated.
		 *
		 * @option {can.Map} Defaults to `can.Map` if a Map is
		 * not specified.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var Todo = can.Map.extend({
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
		 * @property {can.List} can-connect/can/map._List List
		 * @parent can-connect/can/map.hydrators
		 *
		 * Specify what type of `can.List` should be hydrated.
		 *
		 * @option {can.List} Defaults to [can-connect/can/map.Map]'s `.List` and
		 * then `can.List` if `connection.List` is not specified.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var Todo = can.Map.extend({
		 *   complete: function(){
		 *     this.attr("complete", true);
		 *   }
		 * });
		 * var Todo.List = can.List.extend({Map: Todo},{
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
		 *   creates the base `can.Map`.
		 */
		instance: function(props){
			return new (this.Map || Map)(props);
		},
		/**
		 * @function can-connect/can/map.list list
		 * @parent can-connect/can/map.hydrators
		 *
		 * Creates a `can.List` instance given raw data.
		 *
		 * @signature `connection.list(listData, set)`
		 *
		 *   Uses the [can-connect/can/map._List] property if available, otherwise
		 *   creates the [can-connect/can/map.Map].List if available, and then finally
		 *   defaults to the base `can.List`.
		 *
		 *   This will add properties on `listData` to the list too.
		 *
		 *   @param {Object} listData
		 *   @param {Object} set
		 *   @return {List}
		 */
		list: function(listData, set){
			var list = new (this.List || (this.Map && this.Map.List) || List)(listData.data);
			can.each(listData, function (val, prop) {
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
		 * @signature `connection.udpatedList( list, listData, set)`
		 *
		 *   Updates the list within a batch event.
		 */
		updatedList: function(){
			can.batch.start();
			var res = baseConnect.updatedList.apply(this, arguments);
			can.batch.stop();
			return res;
		},
		save: function(instance){
			instance._saving = true;
			can.batch.trigger(instance, "_saving", [true, false]);
			var done = function(){
				instance._saving = false;
				can.batch.trigger(instance, "_saving", [false, true]);
			};
			var base = baseConnect.save.apply(this, arguments);
			base.then(done,done);
			return base;
		},
		destroy: function(instance){
			instance._destroying = true;
			can.batch.trigger(instance, "_destroying", [true, false]);
			var done = function(){
				instance._destroying = false;
				can.batch.trigger(instance, "_destroying", [false, true]);
			};
			var base = baseConnect.destroy.apply(this, arguments);
			base.then(done,done);
			return base;
		}
	};

	can.each([
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
				instance.attr(can.isFunction(props.attr) ? props.attr() : props, this.constructor.removeAttr || false);
			}

			// triggers change event that bubble's like
			// handler( 'change','1.destroyed' ). This is used
			// to remove items on destroyed from Model Lists.
			// but there should be a better way.
			can.dispatch.call(instance, {type:funcName, target: instance});

			//!steal-remove-start
			can.dev.log("Model.js - " + (constructor.shortName || this.name) + ""+this.id(instance)+" " + funcName);
			//!steal-remove-end

			// Call event on the instance's Class
			can.dispatch.call(constructor, funcName, [instance]);
		};
	});


	return behavior;

});


var callCanReadingOnIdRead = true;


var mapStaticOverwrites = {
	/**
	 * @function can.Map.getList getList
	 * @parent can-connect/can/map.map-static
	 *
	 * Gets a list of instances of the map type.
	 *
	 * @signature `Map.getList(set)`
	 *
	 *   @param {Set} set
	 *   @return {Promise<can.List>}
	 *
	 * @body
	 *
	 * ## Use
	 *
	 * ```
	 * var Todo = can.Map.extend({});
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
	 * @function can.Map.getList getList
	 * @parent can-connect/can/map.map-static
	 *
	 * Alias of [can.Map.getList]. You should use `.getList()`.
	 */
	findAll: function (base, connection) {
		return function(set) {
			return connection.getList(set);
		};
	},
	/**
	 * @function can.Map.get get
	 * @parent can-connect/can/map.map-static
	 *
	 * Gets an instance of the map type.
	 *
	 * @signature `Map.get(params)`
	 *
	 *   @param {Object} [params]
	 *   @return {Promise<can.Map>}
	 *
	 * @body
	 *
	 * ## Use
	 *
	 * ```
	 * var Todo = can.Map.extend({});
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
	 * @function can.Map.findOne findOne
	 * @parent can-connect/can/map.map-static
	 *
	 * Alias of [can.Map.get]. You should use `.get()`.
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
	_bindsetup: function (base, connection) {
		return function(){
			callCanReadingOnIdRead = false;
			connection.addInstanceReference(this);
			callCanReadingOnIdRead = true;
			return base.apply(this, arguments);
		};
	},
	_bindteardown: function (base, connection) {
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
		 * @function can.Map.prototype.isNew isNew
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
		 * @function can.Map.prototype.isSaving isSaving
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
			can.__observe(this,"_saving");
			return !!this._saving;
		};
	},
	isDestroying: function (base, connection) {
		/**
		 * @function can.Map.prototype.isDestroying isDestroying
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
			can.__observe(this,"_destroying");
			return !!this._destroying;
		};
	},
	save: function (base, connection) {
		/**
		 * @function can.Map.prototype.save save
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
		 * var Todo = can.Map.extend({});
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
		 * @function can.Map.prototype.destroy destroy
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
		 * var Todo = can.Map.extend({});
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
			if (can.isPlainObject(params) && !can.isArray(params)) {
				this.__listSet = params;
				base.apply(this);
				this.replace(can.isDeferred(params) ? params : connection.getList(params));
			} else {
				// Otherwise, set up the list like normal.
				base.apply(this, arguments);
			}
			this._init = 1;
			this.bind('destroyed', can.proxy(this._destroyed, this));
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
	_bindsetup: function (base, connection) {
		return function(){
			connection.addListReference(this);
			return base.apply(this, arguments);
		};
	},
	_bindteardown: function (base, connection) {
		return function(){
			connection.deleteListReference(this);
			return base.apply(this, arguments);
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



var overwrite = function( connection, Constructor, prototype, statics) {
	for(var prop in prototype) {
		Constructor.prototype[prop] = prototype[prop](Constructor.prototype[prop], connection);
	}
	if(statics) {
		for(var prop in statics) {
			Constructor[prop] = statics[prop](Constructor[prop], connection);
		}
	}
};
