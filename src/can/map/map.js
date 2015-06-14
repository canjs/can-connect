/**
 * Connects a can.Map to everything that needs to be connected to
 */


require("when/es6-shim/Promise");
require("../can");

var can = require("can/util/util");
var connect = require("can-connect");

/**
 * @module can-connect/can/map can/map
 * @parent can-connect.modules
 */


var callCanReadingOnIdRead = true;

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
		return function () {
			var id = connection.id(this);
			// 0 is a valid ID.
			// TODO: Why not `return id === null || id === undefined;`?
			return !(id || id === 0); // If `null` or `undefined`
		};
	},
	save: function (base, connection) {
		return function(success, error){
			// return only one item for compatability
			var promise = connection.save(this);
			promise.then(success,error);
			return promise;
		};
	},
	destroy: function (base, connection) {
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
	// TODO: this doesn't need the connection
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

var mapStaticOverwrites = {
	getList: function (base, connection) {
		return function(params) {
			return connection.getList(params);
		};
	},
	get: function (base, connection) {
		return function(params) {
			// adds .then for compat
			return connection.get(params);
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


module.exports = connect.behavior("can-map",function(baseConnect){
	
	// overwrite 
	
	
	var behavior = {
		init: function(){
			overwrite(this, this.Map, mapOverwrites, mapStaticOverwrites);
			overwrite(this, this.List, listPrototypeOverwrites, listStaticOverwrites);
			baseConnect.init.apply(this, arguments);
		},
		id: function(inst) {
			var idProp = this.idProp;
			if(inst instanceof can.Map) {
				if(callCanReadingOnIdRead) {
					can.__observe(inst, idProp);
				}
				// Use `__get` instead of `attr` for performance. (But that means we have to remember to call `can.__reading`.)
				return inst.__get(idProp);
			} else {
				return inst[idProp];
			}
		},
		serializeInstance: function(instance){
			return instance.serialize();
		},
		serializeList: function(list){
			return list.serialize();
		},
		instance: function(values){
			return new this.Map(values);
		}, 
		list: function(listData, set){
			var list = new this.List(listData.data);
			can.each(listData, function (val, prop) {
				if (prop !== 'data') {
					list.attr(prop, val);
				}
			});
			list.__set = set;
			return list;
		},
		updatedList: function(){
			can.batch.start();
			var res = baseConnect.updatedList.apply(this, arguments);
			can.batch.stop();
			return res;
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
			can.dispatch.call(instance, {type:"change", target: instance}, [funcName]);

			//!steal-remove-start
			can.dev.log("Model.js - " + (constructor.shortName || this.name) + ""+this.id(instance)+" " + funcName);
			//!steal-remove-end

			// Call event on the instance's Class
			can.dispatch.call(constructor, funcName, [instance]);
		};
	});

	
	return behavior;
	
});
