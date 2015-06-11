/**
 * @module can-connect/constructor-store constructor-store
 * @parent can-connect.modules
 * @group can.connect/constructor-store.stores 0 Stores
 * @group can.connect/constructor-store.crud 1 CRUD Methods
 * @group can.connect/constructor-store.instantiators 2 Instantiators
 * 
 * Connect CRUD methods to a constructor function.
 * 
 * Consumes:
 * 
 * - getListData, getData, createData, updateData, destroyData
 * 
 * Produces:
 * 
 * - getList, getInstance, save, destroy, id, createdInstance, updatedInstance
 * 
 * @param {{}} options
 * 
 *   @option {function} instance
 *   @option {function} list
 *   @option {String} id
 */
var can = require("can/util/util");
var connect = require("can-connect");
var WeakReferenceMap = require("./helpers/weak-reference-map");
var sortedSetJSON = require("./helpers/sorted-set-json");

module.exports = connect.behavior("constructor-store",function(baseConnect){
	// - when an instance is created, and there are requests, add to the store
	// - this might need to be done by the framework
	// - need a hook for when an instance is created outside 
	// - of this loop ... or possibly if an ID is added
	// 
	// - add b/c a request might be going ... all instances should go through this
	// - add b/c it is observed
	//
	// - when an id property is added and we are binding
	// - looked up by `makeInstance`

	var behavior = {
		/**
		 * @property {WeakReferenceMap} can.connect/constructor-store.instanceStore instanceStore
		 * @parent can.connect/constructor-store.stores
		 * 
		 */
		instanceStore: new WeakReferenceMap(),
		/**
		 * @property {WeakReferenceMap} can.connect/constructor-store.listStore listStore
		 * @parent can.connect/constructor-store.stores
		 * 
		 */
		listStore: new WeakReferenceMap(),
		_requestInstances: {},
		_requestLists: {},
		_pendingRequests: 0,
		_finishedRequest: function(){
			this._pendingRequests--;
			if(this._pendingRequests === 0) {
				for(var id in this._requestInstances) {
					this.instanceStore.deleteReference(id);
				}
				this._requestInstances = {};
				for(var id in this._requestLists) {
					this.listStore.deleteReference(id);
				}
				this._requestLists = {};
			}
		},
		/**
		 * @function can.connect/constructor-store.addInstanceReference addInstanceReference
		 * @parent can.connect/constructor-store.stores
		 * 
		 * Adds a reference to an instance so it can be easily looked up.
		 * 
		 * @signature `connection.addInstanceReference( instance )`
		 * 
		 *   Adds a reference to an instance in the [can.connect/constructor-store.instanceStore] by [connection.id]. 
		 *   The number of references are incremented.  
		 * 
		 *   @param {Instance} instance The instance to add.
		 * 
		 * @body
		 * 
		 * ## Use
		 * 
		 * The [can.connect/constructor-store.instanceStore] contains a collection of instances
		 * created for each [connection.id]. The `instanceStore` is used to prevent creating the 
		 * same instance multiple times.  Instances need to be added to this store for this behavior
		 * to happen.  To do this, call `addInstanceReference` like the following:
		 * 
		 * ```
		 * // A basic connection:
		 * var todoConnection = connect([
		 *   'constructor-store',
		 *   'constructor',
		 *   'data-url'],
		 *   {
		 *     url: "/todos"
		 *   });
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
		 * The `.getData`  response data is passed with `originalTodo` to [can-connect/constructor.updatedInstance]
		 * which can update the `originalTodo` with the new data.
		 * 
		 * 
		 * All these instances stay in memory.  Use [can.connect/constructor-store.deleteInstanceReference]
		 * to remove them.  
		 * 
		 * Typically, `addInstanceReference` is called when something expresses interest in the interest, such
		 * as an event binding, and `deleteInstanceReference` is called when interest is removed.
		 * 
		 */
		addInstanceReference: function(instance) {
			this.instanceStore.addReference( this.id(instance), instance );
		},
		/**
		 * @function can.connect/constructor-store.deleteInstanceReference deleteInstanceReference
		 * @parent can.connect/constructor-store.stores
		 * 
		 * Removes a reference to an instance by [connection.id] so it can be garbage collected.
		 * 
		 * @signature `connection.addInstanceReference( instance )`
		 * 
		 *   Decrements the number of references to an instance in the [can.connect/constructor-store.instanceStore].
		 *   Removes the instance if there are no longer any references. 
		 * 
		 *   @param {Instance} instance The instance to remove.
		 * 
		 * @body
		 * 
		 * ## Use
		 * 
		 * `deleteInstanceReference` is called to remove references to instances in 
		 * the [can.connect/constructor-store.instanceStore] so the instances maybe garbage 
		 * collected.  It's usually called when the application or some part of the application no
		 * longer is interested in an instance.
		 * 
		 * [can.connect/constructor-store.addInstanceReference] has an example of adding 
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
		 * @property {WeakReferenceMap} can.connect/constructor-store.addListReference addListReference
		 * @parent can.connect/constructor-store.stores
		 * 
		 * Adds a reference to a list so it can be easily looked up.
		 * 
		 * @signature `connection.addListReference( list[, set] )`
		 * 
		 *   Adds a reference to a list in the [can.connect/constructor-store.listStore].  The number of 
		 *   references are incremented.  
		 * 
		 *   @param {List} list The list to add.
		 * 
		 *   @param {Set} [set] The set this list represents if it can't be identified with [connection.listSet].
		 * 
		 * @body
		 * 
		 * ## Use
		 * 
		 * The [can.connect/constructor-store.listStore] contains a collection of lists
		 * created for each [connection.listSet]. The `listStore` is used to prevent creating the 
		 * same list multiple times and for identifying a list for a given set. Lists need to be added to this store for this behavior
		 * to happen.  To do this, call `addListReference` like the following:
		 * 
		 * ```
		 * // A basic connection:
		 * var todoConnection = connect([
		 *   'constructor-store',
		 *   'constructor',
		 *   'data-url'],
		 *   {
		 *     url: "/todos"
		 *   });
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
		 * The `.getListData`  response data is passed with `dueToday` to [can-connect/constructor.updatedList]
		 * which can update `dueToday` with the new data.
		 * 
		 * All these lists stay in memory.  Use [can.connect/constructor-store.deleteListReference]
		 * to remove them.  
		 * 
		 * Typically, `addListReference` is called when something expresses interest in the list, such
		 * as an event binding, and `deleteListReference` is called when interest is removed.
		 * 
		 */
		addListReference: function(list, set) {
			var id = sortedSetJSON( set || this.listSet(list) );
			this.listStore.addReference( id, list );
		},
		/**
		 * @function can.connect/constructor-store.deleteListReference deleteListReference
		 * @parent can.connect/constructor-store.stores
		 * 
		 * Removes a reference to a list by [connection.listSet] so it can be garbage collected.
		 * 
		 * @signature `connection.addInstanceReference( instance )`
		 * 
		 *   Decrements the number of references to an list in the [can.connect/constructor-store.listStore].
		 *   Removes the list if there are no longer any references. 
		 * 
		 *   @param {Instance} list The list to remove.
		 * 
		 * @body
		 * 
		 * ## Use
		 * 
		 * `deleteListReference` is called to remove references to lists in 
		 * the [can.connect/constructor-store.listStore] so the lists maybe garbage 
		 * collected.  It's usually called when the application or some part of the application no
		 * longer is interested in an list.
		 * 
		 * [can.connect/constructor-store.addListReference] has an example of adding 
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
			this.listStore.deleteReference( id, list );
		},
		/**
		 * @function can.connect/constructor-store.madeInstance madeInstance
		 * @parent can.connect/constructor-store.instantiators
		 * @param {Object} instance
		 */
		// Called whenever an instance is made.
		madeInstance: function(instance){
			if( this._pendingRequests > 0) {
				var id = this.id(instance);
				if(! this._requestInstances[id] ) {
					this.addInstanceReference(instance);
					this._requestInstances[id] = instance;
				}
				
			}
		},
		/**
		 * @function can.connect/constructor-store.makeInstance makeInstance
		 * @parent can.connect/constructor-store.instantiators
		 * @param {Object} props
		 */
		// Overwrites makeInstance so it looks in the store and calls madeInstance.
		makeInstance: function(props){
			var id = this.id(props);
			if((id || id === 0) && this.instanceStore.has(id) ) {
				var storeInstance = this.instanceStore.get(id);
				// TODO: find a way to prevent this from being called so many times.
				this.updatedInstance(storeInstance, props);
				return storeInstance;
			}
			var instance = baseConnect.makeInstance.call(this, props);
			this.madeInstance(instance);
			return instance;
		},
		/**
		 * @function can.connect/constructor-store.madeList madeList
		 * @parent can.connect/constructor-store.instantiators
		 * @param {Object} props
		 */
		madeList: function(list, set){
			if( this._pendingRequests > 0) {
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
		 * @function can.connect/constructor-store.makeList makeList
		 * @parent can.connect/constructor-store.instantiators
		 * @param {Object} props
		 */
		makeList: function(listData, set){
			set = set || this.listSet(listData);
			var id = sortedSetJSON( set );
			
			if( id && this.listStore.has(id) ) {
				var storeList = this.listStore.get(id);
				this.updatedList(storeList, listData, set);
				return storeList;
			}
			var list = baseConnect.makeList.call(this, listData, set);
			this.madeList(list, set);
			return list;
		},
		/**
		 * @fuction can.connect/constructor-store.getList getList
		 * @parent can.connect/constructor-store.crud
		 * 
		 * Overwrites [connection.getList] so any 
		 * [can.connect/constructor-store.makeInstance hydrated instances] or [can.connect/constructor-store.makeList hydrated instances] 
		 * are kept in the store until the response resolves.
		 */
		getList: function(params) {
			var self = this;
			self._pendingRequests++;
			var promise = baseConnect.getList.call(this, params);
			
			promise.then(function(instances){
				self._finishedRequest();
			}, function(){
				self._finishedRequest();
			});
			return promise;
		},
		/**
		 * @function can.connect/constructor-store.get get
		 * @parent can.connect/constructor-store.crud
		 * 
		 * Overwrites [connection.get] so any 
		 * [can.connect/constructor-store.makeInstance hydrated instances] are kept in the 
		 * store until the response resolves.
		 */
		get: function(params) {
			var self = this;
			self._pendingRequests++;
			var promise = baseConnect.get.call(this, params);
			
			promise.then(function(instance){
				self._finishedRequest();
			}, function(){
				self._finishedRequest();
			});
			return promise;
			
		},
		/**
		 * @function can.connect/constructor-store.save save
		 * @parent can.connect/constructor-store.crud
		 * 
		 * Overwrites [connection.save] so any 
		 * [can.connect/constructor-store.makeInstance hydrated instances] are kept in the 
		 * store until the response resolves.
		 * 
		 */
		save: function(instance) {
			var self = this;
			self._pendingRequests++;
			
			var updating = !this.isNew(instance);
			if(updating) {
				this.addInstanceReference(instance);
			}
			
			var promise = baseConnect.save.call(this, instance);
			
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
		 * @function can.connect/constructor-store.destroy destroy
		 * @parent can.connect/constructor-store.crud
		 * 
		 * Overwrites [connection.destroy] so any 
		 * [can.connect/constructor-store.makeInstance hydrated instances] are kept in the 
		 * store until the response resolves.
		 */
		destroy: function(instance) {
			var self = this;
			self._pendingRequests++;
			var promise = baseConnect.destroy.call(this, instance);
			
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


