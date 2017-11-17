var $ = require("jquery"),
	connect = require("can-connect"),

	persist = require("../../data/url/url"),
	constructor = require("../../constructor/constructor"),
	instanceStore = require("../../constructor/store/store"),
	parseData = require("../../data/parse/parse"),
	CanMap = require("can-map"),
	CanList = require("can-list"),
	Observation = require("can-observation"),
	canEvent = require("can-event"),
	ns = require("can-namespace");

var each = require("can-util/js/each/each");
var dev = require("can-util/js/dev/dev");
var makeArray = require("can-util/js/make-array/make-array");
var canReflect = require("can-reflect");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object");

var callCanReadingOnIdRead = true;
var getBaseValue = function(prop){
	if(typeof prop === "function" && ("base" in prop)) {
		return prop.base;
	} else {
		return prop;
	}
};
var resolveSingleExport = function(originalPromise){
	var promise = originalPromise.then(function(first){
		return first;
	});
	promise.abort = function () {
		originalPromise.abort();
	};
	return promise;
};

var mapBehavior = connect.behavior(function(baseConnection){
	var behavior = {
		id: function(inst) {
			var idProp = inst.constructor.id || "id";
			if(inst instanceof CanMap) {
				if(callCanReadingOnIdRead) {
					Observation.add(inst, idProp);
				}
				// Use `__get` instead of `attr` for performance. (But that means we have to remember to call `Observation.reading`.)
				return inst.__get(idProp);
			} else {
				if(callCanReadingOnIdRead) {
					return inst[idProp];
				} else {
					return Observation.ignore(function(){
						return inst[idProp];
					});
				}

			}
		},
		listSet: function(){
			return undefined;
		},
		idProp: baseConnection.constructor.id || "id",
		serializeInstance: function(instance){
			return instance.serialize();
		},
		findAll: function(params, success, error) {
			var promise = resolveSingleExport( baseConnection.getList.call(this, params) );
			promise.then(success, error);
			return promise;
		},
		findOne: function(params, success, error) {
			// adds .then for compat
			var promise = resolveSingleExport( baseConnection.get.call(this, params) );
			promise.then(success, error);
			return promise;
		},
		parseInstanceData: function(props){
			if(typeof this.parseModel === "function") {
				return this.parseModel.apply(this.constructor, arguments);
			} else {
				return baseConnection.parseInstanceData.apply(baseConnection, arguments);
			}
		},
		parseListData: function(props){
			if(typeof this.parseModels === "function") {
				return this.parseModels.apply(this.constructor, arguments);
			} else {
				return baseConnection.parseListData.apply(baseConnection, arguments);
			}
		}

	};

	each([
		"created",
		"updated",
		"destroyed"
	], function (funcName) {
		// Each of these is pretty much the same, except for the events they trigger.
		behavior[funcName+"Instance"] = function (instance, attrs) {
			var constructor = instance.constructor;

			// Update attributes if attributes have been passed
			if(attrs && typeof attrs === 'object') {
				instance.attr(typeof attrs.attr === "function" ? attrs.attr() : attrs, this.constructor.removeAttr || false);
			}

			// triggers change event that bubble's like
			// handler( 'change','1.destroyed' ). This is used
			// to remove items on destroyed from Model Lists.
			// but there should be a better way.
			canEvent.dispatch.call(instance, {type:funcName, target: instance});

			//!steal-remove-start
			dev.log("Model.js - " + constructor.shortName + " " + funcName);
			//!steal-remove-end

			// Call event on the instance's Class
			canEvent.dispatch.call(constructor, funcName, [instance]);
		};
	});


	return behavior;

});




var CanModel = CanMap.extend({
	setup: function (base, fullName, staticProps, protoProps) {
		// Assume `fullName` wasn't passed. (`CanModel.extend({ ... }, { ... })`)
		// This is pretty usual.
		if (typeof fullName !== "string") {
			protoProps = staticProps;
			staticProps = fullName;
		}
		// Assume no static properties were passed. (`CanModel.extend({ ... })`)
		// This is really unusual for a model though, since there's so much configuration.
		if (!protoProps) {
			//!steal-remove-start
			dev.warn("can/model/model.js: CanModel extended without static properties.");
			//!steal-remove-end
			protoProps = staticProps;
		}

		// Create the model store here, in case someone wants to use CanModel without inheriting from it.
		this.store = {};

		CanMap.setup.apply(this, arguments);

		//



		if (!CanModel) {
			return;
		}

		// save everything that's not on base CanModel


		// `List` is just a regular CanModel.List that knows what kind of Model it's hooked up to.
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
		var parseMethods = {
			parseModel: "parseInstanceData",
			parseModels: "parseListData"
		};


		var connectionOptions = {
			// persist options
			url: {
				getListData: getBaseValue(this.findAll),
				getData: getBaseValue(this.findOne),
				createData: getBaseValue(this.create),
				updateData: getBaseValue(this.update),
				destroyData: getBaseValue(this.destroy),
				resource: this.resource
			},
			idProp: this.id,
			// parseData
			parseInstanceProp: typeof getBaseValue(this.parseModel) === "string" ? getBaseValue(this.parseModel) : undefined,
			parseListProp: typeof getBaseValue(this.parseModels) === "string" ? getBaseValue(this.parseModels) : undefined,
			// constructor options
			instance: function(values){
				return new self(values);
			},
			list: function(listData){
				var list = new self.List(listData.data);
				each(listData, function (val, prop) {
					if (prop !== 'data') {
						list.attr(prop, val);
					}
				});
				return list;
			},
			// mapBehavior options
			constructor: this,
			parseModel: getBaseValue(this.parseModel),
			parseModels: getBaseValue(this.parseModels),
			ajax: function(){
				var promiseLike = $.ajax.apply($, arguments);

				return new Promise(function(resolve, reject){
					promiseLike.then(resolve, reject);
				});
			}
		};

		this.connection = mapBehavior(
			instanceStore(
				constructor(
					parseData(
						persist(connectionOptions)
					)
				)
			)
		);

		this.store = this.connection.instanceStore;
		// map static stuff to crud .. but we don't want this inherited by the next thing'
		each(staticMethods, function(name){
			if( self.connection[name] ) {
				var fn = self.connection[name].bind(self.connection);
				fn.base = self[name];
				CanMap._overwrite(self, base, name, fn);
			}
		});
		each(parseMethods, function(connectionName, name){
			var fn = self.connection[connectionName].bind(self.connection);
			fn.base = self[name];
			CanMap._overwrite(self, base, name,  fn);
		});
	},
	models: function(raw, oldList){
		var args = makeArray(arguments);
		args[0] = this.connection.parseListData.apply(this.connection, arguments);
		var list = this.connection.hydrateList.apply(this.connection, args);
		if( oldList instanceof CanList ) {
			return oldList.replace(list);
		} else {
			return list;
		}
	},
	model: function(raw){
		var args = makeArray(arguments);
		args[0] = this.connection.parseInstanceData.apply(this.connection, arguments);
		var instance = this.connection.hydrateInstance.apply(this.connection, arguments);
		return instance;
	}
},{
	isNew: function () {
		var id = this.constructor.connection.id(this);
		// 0 is a valid ID.
		// TODO: Why not `return id === null || id === undefined;`?
		return !(id || id === 0); // If `null` or `undefined`
	},
	save: function(success, error){
		// return only one item for compatability
		var promise = resolveSingleExport( this.constructor.connection.save(this) );
		promise.then(success,error);
		return promise;
	},
	destroy: function(success, error){
		var promise;
		if (this.isNew()) {

			promise = Promise.resolve(this);
			this.constructor.connection.destroyedInstance(this, {});
		} else {
			promise = this.constructor.connection.destroy(this);
		}

		promise.then(success,error);
		return promise;
	},
	// ## CanModel#bind and CanModel#unbind
	// These aren't actually implemented here, but their setup needs to be changed to account for the store.
	_eventSetup: function () {
		// this should not call reading
		callCanReadingOnIdRead = false;
		this.constructor.connection.addInstanceReference(this);
		callCanReadingOnIdRead = true;
		return CanMap.prototype._eventSetup.apply(this, arguments);
	},
	_eventTeardown: function () {
		callCanReadingOnIdRead = false;
		this.constructor.connection.deleteInstanceReference(this);
		callCanReadingOnIdRead = true;
		return CanMap.prototype._eventTeardown.apply(this, arguments);
	},
	// Change the behavior of `___set` to account for the store.
	___set: function (prop, val) {
		CanMap.prototype.___set.call(this, prop, val);
		// If we add or change the ID, update the store accordingly.
		// TODO: shouldn't this also delete the record from the old ID in the store?
		if ( prop === (this.constructor.id || "id") && this.__bindEvents && this.__bindEvents._lifecycleBindings ) {
			this.constructor.connection.addInstanceReference(this);
		}
	}
});

CanModel.List = CanList.extend({
	// ## CanModel.List.setup
	// On change or a nested named event, setup change bubbling.
	// On any other type of event, setup "destroyed" bubbling.
	_bubbleRule: function(eventName, list) {
		var bubbleRules = CanList._bubbleRule(eventName, list);
		bubbleRules.push('destroyed');
		return bubbleRules;
	}
},{
	setup: function (params) {
		// If there was a plain object passed to the List constructor,
		// we use those as parameters for an initial findAll.
		if (isPlainObject(params) && !Array.isArray(params)) {
			CanList.prototype.setup.apply(this);
			this.replace(canReflect.isPromise(params) ? params : this.constructor.Map.findAll(params));
		} else {
			// Otherwise, set up the list like normal.
			CanList.prototype.setup.apply(this, arguments);
		}
		this._init = 1;
		this.bind('destroyed', this._destroyed.bind(this));
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

if(!ns.Model) {
	ns.Model = CanModel;
}

module.exports = CanModel;
