/**
 * Makes a constructor function work just like can.Model
 */


var can = require("can/util/util"),
	Map = require("can/map/map"),
	List = require("can/list/list"),
	connect = require("can-connect"),
	
	persist = require("./persist"),
	constructor = require("./constructor"),
	instanceStore = require("./instance-store"),
	parseData = require("./parse-data");

var callCanReadingOnIdRead = true;


var mapBehavior = connect.behavior(function(baseConnect, options){
	var behavior = {
		id: function(inst) {
			if(inst instanceof can.Map) {
				if(callCanReadingOnIdRead) {
					can.__reading(inst, inst.constructor.id);
				}
				// Use `__get` instead of `attr` for performance. (But that means we have to remember to call `can.__reading`.)
				return inst.__get(inst.constructor.id);
			} else {
				return inst[options.constructor.id];
			}
		},
		serializeInstance: function(instance){
			return instance.serialize();
		},
		findAll: function(params, success, error) {
			
			var base = baseConnect.findAll(params);
			// adds .then for compat
			var promise = base.then(function(first){
				return first;
			});
			promise.then(success, error);
			// add abort
			promise.abort = function () {
				base.abort();
			};
			return promise;
		},
		findOne: function(params, success, error) {
			// adds .then for compat
			var base = baseConnect.findOne(params);
			// adds .then for compat
			var promise = base.then(function(first){
				return first;
			});
			promise.then(success, error);
			// add abort
			promise.abort = function () {
				base.abort();
			};
			return promise;
		}
		
	};

	can.each([
		"created",
		"updated",
		"destroyed"
	], function (funcName) {
		// Each of these is pretty much the same, except for the events they trigger.
		behavior[funcName+"Instance"] = function (instance, attrs) {
			var constructor = instance.constructor;

			// Update attributes if attributes have been passed
			if(attrs && typeof attrs === 'object') {
				instance.attr(can.isFunction(attrs.attr) ? attrs.attr() : attrs);
			}

			// triggers change event that bubble's like
			// handler( 'change','1.destroyed' ). This is used
			// to remove items on destroyed from Model Lists.
			// but there should be a better way.
			can.dispatch.call(instance, {type:"change", target: instance}, [funcName]);

			//!steal-remove-start
			can.dev.log("Model.js - " + constructor.shortName + " " + funcName);
			//!steal-remove-end

			// Call event on the instance's Class
			can.dispatch.call(constructor, funcName, [instance]);
		};
	});
	
	return behavior;
	
});




can.Model = can.Map.extend({
	setup: function (base, fullName, staticProps, protoProps) {
		// Assume `fullName` wasn't passed. (`can.Model.extend({ ... }, { ... })`)
		// This is pretty usual.
		if (typeof fullName !== "string") {
			protoProps = staticProps;
			staticProps = fullName;
		}
		// Assume no static properties were passed. (`can.Model.extend({ ... })`)
		// This is really unusual for a model though, since there's so much configuration.
		if (!protoProps) {
			//!steal-remove-start
			can.dev.warn("can/model/model.js: can.Model extended without static properties.");
			//!steal-remove-end
			protoProps = staticProps;
		}

		// Create the model store here, in case someone wants to use can.Model without inheriting from it.
		this.store = {};

		can.Map.setup.apply(this, arguments);
		if (!can.Model) {
			return;
		}

		// `List` is just a regular can.Model.List that knows what kind of Model it's hooked up to.
		if(staticProps && staticProps.List) {
			this.List = staticProps.List;
			this.List.Map = this;
		} else {
			this.List = base.List.extend({
				Map: this
			}, {});
		}
		var self = this;
		
		var staticMethods = ["findAll","findOne","create","update","destroy"];
		
		// setup persistance
		var persistConnection = persist({},{
			findAll: this.findAll,
			findOne: this.findOne,
			create: this.create,
			update: this.update,
			destroy: this.destroy
		});
		
		var parseDataConnection = parseData(persistConnection,{
			parseInstanceData: typeof this.parseModel === "string" ? this.parseModel : undefined,
			parseListProp: typeof this.parseModels === "string" ? this.parseModels : undefined,
		});
		
		var constructorConnection = constructor( parseDataConnection, { 
			instance: function(values){
				return new self(values);
			}, 
			list: function(arr){
				return new self.List(arr);
			} 
		});
		
		var instanceStoreConnection = instanceStore( constructorConnection );
		
		var mapConnection = mapBehavior(instanceStoreConnection,{
			constructor: this
		});
		
		// 
		this.connection = mapConnection;
		
		this.store = this.connection.instanceStore;
		// map static stuff to crud:
		can.each(staticMethods, function(name){
			self[name] = can.proxy(self.connection[name], self.connection);
		});
	},
	models: function(raw){
		return this.connection.makeInstances.apply(this.connection, arguments);
	}
},{
	isNew: function () {
		var id = this.constructor.connection.id(this);
		// 0 is a valid ID.
		// TODO: Why not `return id === null || id === undefined;`?
		return !(id || id === 0); // If `null` or `undefined`
	},
	save: function(success, error){
		var promise = this.constructor.connection.save(this);
		promise.then(success,error);
		return promise;
	},
	destroy: function(success, error){
		var promise = this.constructor.connection.destroy(this);
		promise.then(success,error);
		return promise;
	},
	// ## can.Model#bind and can.Model#unbind
	// These aren't actually implemented here, but their setup needs to be changed to account for the store.
	_bindsetup: function () {
		// this should not call reading
		callCanReadingOnIdRead = false;
		this.constructor.connection.observedInstance(this);
		callCanReadingOnIdRead = true;
		return can.Map.prototype._bindsetup.apply(this, arguments);
	},
	_bindteardown: function () {
		callCanReadingOnIdRead = false;
		this.constructor.connection.unobservedInstance(this);
		callCanReadingOnIdRead = true;
		return can.Map.prototype._bindteardown.apply(this, arguments);
	},
	// Change the behavior of `___set` to account for the store.
	___set: function (prop, val) {
		can.Map.prototype.___set.call(this, prop, val);
		// If we add or change the ID, update the store accordingly.
		// TODO: shouldn't this also delete the record from the old ID in the store?
		if ( prop === this.constructor.id && this._bindings ) {
			this.constructor.connection.observedInstance(this);
		}
	}
});

var ML = can.Model.List = can.List.extend({
	// ## can.Model.List.setup
	// On change or a nested named event, setup change bubbling.
	// On any other type of event, setup "destroyed" bubbling.
	_bubbleRule: function(eventName, list) {
		var bubbleRules = can.List._bubbleRule(eventName, list);
		bubbleRules.push('destroyed');
		return bubbleRules;
	}
},{
	setup: function (params) {
		// If there was a plain object passed to the List constructor,
		// we use those as parameters for an initial findAll.
		if (can.isPlainObject(params) && !can.isArray(params)) {
			can.List.prototype.setup.apply(this);
			this.replace(can.isDeferred(params) ? params : this.constructor.Map.findAll(params));
		} else {
			// Otherwise, set up the list like normal.
			can.List.prototype.setup.apply(this, arguments);
		}
		this._init = 1;
		this.bind('destroyed', can.proxy(this._destroyed, this));
		delete this._init;
	},
	_destroyed: function (ev, attr) {
		if (/\w+/.test(attr)) {
			var index;
			while((index = this.indexOf(ev.target)) > -1) {
				this.splice(index, 1);
			}
		}
	}
});
