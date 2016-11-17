/**
 * @module {connect.Behavior} can-connect/constructor/store/store
 * @parent can-connect.behaviors
 * @group can-connect/constructor/store/store.stores 0 stores
 * @group can-connect/constructor/store/store.crud 1 crud methods
 * @group can-connect/constructor/store/store.hydrators 2 hydrators
 *
 * Supports saving and retrieving lists and instances in a store.
 *
 * @signature `constructorStore( baseConnection )`
 *
 *   Overwrites baseConnection so it contains a store for
 *   instances and lists.  It traps calls to the
 *   [can-connect/constructor/store/store.hydrateInstance] and
 *   [can-connect/constructor/store/store.hydrateList] methods to
 *   use instances or lists in the store if available. It
 *   overwrites "CRUD METHODS" to make sure that while any request
 *   is pending, all lists and instances are added to the store.
 *   Finally, it provides methods to add and remove items in the
 *   store via reference counting.
 *
 * @body
 *
 * ## Use
 *
 * The `constructor-store` extension is used to:
 *  - provide a store of instances and lists used by the client.
 *  - prevent multiple instances from being hydrated for the same [can-connect/base/base.id] or multiple
 *    lists for the same [can-connect/base/base.listSet].
 *
 * The stores provide access to an instance
 * by its [can-connect/base/base.id] or a list by its [can-connect/base/base.listSet]. These stores are
 * used by other extensions like [can-connect/real-time/real-time] and [can-connect/fall-through-cache/fall-through-cache].
 *
 * Lets see how `constructor-store`'s behavior be used to prevent multiple
 * instances from being hydrated.  This example allows you to create multiple instances of a `todoEditor` that loads
 * and edits a todo instance.
 *
 * @demo demos/can-connect/constructor-store.html
 *
 * You'll notice that you can edit one todo's name and the other
 * todo editors update.  This is because each `todoEditor` gets the same instance in memory.  So that when it
 * updates the todo's name ...
 *
 * ```
 * element.firstChild.onchange = function(){
 *   todo.name = this.value;
 * };
 * ```
 *
 * ... the other widgets update because they have bound on the same instance:
 *
 * ```
 * Object.observe(todo, update, ["update"] );
 * todosConnection.addInstanceReference(todo);
 * ```
 *
 * Each `todoEditor` gets the same instance because they called [can-connect/constructor/store/store.addListReference]
 * which makes it so anytime a todo with `id=5` is requested, the same instance is returned.
 *
 * Notice that if you change an input element, and click "Create Todo Editor", all the `todoEditor`
 * widgets are set back to the old text.  This is because whenever data is loaded from the server,
 * it is passed to [can-connect/constructor/constructor.updatedInstance] which defaults to overwriting any current
 * properties with those from the server.
 *
 * To make sure the server has the latest, you can save a todo by hitting "ENTER".
 *
 * Finally, this widget cleans itself up nicely when it is removed by unobserving the
 * `todo` instance and
 * [can-connect/constructor/store/store.deleteInstanceReference deleting the instance reference]. Doing this
 * prevents memory leaks.
 *
 * ```
 * Object.unobserve(todo, update, ["update"] );
 * todosConnection.deleteInstanceReference(todo);
 * ```
 *
 *
 *
 */
var connect = require("can-connect");
var WeakReferenceMap = require("can-connect/helpers/weak-reference-map");
var sortedSetJSON = require("can-connect/helpers/sorted-set-json");
var canEvent = require("can-event");
var assign = require("can-util/js/assign/assign");

// shared across all connections
var pendingRequests = 0;
var noRequestsTimer = null;
var requests = {
	increment: function(connection){
		pendingRequests++;
		clearTimeout(noRequestsTimer);
	},
	decrement: function(connection){
		pendingRequests--;
		if(pendingRequests === 0) {
			noRequestsTimer = setTimeout(function(){
				requests.dispatch("end");
			},10);
		}
	},
	count: function(){
		return pendingRequests;
	}
};
assign(requests, canEvent);


var constructorStore = connect.behavior("constructor/store",function(baseConnection){

	var behavior = {
		/**
		 * @property {can-connect/helpers/weak-reference-map} can-connect/constructor/store/store.instanceStore instanceStore
		 * @parent can-connect/constructor/store/store.stores
		 *
		 * A store of instances mapped by [can-connect/base/base.id].
		 *
		 * @type {can-connect/helpers/weak-reference-map}
		 *
		 *   Stores instances by their [can-connect/base/base.id] which have had
		 *   [can-connect/constructor/store/store.addInstanceReference] called more
		 *   times than [can-connect/constructor/store/store.deleteInstanceReference].
		 *
		 *   ```js
		 *   connection.addInstanceReference(todo5);
		 *   connection.instanceStore.get("5") //-> todo5
		 *   ```
		 */
		instanceStore: new WeakReferenceMap(),
		/**
		 * @property {can-connect/helpers/weak-reference-map} can-connect/constructor/store/store.listStore listStore
		 * @parent can-connect/constructor/store/store.stores
		 * A store of lists mapped by [can-connect/base/base.listSet].
		 *
		 * @type {can-connect/helpers/weak-reference-map}
		 *
		 *   Stores lists by their [can-connect/base/base.listSet] which have had
		 *   [can-connect/constructor/store/store.addListReference] called more
		 *   times than [can-connect/constructor/store/store.deleteListReference].
		 *
		 *   ```js
		 *   connection.addInstanceReference(allTodos,{});
		 *   connection.instanceStore.get({}) //-> allTodos
		 *   ```
		 */
		listStore: new WeakReferenceMap(),
		_requestInstances: {},
		_requestLists: {},
		_finishedRequest: function(){
			var id;
			requests.decrement(this);
			if(requests.count() === 0) {
				for(id in this._requestInstances) {
					this.instanceStore.deleteReference(id);
				}
				this._requestInstances = {};
				for(id in this._requestLists) {
					this.listStore.deleteReference(id);
				}
				this._requestLists = {};
			}
		},
		/**
		 * @function can-connect/constructor/store/store.addInstanceReference addInstanceReference
		 * @parent can-connect/constructor/store/store.stores
		 *
		 * Adds a reference to an instance so it can be easily looked up.
		 *
		 * @signature `connection.addInstanceReference( instance )`
		 *
		 *   Adds a reference to an instance in the [can-connect/constructor/store/store.instanceStore] by [can-connect/base/base.id].
		 *   The number of references are incremented.
		 *
		 *   @param {can-connect/Instance} instance The instance to add.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * The [can-connect/constructor/store/store.instanceStore] contains a collection of instances
		 * created for each [can-connect/base/base.id]. The `instanceStore` is used to prevent creating the
		 * same instance multiple times.  Instances need to be added to this store for this behavior
		 * to happen.  To do this, call `addInstanceReference` like the following:
		 *
		 * ```
		 * // A basic connection:
		 * var todoConnection = connect([
		 *   require("can-connect/constructor/store/store"),
		 *   require("can-connect/constructor/constructor"),
		 *   require("can-connect/data/url/url")
		 * ], {
		 *   url: "/todos"
		 * });
		 *
		 * var originalTodo;
		 *
		 * // Get a todo:
		 * todoConnection.get({id: 5}).then(function( todo ){
		 *
		 *   // Add it to the store
		 *   todoConnection.addInstanceReference(todo);
		 *   originalTodo = todo;
		 * });
		 * ```
		 *
		 * Now, if you were to retrieve the same data sometime later,
		 * it would be the same instance.
		 *
		 * ```
		 * todoConnection.get({id: 5}).then(function( todo ){
		 *
		 *   todo === originalTodo //-> true
		 * });
		 * ```
		 *
		 * The `.getData`  response data is passed with `originalTodo` to [can-connect/constructor/constructor.updatedInstance]
		 * which can update the `originalTodo` with the new data.
		 *
		 *
		 * All these instances stay in memory.  Use [can-connect/constructor/store/store.deleteInstanceReference]
		 * to remove them.
		 *
		 * Typically, `addInstanceReference` is called when something expresses interest in the interest, such
		 * as an event binding, and `deleteInstanceReference` is called when interest is removed.
		 *
		 */
		addInstanceReference: function(instance, id) {
			this.instanceStore.addReference( id || this.id(instance), instance );
		},
		addInstanceMetaData: function(instance, name, value){
			var data = this.instanceStore.set[this.id(instance)];
			if(data) {
				data[name] = value;
			}
		},
		getInstanceMetaData: function(instance, name){
			var data = this.instanceStore.set[this.id(instance)];
			if(data) {
				return data[name];
			}
		},
		deleteInstanceMetaData: function(instance, name){
			var data = this.instanceStore.set[this.id(instance)];

			delete data[name];
		},
		/**
		 * @function can-connect/constructor/store/store.deleteInstanceReference deleteInstanceReference
		 * @parent can-connect/constructor/store/store.stores
		 *
		 * Removes a reference to an instance by [can-connect/base/base.id] so it can be garbage collected.
		 *
		 * @signature `connection.addInstanceReference( instance )`
		 *
		 *   Decrements the number of references to an instance in the [can-connect/constructor/store/store.instanceStore].
		 *   Removes the instance if there are no longer any references.
		 *
		 *   @param {can-connect/Instance} instance The instance to remove.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * `deleteInstanceReference` is called to remove references to instances in
		 * the [can-connect/constructor/store/store.instanceStore] so the instances maybe garbage
		 * collected.  It's usually called when the application or some part of the application no
		 * longer is interested in an instance.
		 *
		 * [can-connect/constructor/store/store.addInstanceReference] has an example of adding
		 * an instance to the store.  The following continues that example to remove
		 * the `originalTodo` from the store:
		 *
		 * ```
		 * todoConnection.deleteInstanceReference(originalTodo);
		 * ```
		 *
		 */
		deleteInstanceReference: function(instance) {
			this.instanceStore.deleteReference( this.id(instance), instance );
		},
		/**
		 * @property {WeakReferenceMap} can-connect/constructor/store/store.addListReference addListReference
		 * @parent can-connect/constructor/store/store.stores
		 *
		 * Adds a reference to a list so it can be easily looked up.
		 *
		 * @signature `connection.addListReference( list[, set] )`
		 *
		 *   Adds a reference to a list in the [can-connect/constructor/store/store.listStore].  The number of
		 *   references are incremented.
		 *
		 *   @param {can-connect.List} list The list to add.
		 *
		 *   @param {can-set/Set} [set] The set this list represents if it can't be identified with [can-connect/base/base.listSet].
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * The [can-connect/constructor/store/store.listStore] contains a collection of lists
		 * created for each [can-connect/base/base.listSet]. The `listStore` is used to prevent creating the
		 * same list multiple times and for identifying a list for a given set. Lists need to be added to this store for this behavior
		 * to happen.  To do this, call `addListReference` like the following:
		 *
		 * ```
		 * // A basic connection:
		 * var todoConnection = connect([
		 *   require("can-connect/constructor/store/store"),
		 *   require("can-connect/constructor/constructor"),
		 *   require("can-connect/data/url/url")
		 * ], {
		 *   url: "/todos"
		 * });
		 *
		 * var dueToday;
		 *
		 * // Get a todo:
		 * todoConnection.getList({due: "today"}).then(function( todos ){
		 *
		 *   // Add it to the store
		 *   todoConnection.addListReference(todos, {due: "today"});
		 *   dueToday = todos;
		 * });
		 * ```
		 *
		 * Now, if you were to retrieve the same data sometime later,
		 * it would be the same list.
		 *
		 * ```
		 * todoConnection.get({due: "today"}).then(function( todos ){
		 *
		 *   todos === dueToday //-> true
		 * });
		 * ```
		 *
		 * The `.getListData`  response data is passed with `dueToday` to [can-connect/constructor/constructor.updatedList]
		 * which can update `dueToday` with the new data.
		 *
		 * All these lists stay in memory.  Use [can-connect/constructor/store/store.deleteListReference]
		 * to remove them.
		 *
		 * Typically, `addListReference` is called when something expresses interest in the list, such
		 * as an event binding, and `deleteListReference` is called when interest is removed.
		 *
		 */
		addListReference: function(list, set) {
			var id = sortedSetJSON( set || this.listSet(list) );
			if(id) {
				this.listStore.addReference( id, list );
			}
		},
		/**
		 * @function can-connect/constructor/store/store.deleteListReference deleteListReference
		 * @parent can-connect/constructor/store/store.stores
		 *
		 * Removes a reference to a list by [can-connect/base/base.listSet] so it can be garbage collected.
		 *
		 * @signature `connection.addInstanceReference( instance )`
		 *
		 *   Decrements the number of references to an list in the [can-connect/constructor/store/store.listStore].
		 *   Removes the list if there are no longer any references.
		 *
		 *   @param {can-connect/Instance} list The list to remove.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * `deleteListReference` is called to remove references to lists in
		 * the [can-connect/constructor/store/store.listStore] so the lists maybe garbage
		 * collected.  It's usually called when the application or some part of the application no
		 * longer is interested in an list.
		 *
		 * [can-connect/constructor/store/store.addListReference] has an example of adding
		 * a list to the store.  The following continues that example to remove
		 * the `dueToday` from the store:
		 *
		 * ```
		 * todoConnection.deleteListReference(dueToday);
		 * ```
		 *
		 */
		deleteListReference: function(list, set) {
			var id = sortedSetJSON( set || this.listSet(list) );
			if(id) {
				this.listStore.deleteReference( id, list );
			}
		},
		/**
		 * @function can-connect/constructor/store/store.hydratedInstance hydratedInstance
		 * @parent can-connect/constructor/store/store.hydrators
		 *
		 * Called when [can-connect/constructor/store/store.hydrateInstance] is called and a new instance is created.
		 *
		 * @signature `hydratedInstance(instance)`
		 *
		 *   If there are pending requests, the instance is kept in the [can-connect/constructor/store/store.instanceStore].
		 *
		 *   @param {can-connect/Instance} instance The hydrated instance.
		 *
		 */
		// ## hydratedInstance
		hydratedInstance: function(instance){
			if( requests.count() > 0) {
				var id = this.id(instance);
				if(! this._requestInstances[id] ) {
					this.addInstanceReference(instance);
					this._requestInstances[id] = instance;
				}

			}
		},
		/**
		 * @function can-connect/constructor/store/store.hydrateInstance hydrateInstance
		 * @parent can-connect/constructor/store/store.hydrators
		 *
		 * Returns a instance given raw data.
		 *
		 * @signature `connection.hydrateInstance(props)`
		 *
		 *   Overwrites the base `hydratedInstance` so that if a matching instance is
		 *   in the [can-connect/constructor/store/store.instanceStore], that instance will
		 *   be [can-connect/constructor/constructor.updatedInstance updated] with `props` and returned.
		 *   If there isn't a matching instance, the base `hydrateInstance` will be called.
		 *
		 *   @param {Object} props The raw data used to create an instance.
		 *   @return {Instance} A typed instance created or updated from `props`.
		 */
		// Overwrites hydrateInstance so it looks in the store and calls hydratedInstance.
		hydrateInstance: function(props){
			var id = this.id(props);
			if((id || id === 0) && this.instanceStore.has(id) ) {
				var storeInstance = this.instanceStore.get(id);
				// TODO: find a way to prevent this from being called so many times.
				this.updatedInstance(storeInstance, props);
				return storeInstance;
			}
			var instance = baseConnection.hydrateInstance.call(this, props);
			this.hydratedInstance(instance);
			return instance;
		},
		/**
		 * @function can-connect/constructor/store/store.hydratedList hydratedList
		 * @parent can-connect/constructor/store/store.hydrators
		 *
		 * Called whenever [can-connect/constructor/store/store.hydrateList] is called with the hydration result.
		 *
		 * @signature `hydratedList(list)`
		 *
		 *   If there are pending requests, the list is kept in the [can-connect/constructor/store/store.listStore].
		 *
		 *   @param {can-connect.List} list The hydrated list.
		 *
		 *
		 */
		hydratedList: function(list, set){
			if( requests.count() > 0) {
				var id = sortedSetJSON( set || this.listSet(list) );
				if(id) {
					if(! this._requestLists[id] ) {
						this.addListReference(list, set);
						this._requestLists[id] = list;
					}
				}


			}
		},
		/**
		 * @function can-connect/constructor/store/store.hydrateList hydrateList
		 * @parent can-connect/constructor/store/store.hydrators
		 *
		 * Returns a list given raw data.
		 *
		 * @signature `connection.hydrateList( listData, set )`
		 *
		 *   Overwrites the base `hydrateList` so that if a matching list is
		 *   in the [can-connect/constructor/store/store.listStore], that list will
		 *   be [can-connect/constructor/constructor.updatedList updated] with `listData` and returned.
		 *   If there isn't a matching list, the base `hydrateList` will be called.
		 *
		 *   @param {can-connect.listData} listData List data to hyrate into a list type.
		 *   @param {can-set/Set} set The set that represents the data in `listData`.
		 *   @return {List} A list from either the store or a newly created instance.
		 */
		hydrateList: function(listData, set){
			set = set || this.listSet(listData);
			var id = sortedSetJSON( set );

			if( id && this.listStore.has(id) ) {
				var storeList = this.listStore.get(id);
				this.updatedList(storeList, listData, set);
				return storeList;
			}
			var list = baseConnection.hydrateList.call(this, listData, set);
			this.hydratedList(list, set);
			return list;
		},
		/**
		 * @function can-connect/constructor/store/store.getList getList
		 * @parent can-connect/constructor/store/store.crud
		 *
		 * Overwrites [can-connect/connection.getList] so any
		 * [can-connect/constructor/store/store.hydrateInstance hydrated instances] or [can-connect/constructor/store/store.hydrateList hydrated lists]
		 * are kept in the store until the response resolves.
		 *
		 * @signature `connection.getList( set )`
		 *
		 *   Increments the request counter so these instances will be stored
		 *   and then decrements it after the request is complete.
		 *
		 *
		 *   @param {can-set/Set} set Params used to specify which list to retrieve.
		 *   @return {Promise<instance>} The promise returned by the base connection's [can-connect/connection.getList].
		 */
		getList: function(params) {
			var self = this;
			requests.increment(this);
			var promise = baseConnection.getList.call(this, params);

			promise.then(function(instances){
				self._finishedRequest();
			}, function(){
				self._finishedRequest();
			});
			return promise;
		},
		/**
		 * @function can-connect/constructor/store/store.get get
		 * @parent can-connect/constructor/store/store.crud
		 *
		 * Overwrites [can-connect/connection.get] so any
		 * [can-connect/constructor/store/store.hydrateInstance hydrated instances] are kept in the
		 * store until the response resolves.
		 *
		 * @signature `connection.get( params )`
		 *
		 *   Increments the request counter so this instance will be stored
		 *   and then decrements it after the request is complete.
		 *
		 *
		 *   @param {Object} params Params used to specify which instance to retrieve.
		 *   @return {Promise<instance>} The promise returned by the base connection's [can-connect/connection.get].
		 */
		get: function(params) {
			var self = this;
			requests.increment(this);
			var promise = baseConnection.get.call(this, params);

			promise.then(function(instance){
				self._finishedRequest();
			}, function(){
				self._finishedRequest();
			});
			return promise;

		},
		/**
		 * @function can-connect/constructor/store/store.save save
		 * @parent can-connect/constructor/store/store.crud
		 *
		 * Overwrites [can-connect/connection.save] so any
		 * [can-connect/constructor/store/store.hydrateInstance hydrated instances] are kept in the
		 * store until the response resolves.
		 *
		 * @signature `connection.save( instance )`
		 *
		 *   Increments the request counter so this instance will be stored
		 *   and then decrements it after the request is complete.
		 *
		 *   ```
		 *   var promise = connection.save(todo5);
		 *   connection.instanceStore.get("5") //-> todo5
		 *   promise.then(function(){
		 *     connection.instanceStore.has("5") //-> false
		 *   })
		 *   ```
		 *
		 *   @param {Object} instance An typed instance.
		 *   @return {Promise<instance>} The promise returned by the base connection's [can-connect/connection.save].
		 */
		save: function(instance) {
			var self = this;
			requests.increment(this);

			var updating = !this.isNew(instance);
			if(updating) {
				this.addInstanceReference(instance);
			}

			var promise = baseConnection.save.call(this, instance);

			promise.then(function(instances){
				if(updating) {
					self.deleteInstanceReference(instance);
				}
				self._finishedRequest();
			}, function(){
				self._finishedRequest();
			});
			return promise;
		},
		/**
		 * @function can-connect/constructor/store/store.destroy destroy
		 * @parent can-connect/constructor/store/store.crud
		 *
		 * Overwrites [can-connect/connection.destroy] so any
		 * [can-connect/constructor/store/store.hydrateInstance hydrated instances] are kept in the
		 * store until the response resolves.
		 *
		 * @signature `connection.destroy( instance )`
		 *
		 *   Increments the request counter so this instance will be stored
		 *   and then decrements it after the request is complete.
		 *
		 *   ```
		 *   var promise = connection.destroy(todo5);
		 *   connection.instanceStore.get("5") //-> todo5
		 *   promise.then(function(){
		 *     connection.instanceStore.has("5") //-> false
		 *   })
		 *   ```
		 *
		 *   @param {Object} instance An typed instance.
		 *   @return {Promise<instance>} The promise returned by the base connection's [can-connect/connection.destroy].
		 */
		destroy: function(instance) {
			var self = this;
			requests.increment(this);
			var promise = baseConnection.destroy.call(this, instance);

			promise.then(function(instance){
				self._finishedRequest();
			}, function(){
				self._finishedRequest();
			});
			return promise;

		}
	};

	return behavior;

});
constructorStore.requests = requests;

module.exports = constructorStore;
