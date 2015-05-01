/**
 * Connects a can.Map to everything that needs to be connected to
 */



var can = require("can/util/util");
var connect = require("can-connect");

/**
 * @module can-connect/constructor-map
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
	}
};

var listPrototypeOverwrites = {	
	setup: function(base, connection){
		return function (params) {
			// If there was a plain object passed to the List constructor,
			// we use those as parameters for an initial findAll.
			if (can.isPlainObject(params) && !can.isArray(params)) {
				base.apply(this);
				this.replace(can.isDeferred(params) ? params : connection.findAll(params));
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
	},
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


module.exports = connect.behavior("constructor-map",function(baseConnect, options){
	
	// overwrite 
	
	
	var behavior = {
		init: function(){
			overwrite(this, options.Map, mapOverwrites);
			overwrite(this, options.List, listPrototypeOverwrites, listStaticOverwrites);
			baseConnect.init.apply(this, arguments);
		},
		id: function(inst) {
			
			if(inst instanceof can.Map) {
				if(callCanReadingOnIdRead) {
					can.__reading(inst, this.idProp);
				}
				// Use `__get` instead of `attr` for performance. (But that means we have to remember to call `can.__reading`.)
				return inst.__get(this.idProp);
			} else {
				return inst[this.idProp];
			}
		},
		serializeInstance: function(instance){
			return instance.serialize();
		},
		serializeList: function(list){
			return list.serialize();
		},
		instance: function(values){
			return new options.Map(values);
		}, 
		list: function(listData, set){
			var list = new options.List(listData.data);
			can.each(listData, function (val, prop) {
				if (prop !== 'data') {
					list.attr(prop, val);
				}
			});
			list.__set = set;
			return list;
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
				instance.attr(can.isFunction(attrs.attr) ? attrs.attr() : attrs, options.constructor.removeAttr || false);
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
