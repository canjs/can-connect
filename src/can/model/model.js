var can = require("can/util/util"),
	Map = require("can/map/map"),
	List = require("can/list/list"),
	connect = require("can-connect"),

	persist = require("../../data/url/"),
	constructor = require("../../constructor/"),
	instanceStore = require("../../constructor/store/"),
	parseData = require("../../data/parse/");

	require("../can");
	require("when/es6-shim/Promise");

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

var mapBehavior = connect.behavior(function(baseConnect){
	var behavior = {
		id: function(inst) {

			if(inst instanceof can.Map) {
				if(callCanReadingOnIdRead) {
					can.__observe(inst, inst.constructor.id);
				}
				// Use `__get` instead of `attr` for performance. (But that means we have to remember to call `can.__reading`.)
				return inst.__get(inst.constructor.id);
			} else {
				return inst[this.constructor.id];
			}
		},
		listSet: function(){
			return undefined;
		},
		idProp: baseConnect.constructor.id,
		serializeInstance: function(instance){
			return instance.serialize();
		},
		findAll: function(params, success, error) {
			var promise = resolveSingleExport( baseConnect.getList.call(this, params) );
			promise.then(success, error);
			return promise;
		},
		findOne: function(params, success, error) {
			// adds .then for compat
			var promise = resolveSingleExport( baseConnect.get.call(this, params) );
			promise.then(success, error);
			return promise;
		},
		parseInstanceData: function(props){
			if(typeof this.parseModel === "function") {
				return this.parseModel.apply(this.constructor, arguments);
			} else {
				return baseConnect.parseInstanceData.apply(baseConnect, arguments);
			}
		},
		parseListData: function(props){
			if(typeof this.parseModels === "function") {
				return this.parseModels.apply(this.constructor, arguments);
			} else {
				return baseConnect.parseListData.apply(baseConnect, arguments);
			}
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
				instance.attr(can.isFunction(attrs.attr) ? attrs.attr() : attrs, this.constructor.removeAttr || false);
			}

			// triggers change event that bubble's like
			// handler( 'change','1.destroyed' ). This is used
			// to remove items on destroyed from Model Lists.
			// but there should be a better way.
			can.dispatch.call(instance, {type:funcName, target: instance});

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

		//



		if (!can.Model) {
			return;
		}

		// save everything that's not on base can.Model


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
				can.each(listData, function (val, prop) {
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
		can.each(staticMethods, function(name){
			if( self.connection[name] ) {
				var fn = can.proxy(self.connection[name], self.connection);
				fn.base = self[name];
				can.Construct._overwrite(self, base, name, fn);
			}
		});
		can.each(parseMethods, function(connectionName, name){
			var fn = can.proxy(self.connection[connectionName], self.connection);
			fn.base = self[name];
			can.Construct._overwrite(self, base, name,  fn);
		});
	},
	models: function(raw, oldList){
		var args = can.makeArray(arguments);
		args[0] = this.connection.parseListData.apply(this.connection, arguments);
		var list = this.connection.hydrateList.apply(this.connection, args);
		if( oldList instanceof can.List ) {
			return oldList.replace(list);
		} else {
			return list;
		}
	},
	model: function(raw){
		var args = can.makeArray(arguments);
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

			promise = can.Deferred().resolve(this);
			this.constructor.connection.destroyedInstance(this, {});
		} else {
			promise = this.constructor.connection.destroy(this);
		}

		promise.then(success,error);
		return promise;
	},
	// ## can.Model#bind and can.Model#unbind
	// These aren't actually implemented here, but their setup needs to be changed to account for the store.
	_bindsetup: function () {
		// this should not call reading
		callCanReadingOnIdRead = false;
		this.constructor.connection.addInstanceReference(this);
		callCanReadingOnIdRead = true;
		return can.Map.prototype._bindsetup.apply(this, arguments);
	},
	_bindteardown: function () {
		callCanReadingOnIdRead = false;
		this.constructor.connection.deleteInstanceReference(this);
		callCanReadingOnIdRead = true;
		return can.Map.prototype._bindteardown.apply(this, arguments);
	},
	// Change the behavior of `___set` to account for the store.
	___set: function (prop, val) {
		can.Map.prototype.___set.call(this, prop, val);
		// If we add or change the ID, update the store accordingly.
		// TODO: shouldn't this also delete the record from the old ID in the store?
		if ( prop === this.constructor.id && this._bindings ) {
			this.constructor.connection.addInstanceReference(this);
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

module.exports = can.Model;
