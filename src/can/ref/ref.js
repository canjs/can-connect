var connect = require("can-connect");
var getIdProps = require("can-connect/helpers/get-id-props");
var WeakReferenceMap = require("can-connect/helpers/weak-reference-map");
var Observation = require("can-observation");
var constructorStore = require("can-connect/constructor/store/store");
var define = require("can-define");

var makeRef = function(connection){
	var idProp = getIdProps(connection)[0];

	var Ref = function(id, value){
		// check if this is in the store
		if(Ref.store.has(id)) {
			return Ref.store.get(id);
		}
		// if not, create it
		this[idProp] = id;
		if(value) {
			this._value = connection.hydrateInstance(value);
		}


		// check if this is being made during a request
		// if it is, save it
		if( constructorStore.requests.count() > 0 ) {
			if(! Ref._requestInstances[id] ) {
				Ref.store.addReference(id, this);
				Ref._requestInstances[id] = this;
			}
		}
	};
	Ref.store = new WeakReferenceMap();
	Ref._requestInstances = {};
	Ref.type = function(ref) {
		if(ref && typeof ref !== "object") {
			// get or make the existing reference from the store
			return new Ref(ref);
	    } else {
	      // get or make the reference in the store, update the instance too
	      return new Ref(
			  ref[idProp],
			  ref);
	    }
	};
	var defs = {
		promise: {
			get: function(){
				if(this._value) {
					return Promise.resolve(this._value);
				} else {
					var props = {};
					props[idProp] = this[idProp];
					return connection.Map.get(props);
				}
			}
		},
		_state: {
			get: function(lastSet, resolve){
				if(resolve) {
					this.promise.then(function(){
						resolve("resolved");
					}, function(){
						resolve("rejected");
					});
				}

				return "pending";
			}
		},
		value: {
			get: function(lastSet, resolve) {
				if(this._value) {
					return this._value;
				} else if(resolve){
					this.promise.then(function(value){
						resolve(value);
					});
				}
			}
		},
		reason: {
			get: function(lastSet, resolve){
				if(this._value) {
					return undefined;
				} else {
					this.promise.catch(function(value){
						resolve(value);
					});
				}
			}
		}
	};
	defs[idProp] = {
		type: "*",
		set: function(){
			this._value = undefined;
		}
	};

	define(Ref.prototype,defs);

	Ref.prototype.unobservedId = Observation.ignore(function(){
		return this[idProp];
	});
	Ref.prototype.isResolved = function(){
		return !!this._value || this._state === "resolved";
	};
	Ref.prototype.isRejected = function(){
		return this._state === "rejected";
	};
	Ref.prototype.isPending = function(){
		return !this._value && (this._state !== "resolved" || this._state !== "rejected");
	};
	Ref.prototype.serialize = function() {
		return this.unobservedId();
	};

	var baseEventSetup = Ref.prototype._eventSetup;
	Ref.prototype._eventSetup = function(){
		Ref.store.addReference(this.unobservedId(), this);
		return baseEventSetup.apply(this, arguments);
	};
	var baseTeardown = Ref.prototype._eventTeardown;
	Ref.prototype._eventTeardown = function(){
		Ref.store.deleteReference(this.unobservedId(),this);
		return baseTeardown.apply(this, arguments);
	};

	Ref.prototype.serialize = function() {
		return this[idProp];
	};

	constructorStore.requests.on("end", function(){
		for(var id in Ref._requestInstances) {
			Ref.store.deleteReference(id);
		}
		Ref._requestInstances = {};
	});

	return Ref;
};


module.exports = connect.behavior("can/ref",function(baseConnect){
	return {
		init: function(){
			baseConnect.init.apply(this, arguments);
			this.Map.Ref = makeRef(this);
		}
	};
});
