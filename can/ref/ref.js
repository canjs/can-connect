/**
 * @module {connect.Behavior} can-connect/can/ref/ref
 * @parent can-connect.behaviors
 * @group can-connect/can/ref/ref.hydrators hydrators
 * @group can-connect/can/ref/ref.methods methods
 *
 * @description Handle references to instances in the raw data returned by the server.
 *
 * @signature `canRef( baseConnection )`
 *
 *   Makes a reference type that loads the related type or holds onto an existing one. This handles circular references and loads relevant data as needed.
 *
 *   @param {connection} baseConnection The base connection should have [can-connect/can/map/map]
 *   already applied to it.
 *
 * @body
 *
 * ## Use
 *
 * `can/ref` is useful when the server might return either a reference to
 * a value or the value itself.  For example, in a MongoDB setup,
 * a request like `GET /game/5` might return:
 *
 * ```
 * {
 *   id: 5,
 *   teamRef: 7,
 *   score: 21
 * }
 * ```
 *
 * But a request like `GET /game/5?$populate=teamRef` might return:
 *
 * ```
 * {
 *   id: 5,
 *   teamRef: {id: 7, name: "Cubs"},
 *   score: 21
 * }
 * ```
 *
 * `can/ref` can handle this ambiguity and even make lazy loading possible.
 *
 * To use `can/ref`, first create a Map and a connection for the referenced type:
 *
 * ```
 * var Team = DefineMap.extend({
 *   id: 'string'
 * });
 *
 * connect([
 *   require("can-connect/constructor/constructor"),
 *   require("can-connect/constructor/store/store"),
 *   require("can-connect/can/map/map"),
 *   require("can-connect/can/ref/ref")
 * ],{
 *     Map: Team,
 *     List: Team.List,
 *     ...
 * })
 * ```
 *
 * The connection is necessary because it creates an instance store which will
 * hold instances of `Team` that the `Team.Ref` type will be able to access.
 *
 * Now we can create a reference to the Team within a Game map and the Game's connection:
 *
 * ```
 * var Game = DefineMap.extend({
 *   id: 'string',
 *   teamRef: {type: Team.Ref.type},
 *   score: "number"
 * });
 *
 * superMap({
 *   Map: Game,
 *   List: Game.List
 * })
 * ```
 *
 * Now, `teamRef` is a [can-connect/can/ref/ref.Map.Ref] type, which will
 * house the id of the reference no matter how the server returns data, e.g.
 * `game.teamRef.id`.
 *
 * For example, without populating the team data:
 *
 * ```
 * Game.get({id: 5}).then(function(game){
 *   game.teamRef.id //-> 7
 * });
 * ```
 *
 * With populating the team data:
 *
 * ```
 * Game.get({id: 5, populate: "teamRef"}).then(function(game){
 *   game.teamRef.id //-> 7
 * });
 * ```
 *
 * The values of other properties and methods on the [can-connect/can/ref/ref.Map.Ref] type
 * are determined by if the reference was populated or the referenced item already exists
 * in the [can-connect/constructor/store/store.instanceStore].
 *
 * For example, `value`, which points to the referenced instance, will be populated if the reference was populated:
 *
 * ```
 * Game.get({id: 5, $populate: "teamRef"}).then(function(game){
 *   game.teamRef.value.name //-> 5
 * });
 * ```
 *
 * Or, it will be populated if that instance had been loaded through another means and
 * it’s in the instance store:
 *
 * ```
 * Team.get({id: 7}).then(function(team){
 *   // binding adds things to the store
 *   team.on("name", function(){})
 * }).then(function(){
 *   Game.get({id: 5}).then(function(game){
 *     game.teamRef.value.name //-> 5
 *   });
 * })
 * ```
 *
 * `value` is an [can-define.types.get asynchronous getter], which means that even if
 * the referenced value isn't populated or loaded through the store, it can be lazy loaded. This
 * is generally most useful in a template.
 *
 * The following will make an initial request for game `5`, but when the template
 * tried to read and listen to `game.teamRef.value.name`, a request for team `7`
 * will be made.
 *
 * ```
 * var template = stache("{{game.teamRef.value.name}} scored {{game.score}} points");
 * Game.get({id: 5}).then(function(game){
 *   template({game: game});
 * });
 * ```
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
	 * @param  {string} id    string representing the record id
	 * @param  {Object} value instance loaded / hydrated
	 * @return {Object}       Instance for the id
	 */
	var Ref = function(id, value){
		if(typeof id === "object") {
			value = id;
			id = value[idProp];
		}
		// check if this is in the store
		var storeRef = Ref.store.get(id);
		if(storeRef) {
			if (value && !storeRef._value){
				if(value instanceof connection.Map) {
					storeRef._value = value;
				} else {
					storeRef._value = connection.hydrateInstance(value);
				}
			}
			return storeRef;
		}
		// if not, create it
		this[idProp] = id;
		if(value) {
			// if the value is already an instance, use it.

			if(value instanceof connection.Map) {
				this._value = value;
			} else {
				this._value = connection.hydrateInstance(value);
			}
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
	 * A WeakReferenceMap that contains instances being created by their `._cid` property.
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
		/**
		 * @property {Promise} can-connect/can/ref/ref.Map.Ref.prototype.promise promise
		 * @parent can-connect/can/ref/ref.Map.Ref.prototype
		 * @signature `ref.promise`
		 * Returns a promise if it has already been resolved, if not, returns a new promise.
		 * @return {Promise}
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
		/**
		 * @property {*} can-connect/can/ref/ref.Map.Ref.prototype.value value
		 * @parent can-connect/can/ref/ref.Map.Ref.prototype
		 * @signature `ref.value`
		 * Returns the actual object that reference points to.
		 * @return {object} actual object that reference points to
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
		 * @signature `ref.reason`
		 * Handles the rejection case for the promise.
		 * @return {Object} error message if the promise is rejected
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
	 * @function can-connect/can/ref/ref.Map.Ref.prototype.isResolved isResolved
	 * @parent can-connect/can/ref/ref.Map.Ref.prototype
	 *
	 * @signature `ref.isResolved`
	 * Returns a {boolean}.
	 * @return {boolean}
	 */
	Ref.prototype.isResolved = function(){
		return !!this._value || this._state === "resolved";
	};
	/**
	 * @function can-connect/can/ref/ref.Map.Ref.prototype.isRejected isRejected
	 * @parent can-connect/can/ref/ref.Map.Ref.prototype
	 * @signature `ref.isRejected`
	 * Returns boolean if the promise was rejected.
	 * @return {boolean}
	 */
	Ref.prototype.isRejected = function(){
		return this._state === "rejected";
	};

	/**
	 * @function can-connect/can/ref/ref.Map.Ref.prototype.isPending isPending
	 * @parent can-connect/can/ref/ref.Map.Ref.prototype
	 * @signature `ref.isPending`
	 * Returns true if the state is not 'resolved' or 'rejected'.
	 * @return {boolean}
	 */
	Ref.prototype.isPending = function(){
		return !this._value && (this._state !== "resolved" || this._state !== "rejected");
	};
	//return the id of the reference object when being serialized
	/**
	 * @function can-connect/can/ref/ref.Map.Ref.prototype.serialize serialize
	 * @parent can-connect/can/ref/ref.Map.Ref.prototype
	 * @signature `ref.serialize`
	 * Returns the `idProp`.
	 * @return {string} idProp
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


module.exports = connect.behavior("can/ref",function(baseConnection){
	return {
		/**
		 * @can-connect/can/ref/ref.init init
		 * @parent can-connect/can/ref/ref.methods
		 *
		 * @body Initializes the base connection and then creates and sets [can-connect/can/ref/ref.Map.Ref].
		 */
		init: function(){
			baseConnection.init.apply(this, arguments);
			this.Map.Ref = makeRef(this);
		}
	};
});
