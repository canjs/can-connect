/**
 * @module can-connect/real-time/real-time real-time
 * @parent can-connect.behaviors
 * @group can-connect/real-time/real-time.methods 0 methods
 * @group can-connect/real-time/real-time.callbacks 1 data callbacks
 *
 * Update lists to include or exclude instances based
 * on set logic.
 *
 * @signature `realTime( baseConnection )`
 *
 *   Overwrites the "data callback" methods and provides
 *   [can-connect/real-time/real-time.createInstance],
 *   [can-connect/real-time/real-time.updateInstance], and
 *   [can-connect/real-time/real-time.destroyInstance] methods
 *   that
 *   update lists to include or exclude a created,
 *   updated, or destroyed instance.
 *
 *   An instance is put in a list if it is a
 *   [set.subset](https://github.com/canjs/can-set#setsubset)
 *   of the [can-connect/base/base.listSet].  The item is inserted using [can-set.Algebra.prototype.index].
 *
 * @body
 *
 * ## Use
 *
 * To use `real-time`, create a connection with its dependent
 * behaviors like:
 *
 * ```
 * var todoConnection = connect(
 *    ["real-time",
 *     "constructor",
 *     "constructor-store",
 *     "constructor-callbacks-once",
 *     "data-url"],{
 *   url: "/todos"
 * });
 * ```
 *
 * Next, use the connection to load lists and save those lists in the
 * store:
 *
 * ```
 * todoConnection.getList({complete: false}).then(function(todos){
 *   todoConnection.addListReference(todos);
 * })
 * ```
 *
 * Finally, use one of the  [can-connect/real-time/real-time.createInstance],
 * [can-connect/real-time/real-time.updateInstance], and
 * [can-connect/real-time/real-time.destroyInstance] methods to tell the connection
 * that data has changed.  The connection will update (by calling splice)
 * each list accordingly.
 *
 *
 * ## Example
 *
 * The following demo shows two lists that use this connection.  The
 * "Run Code" button sends the connection data changes which the
 * connection will then update lists accordingly:
 *
 *
 * @demo demos/can-connect/real-time.html
 *
 * This example creates a `todoList` function and `todoItem` function
 * that manage the behavior of a list of todos and a single todo respectfully.
 * It uses [Object.observe](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe)
 * to observe changes in the todo list and individual todo data. Other
 * frameworks will typically provide their own observable system.
 *
 * ### todoList
 *
 * When `todoList` is created, it is passed the `set` of data to load.  It uses
 * this to get todos from the `todoConnection` like:
 *
 *
 * ```
 * todosConnection.getList(set).then(function(retrievedTodos){
 * ```
 *
 * It then adds those `todos` to the [can-connect/constructor/store/store.listStore] so
 * they can be updated automatically.  And, it listens to changes in `todos` and calls an `update` function:
 *
 * ```
 * todosConnection.addListReference(todos);
 * Object.observe(todos, update, ["add", "update", "delete"] );
 * ```
 *
 * The update function is able to inserted new `todoItem`s in the page when items are added
 * to or removed from `todos`.  We exploit that by calling `update` as if it just added
 * each todo in the list:
 *
 * ```
 * update(todos.map(function(todo, i){
 *   return {
 *     type: "add",
 *     name: ""+i
 *   };
 * }));
 * ```
 *
 * ### todoItem
 *
 * The `todoItem` creates an element that updates with changes
 * in its `todo`.  It listens to changes in the `todo` and saves
 * the todo in the [can-connect/constructor/store/store.instanceStore] with the
 * following:
 *
 * ```
 * Object.observe(todo, update, ["add", "update", "delete"] );
 * todosConnection.addInstanceReference(todo);
 * ```
 *
 * A `todoItem` needs to be able to stop listening on the `todo` and remove itself from the
 * `instanceStore` if the `todo` is removed from the page.  To provide this teardown
 * functionality, `todoItem` listens to a `"removed"` event on its element and
 * `unobserves` the todo and removes it from the `instanceStore`:
 *
 * ```
 * $(li).bind("removed", function(){
 *   Object.unobserve(todo, update, ["add", "update", "delete"] );
 *   todosConnection.deleteInstanceReference(todo);
 * });
 * ```
 */
var connect = require("../can-connect");
var canSet = require("can-set");
var setAdd = require("can-connect/helpers/set-add");
var indexOf = require("can-connect/helpers/get-index-by-id");
var canDev = require('can-util/js/dev/dev');

module.exports = connect.behavior("real-time",function(baseConnection){

	var createPromise = Promise.resolve();

	return {
		createData: function(){
			var promise = baseConnection.createData.apply(this, arguments);
			var cleanPromise = promise.catch(function () { return ''; })
			createPromise = Promise.all([createPromise, cleanPromise]);
			return promise;
		},
		/**
		 * @function can-connect/real-time/real-time.createInstance createInstance
		 * @parent can-connect/real-time/real-time.methods
		 *
		 * Programatically indicate a new instance has been created.
		 *
		 * @signature `connection.createInstance(props)`
		 *
		 *   If there is no instance in the [can-connect/constructor/store/store.instanceStore]
		 *   for `props`'s [can-connect/base/base.id], an instance is [can-connect/constructor/constructor.hydrateInstance hydrated],
		 *   added to the store, and then [can-connect/real-time/real-time.createdData] is called with
		 *   `props` and the hydrated instance's serialized data. [can-connect/real-time/real-time.createdData]
		 *   will add this instance to any lists the instance belongs to.
		 *
		 *   If this instance has already been created, calls
		 *   [can-connect/real-time/real-time.updateInstance] with `props`.
		 *
		 *   @param {Object} props
		 *
		 *   @return {Promise<Instance>}
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * With a `real-time` connection, call `createInstance` when an instance is created that
		 * the connection itself did not make.  For instance, the following might listen to
		 * [socket.io](http://socket.io/) for when a `todo` is created and update the connection
		 * accordingly:
		 *
		 * ```
		 * socket.on('todo created', function(todo){
		 *   todoConnection.createInstance(order);
		 * });
		 * ```
		 *
		 */
		createInstance: function(props){
			var self = this;
			return new Promise(function(resolve, reject){
				// Wait until all create promises are done
				// so that we can find data in the instance store
				createPromise.then(function(){
					// Allow time for the store to get hydrated
					setTimeout(function(){
						var id = self.id(props);
						var instance = self.instanceStore.get(id);
						var serialized;

						if( instance ) {
							// already created, lets update
							resolve(self.updateInstance(props));
						} else {
							instance = self.hydrateInstance(props);
							serialized = self.serializeInstance(instance);

							self.addInstanceReference(instance);

							Promise.resolve( self.createdData(props, serialized) ).then(function(){
								self.deleteInstanceReference(instance);
								resolve(instance);
							});
						}
					}, 1);
				});
			});
		},

		/**
		 * @function can-connect/real-time/real-time.createdData createdData
		 * @parent can-connect/real-time/real-time.callbacks
		 *
		 * Called whenever instance data is created.
		 *
		 * @signature `connection.createdData(props, params, [cid])`
		 *
		 *   Updates lists with the created instance.
		 *
		 *   Gets the instance created for this request. Then, updates the instance with
		 *   the response data `props`.
		 *
		 *   Next, it goes through every list in the [can-connect/constructor/store/store.listStore],
		 *   test if the instance's data belongs in that list.  If it does,
		 *   adds the instance's data to the serialized list data and
		 *   [can-connect/constructor/constructor.updatedList updates the list].
		 */
		createdData: function(props, params, cid){
			var instance;
			if(cid !== undefined) {
				instance = this.cidStore.get(cid);
			} else {
				instance = this.instanceStore.get( this.id(props) );
			}
			// pre-register so everything else finds this even if it doesn't have an id
			this.addInstanceReference(instance, this.id(props));
			this.createdInstance(instance, props);
			create.call(this, this.serializeInstance(instance));
			this.deleteInstanceReference(instance);
			return undefined;
		},

		/**
		 * @function can-connect/real-time/real-time.updatedData updatedData
		 * @parent can-connect/real-time/real-time.callbacks
		 *
		 * Called whenever instance data is updated.
		 *
		 * @signature `connection.updatedData(props, params)`
		 *
		 *   Gets the instance that is updated, updates
		 *   it with `props` and the adds or removes it to
		 *   lists it belongs in.
		 *
		 *   @return {undefined} Returns `undefined` to prevent `.save` from calling `updatedInstance`.
		 */
		// Go through each list in the listStore and see if there are lists that should have this,
		// or a list that shouldn't.
		updatedData: function(props, params){

			var instance = this.instanceStore.get( this.id(params) );
			this.updatedInstance(instance, props);
			update.call(this, this.serializeInstance(instance));

			// Returning undefined prevents other behaviors from running.
			return undefined;
		},
		/**
		 * @function can-connect/real-time/real-time.updateInstance updateInstance
		 * @parent can-connect/real-time/real-time.methods
		 *
		 * Programatically indicate a new instance has been updated.
		 *
		 * @signature `connection.updateInstance(props)`
		 *
		 *   Calls [can-connect/real-time/real-time.updatedData] in the right way so
		 *   that the instance is updated and added to or removed from
		 *   any lists it belongs in.
		 *
		 *   @param {Object} props The properties of the instance that
		 *
		 *   @return {Promise<Instance>} the updated instance.
		 */
		updateInstance: function(props){
			var id = this.id(props);
			var instance = this.instanceStore.get(id);
			if( !instance ) {
				instance = this.hydrateInstance(props);
			}
			this.addInstanceReference(instance);

			var serialized = this.serializeInstance(instance),
				self = this;

			return Promise.resolve( this.updatedData(props, serialized) ).then(function(){

				self.deleteInstanceReference(instance);
				return instance;
			});
		},
		/**
		 * @function can-connect/real-time/real-time.destroyedData destroyedData
		 * @parent can-connect/real-time/real-time.callbacks
		 *
		 * @signature `connection.destroyedData(props, params)`
		 *
		 * Gets the instance for this request.  Then tests if the instance
		 * is in any list in the [can-connect/constructor/store/store.listStore].  If
		 * it is, removes the instance from the list.
		 *
		 * @param {Object} props The properties of the destroyed instance.
		 * @param {Object} [params] The parameters used to destroy the data.
		 */
		destroyedData: function(props, params){
			var id = this.id(params || props);
			var instance = this.instanceStore.get(id);
			if( !instance ) {
				instance = this.hydrateInstance(props);
			}
			var serialized = this.serializeInstance(instance);
			this.destroyedInstance(instance, props);
			// we can pre-register it so everything else finds it
			destroy.call(this, serialized);
			return undefined;
		},
		/**
		 * @function can-connect/real-time/real-time.destroyInstance destroyInstance
		 * @parent can-connect/real-time/real-time.methods
		 *
		 * Programatically indicate a new instance has been destroyed.
		 *
		 * @signature `connection.destroyInstance(props)`
		 *
		 *   Gets or creates an instance from `props` and uses
		 *   it to call [can-connect/real-time/real-time.destroyedData]
		 *   correctly.
		 *
		 * @param {Object} props The properties of the destroyed instance.
		 * @return {Promise<Instance>}  A promise with the destroyed instance.
		 */
		destroyInstance: function(props){
			var id = this.id(props);
			var instance = this.instanceStore.get(id);
			if( !instance ) {
				instance = this.hydrateInstance(props);
			}
			this.addInstanceReference(instance);

			var serialized = this.serializeInstance(instance),
				self = this;

			return Promise.resolve( this.destroyedData(props, serialized) ).then(function(){

				self.deleteInstanceReference(instance);
				return instance;
			});
		}

		//!steal-remove-start
		,gotListData: function(items, set) {
			var self = this;
			if (this.algebra) {
				for(var item, i = 0, l = items.data.length; i < l; i++) {
					item = items.data[i];
					if( !self.algebra.has(set, item) ) {
						var msg = "One or more items were retrieved which do not match the 'Set' parameters used to load them. "
							+ "Read the docs for more information: https://canjs.com/doc/can-set.html#SolvingCommonIssues"
							+ "\n\nBelow are the 'Set' parameters:"
							+ "\n" + canDev.stringify(set)
							+ "\n\nAnd below is an item which does not match those parameters:"
							+ "\n" + canDev.stringify(item);
						canDev.warn(msg);
						break;
					}
				}
			}

			return Promise.resolve(items);
		}
		//!steal-remove-end
	};
});

var create = function(props){
	var self = this;
	// go through each list
	this.listStore.forEach(function(list, id){
		var set = JSON.parse(id);
		// ideally there should be speed up ... but this is fine for now.


		var index = indexOf(self, props, list);

		if(canSet.has(set, props, self.algebra)) {

			// if it's not in the list, update the list with this and the lists data merged
			if(index === -1) {
				// get back the list items
				var items = self.serializeList(list);
				self.updatedList(list,  { data: setAdd(self, set,  items, props, self.algebra) }, set);
			} else {
				// if the index
			}

		}

	});
};

// ## update
// Goes through each list and sees if the list should be updated
// with the new.
var update = function(props) {
	var self = this;

	this.listStore.forEach(function(list, id){
		var items;
		var set = JSON.parse(id);
		// ideally there should be speed up ... but this is fine for now.


		var index = indexOf(self, props, list);

		if(canSet.has(set, props, self.algebra)) {

			// if it's not in the list, update the list with this and the lists data merged
			// in the future, this should update the position.
			items = self.serializeList(list);
			if(index === -1) {
				// get back the list items
				self.updatedList(list,  { data: setAdd(self, set,  items, props, self.algebra) }, set);
			} else {
				var sortedIndex = canSet.index(set, items, props, self.algebra);
				if(sortedIndex !== undefined && sortedIndex !== index) {
					var copy = items.slice(0);
					if(index < sortedIndex) {
						copy.splice(sortedIndex, 0, props);
						copy.splice(index,1);
					} else {
						copy.splice(index,1);
						copy.splice(sortedIndex, 0, props);
					}
					self.updatedList(list,  { data: copy }, set);
				}
			}

		}  else if(index !== -1){
			// otherwise remove it
			items = self.serializeList(list);
			items.splice(index,1);
			self.updatedList(list,  { data: items }, set);
		}

	});
};


var destroy = function(props) {
	var self = this;
	this.listStore.forEach(function(list, id){
		var set = JSON.parse(id);
		// ideally there should be speed up ... but this is fine for now.

		var index = indexOf(self, props, list);

		if(index !== -1){
			// otherwise remove it
			var items = self.serializeList(list);
			items.splice(index,1);
			self.updatedList(list,  { data: items }, set);
		}

	});
};
