/**
 * @module {connect.Behavior} can-connect/can/ref/ref
 * @parent can-connect.behaviors
 * @group can-connect/can/ref/ref.hydrators Hydrators
 * @group can-connect/can/ref/ref.methods Methods
 *
 * @signature `canRef( baseConnect )`
 *
 *   Makes a reference type that is smart enough to load the related type or hold onto an existing one.
 *
 *   @param {connection} baseConnect The base connection should have [can-connect/can/map/map]
 *   already applied to it.
 *
 * @body
 *
 * ## Use
 *
 * To use `can/ref`, first create a Map:
 *
 * ```
 * var Team = DefineMap.extend({
 * 	id: 'string'
 * });
 *
 * ```
 *
 * We can then create a connection:
 *
 * ```
 * connect([constructor, constructorStore, canMap,canRef,{
 *	 getData: function(){
 *		 return Promise.resolve({id: 3, name: "Bears"});
 *	 }
 * }],{
 *	 Map: Team
 * });
 * ```
 *
 * Now we can create a reference to the Team within a Game map:
 * ```
 * var Game = DefineMap.extend({
 *	 id: 'string',
 *	 teamRef: {type: Team.Ref.type},
 *	 score: "number"
 * });
 * ```
 *
 * Whenever `teamRef` is accessed, a request is dispatched to the server to load the OSProject instance. If an instance already exists in memory it will be hydrated, instead of a server call.
 *
 * ### Retrieving value
 * To get the value for the referenced object simply call the `value` property on the object
 *
 * ```
 *  Game.get({id: 1, populate: "teamRef"}).then(function(game){
 *		var teamRef = game.teamRef;
 *  	//access the team name
 *  	teamRef.value.name //-> Cubs
 * });
 * ```
 *
 * ### Checking for errors
 * You can check if there was an error loading the reference object by calling the `isRejected` method
 *
 *
 *
 */


var connect = require("can-connect");
var getIdProps = require("can-connect/helpers/get-id-props");
var WeakReferenceMap = require("can-connect/helpers/weak-reference-map");
var Observation = require("can-observation");
var constructorStore = require("can-connect/constructor/store/store");
var define = require("can-define");

var makeRef = function(connection){
	var idProp = getIdProps(connection)[0];
	/**
	 * @property {constructor} can-connect/can/ref/ref.Map.Ref Map.Ref
	 * @parent can-connect/can/ref/ref.hydrators
	 * @group can-connect/can/ref/ref.Map.Ref.static static
	 * @group can-connect/can/ref/ref.Map.Ref.prototype prototype
	 * @param  {[type]} id    [description]
	 * @param  {[type]} value [description]
	 * @return {[type]}       [description]
	 */
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
	/**
	 * @property {can-connect/helpers/weak-reference-map} can-connect/can/ref/ref.Map.Ref.store store
	 * @parent can-connect/can/ref/ref.Map.Ref.static
	 */
	Ref.store = new WeakReferenceMap();
	Ref._requestInstances = {};
	/**
	 * @function can-connect/can/ref/ref.Map.Ref.type type
	 * @parent can-connect/can/ref/ref.Map.Ref.static
	 *
	 * @signature `Map.Ref.type(ref)`
	 *
	 *   @param {Object|String|Number} ref
	 *   @return {can-connect/can/ref/ref.Map.Ref}
	 */
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
		//Check if promise has already been resolved, if not, return a new promise
		/**
		 * @property {Promise} can-connect/can/ref/ref.Map.Ref.prototype.promise promise
		 * @parent can-connect/can/ref/ref.Map.Ref.prototype
		 * Returns a promise.
		 */
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
		//return the actual object that reference points to
		/**
		 * @property {*} can-connect/can/ref/ref.Map.Ref.prototype.value value
		 * @parent can-connect/can/ref/ref.Map.Ref.prototype
		 * Returns a promise.
		 */
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
		/**
		 * @property {*} can-connect/can/ref/ref.Map.Ref.prototype.reason reason
		 * @parent can-connect/can/ref/ref.Map.Ref.prototype
		 *
		 */
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
	/**
	 * @function can-connect/can/ref/ref.Map.Ref.prototype.isResolved
	 * @parent can-connect/can/ref/ref.Map.Ref.prototype
	 * Returns a promise.
	 */
	Ref.prototype.isResolved = function(){
		return !!this._value || this._state === "resolved";
	};
	/**
	 * @function can-connect/can/ref/ref.Map.Ref.prototype.isRejected
	 * @parent can-connect/can/ref/ref.Map.Ref.prototype
	 * Returns a promise.
	 */
	Ref.prototype.isRejected = function(){
		return this._state === "rejected";
	};
	Ref.prototype.isPending = function(){
		return !this._value && (this._state !== "resolved" || this._state !== "rejected");
	};
	//return the id of the reference object when being serialized
	/**
	 * @function can-connect/can/ref/ref.Map.Ref.prototype.serialize
	 * @parent can-connect/can/ref/ref.Map.Ref.prototype
	 * Returns a promise.
	 */
	Ref.prototype.serialize = function() {
		return this[idProp];
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
		/**
		 * @can-connect/can/ref/ref.init init
		 * @parent can-connect/can/ref/ref.methods
		 *
		 * Initializes the base connection and then creates and sets [can-connect/can/ref/ref.Map.Ref].
		 */
		init: function(){
			baseConnect.init.apply(this, arguments);
			this.Map.Ref = makeRef(this);
		}
	};
});
