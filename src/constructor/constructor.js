var helpers = require("can-connect/helpers/");
var bind = helpers.bind;
var isArray = helpers.isArray;

/**
 * @module {connect.Behavior} can-connect/constructor constructor
 * @parent can-connect.behaviors
 * @group can.connect/constructor.crud 0 CRUD Methods
 * @group can.connect/constructor.callbacks 1 CRUD Callbacks
 * @group can.connect/constructor.hydrators 2 Hydrators
 * @group can.connect/constructor.serializers 3 Serializers
 * @group can.connect/constructor.helpers 4 Helpers
 *
 * Connect "data interface" methods to rich representations of data.
 *
 * @signature `constructor(baseConnection)`
 *
 * @body
 *
 * ## Use
 *
 * The `constructor` behavior allows you to hydrate the raw, serialized representation of
 * your application's data into a typed representation with additional methods and behaviors.
 *
 * For example, you might want to be able to load data as a particular JavaScript Constructor
 * function that has a helper methods that act upon the serialized data.
 *
 * An example might be loading data from a `"/todos"` service and being able to call `.timeLeft()`
 * on the todos that you get back like:
 *
 * ```
 * todoConnection.get({id: 6}).then(function(todo){
 *   todo.timeLeft() //-> 60000
 * })
 * ```
 *
 * The following creates a `todoConnection` that does exactly that:
 *
 * ```
 * var Todo = function(data){
 *   for(var prop in data) {
 *    this[prop] = data;
 *   }
 * };
 * Todo.prototype.timeLeft = function(){
 *   return new Date() - this.dueDate
 * };
 *
 * var todoConnection = connect("constructor","data-url",{
 *   url: "/todos"
 *   instance: function(data){
 *     return new Todo(data);
 *   }
 * });
 * ```
 *
 * The `constructor` extension is still useful even if you want to keep your data as plain
 * JavaScript objects (which its default behavior).  The `constructor` extension describes
 * the in-memory representation of your data on the client.  Other extensions need to know this
 * representation for advanced behavior like [can-connect/real-time] or [can-connect/fall-through-cache].
 *
 * ## CRUD Methods
 *
 * The `constructor` extension supplies methods that create, read, update and
 * delete (CRUD) typed representations of raw connection data.
 *
 * ## CRUD Callbacks
 *
 * The `constructor` function "CRUD Methods" call "CRUD Callbacks" with the
 * the "data interface" response data. These callbacks update the state of
 * the typed representation.
 *
 * ## Instantaitors
 *
 * These methods are used to create a typed instance or typed list given raw "data interface"
 * objects.
 *
 * ## Serializers
 *
 * These methods convert the typed instance or typed list into a representation for the
 * "data interface".
 *
 *
 */
var connect = require("can-connect");
var WeakReferenceMap = require("can-connect/helpers/weak-reference-map");
var overwrite = require("can-connect/helpers/overwrite");
var idMerge = require("can-connect/helpers/id-merge");
var helpers = require("can-connect/helpers/");
var addToCanWaitData = require("can-connect/helpers/wait");

module.exports = connect.behavior("constructor",function(baseConnect){

	var behavior = {
		// stores references to instances
		// for now, only during create
		/**
		 * @property {WeakReferenceMap} can.connect/constructor.cidStore cidStore
		 * @parent can.connect/constructor.helpers
		 *
		 * A WeakReferenceMap that contains instances being created by their `._cid` property.
		 */
		cidStore: new WeakReferenceMap(),
		_cid: 0,

		/**
		 * @function can.connect/constructor.get get
		 * @parent can.connect/constructor.crud
		 *
		 * Get a single instance from the "data interface".
		 *
		 * @signature `connection.get(set)`
		 *
		 *   Gets an instance from [connection.getData] and runs the resulting data
		 *   through [can-connect/constructor.hydrateInstance].
		 *
		 *   @param {Object} params Data specifying the instance to retrieve.  Normally, this
		 *   looks like: `{id: 5}`.
		 *
		 *   @return {Promise<Instance>} An instance that represents the data that was loaded.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * Call `.get()` with the parameters that identify the instance
		 * you want to load.  `.get()` will return a promise that resolves
		 * to your instance.
		 *
		 * ```
		 * todoConnection.get({id: 6}).then(function(todo){ })
		 * ```
		 *
		 */
		get: function(params) {
			var self = this;
			return addToCanWaitData(this.getData(params).then(function(data){
				return self.hydrateInstance(data);
			}), this.name, params);
		},

		/**
		 * @function can.connect/constructor.getList getList
		 * @parent can.connect/constructor.crud
		 *
		 * Get a single instance from the "data interface".
		 *
		 * @signature `connection.getList(set)`
		 *
		 *   Gets an instance from [connection.getListData] and runs the resulting data
		 *   through [can-connect/constructor.hydrateList].
		 *
		 *   @param {Set} set Data specifying the instance to retrieve.  Normally, this
		 *   looks like: `{id: 5}`.
		 *
		 *   @return {Promise<List<Instance>>} An instance that represents the data that was loaded.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * Call `.getList()` with the parameters that identify the instance
		 * you want to load.  `.getList()` will return a promise that resolves
		 * to your instance.
		 *
		 * ```
		 * todoConnection.getList({due: 'today'}).then(function(todos){ })
		 * ```
		 *
		 */
		getList: function(set) {
			var self = this;
			return addToCanWaitData(this.getListData( set ).then(function(data){
				return self.hydrateList(data, set);
			}), this.name, set);
		},


		/**
		 * @function can-connect/constructor.hydrateList hydrateList
		 * @parent can.connect/constructor.hydrators
		 *
		 * Makes a list type object given raw data.
		 *
		 * @signature `connection.hydrateList(listData, set)`
		 *
		 *   Calls [can-connect/constructor.hydrateInstance] with each raw instance data item and then
		 *   calls [can-connect/constructor.list] with an array of the instances.  If [can-connect/constructor.list]
		 *   is not provided, a normal array is used.
		 *
		 *   @param {can-connect.listData} listData
		 *   @param {Object} set
		 *
		 *   @return {List} The data type used to represent the list.
		 */
		hydrateList: function(listData, set){
			if(isArray(listData)) {
				listData = {data: listData};
			}

			var arr = [];
			for(var i = 0; i < listData.data.length; i++) {
				arr.push( this.hydrateInstance(listData.data[i]) );
			}
			listData.data = arr;
			if(this.list) {
				return this.list(listData, set);
			} else {
				var list = listData.data.slice(0);
				list[this.listSetProp || "__listSet"] = set;
				return list;
			}
		},

		/**
		 * @function can-connect/constructor.hydrateInstance hydrateInstance
		 * @parent can.connect/constructor.hydrators
		 *
		 * Makes a type object given raw data.
		 *
		 * @signature `connection.hydrateInstance(listData)`
		 *
		 *   If [can-connect/constructor.instance] is available passes `props` to that
		 *   and returns that value.  Otherwise, returns a clone of `props`.
		 *
		 *   @param {Object} props The properties returned by [connection.getData].
		 *
		 *   @return {Instance} The data type used to represent the list.
		 */
		hydrateInstance: function(props){
			if(this.instance) {
				return this.instance(props);
			}  else {
				return helpers.extend({}, props);
			}
		},
		/**
		 * @function can-connect/constructor.save save
		 * @parent can.connect/constructor.crud
		 *
		 * @description Creates or updates an instance using the underlying data interface.
		 *
		 * @signature `connection.save( instance )`
		 *
		 *   Checks if the instance has an [connect.base.id] or not.  If it
		 *   has an id, the instance will be updated; otherwise, it will be created.
		 *
		 *   To create an instance, the instance is added to the [can-connect/constructor.cidStore],
		 *   and its [can-connect/constructor.serializeInstance serialized data] is passed to
		 *   [connection.createData].  If `createData`'s promise resolves to anything other than `undefined`,
		 *   [can-connect/constructor.createdInstance] is called.
		 *
		 *   To update an instance, its [can-connect/constructor.serializeInstance serialized data] is passed to
		 *   [connection.updateData]. If `updateData`'s promise resolves to anything other than `undefined`,
		 *   [can-connect/constructor.updatedInstance] is called.
		 *
		 *   @param {Instance} instance The instance to create or save.
		 *
		 *   @return {Instance} resolves to the same instance that was passed to `save`.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * To use `save`, create a connection, then an instance, and call `.save()` with it.
		 *
		 * ```
		 * // Create a connection:
		 * var todoConnection = connect(['constructor','data-url'],{
		 *   url: "/todos"
		 * })
		 *
		 * // Create an instance:
		 * var todo = {name: "do dishes"};
		 *
		 * // Call .save():
		 * todoConnection.save(todo)
		 * ```
		 *
		 * This will POST to `/todos` with the `todo` data.  The server response data
		 * might look something like:
		 *
		 * ```
		 * {
		 *  id: 5,
		 *  ownerId: 9
		 * }
		 * ```
		 *
		 * This data will be passed to [can-connect/constructor.createdInstance] which will default
		 * to adding those properties to `todo`, resulting in `todo` looking like:
		 *
		 * ```
		 * {
		 *  name: "do dishes",
		 *  id: 5,
		 *  ownerId: 9
		 * }
		 * ```
		 *
		 * To update the todo, change a property and call `.save()` again:
		 *
		 * ```
		 * // Change a property:
		 * todo.name = "Do dishes!!";
		 *
		 * // Call .save()
		 * todoConnection.save(todo)
		 * ```
		 *
		 * This will PUT to `/todos` with the `todo` data.  The server response data
		 * should look something like:
		 *
		 * ```
		 * {
		 *  name: "Do dishes!!",
		 *  id: 5,
		 *  ownerId: 9
		 * }
		 * ```
		 *
		 * This data will be passed to [can-connect/constructor.updatedInstance] which will default
		 * to setting all of `todos` properties to look like the response data.
		 */
		save: function(instance){
			var serialized = this.serializeInstance(instance);
			var id = this.id(instance);
			var self = this;
			if(id === undefined) {
				// If `id` is undefined, we are creating this instance.
				// It should be given a local id and temporarily added to the cidStore
				// so other hooks can get back the instance that's being created.
				var cid = this._cid++;
				this.cidStore.addReference(cid, instance);

				// Call the data layer.
				// If the data returned is undefined, don't call `createdInstance`
				return this.createData(serialized, cid).then(function(data){
					// if undefined is returned, this can't be created, or someone has taken care of it
					if(data !== undefined) {
						self.createdInstance(instance, data);
					}
					self.cidStore.deleteReference(cid, instance);
					return instance;
				});
			} else {
				return this.updateData(serialized).then(function(data){
					if(data !== undefined) {
						self.updatedInstance(instance, data);
					}
					return instance;
				});
			}
		},
		/**
		 * @function can-connect/constructor.destroy destroy
		 * @parent can.connect/constructor.crud
		 * @description Destroys an instance using the underlying data interface.
		 *
		 * @signature `connection.destroy( instance )`
		 *
		 *   To destroy an instance, its [can-connect/constructor.serializeInstance serialized data] is passed to
		 *   [connection.destroyData]. If `destroyData`'s promise resolves to anything other than `undefined`,
		 *   [can-connect/constructor.destroyedInstance] is called.
		 *
		 *   @param {Instance} instance The instance to create or save.
		 *
		 *   @return {Instance} resolves to the same instance that was passed to `save`.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * To use `save`, create a connection, then an instance, and call `.save()` with it.
		 *
		 * ```
		 * // Create a connection:
		 * var todoConnection = connect(['constructor','data-url'],{
		 *   url: "/todos"
		 * })
		 *
		 * // Create an instance:
		 * var todo = {name: "do dishes"};
		 *
		 * // Call .save():
		 * todoConnection.save(todo)
		 * ```
		 *
		 * This will POST to `/todos` with the `todo` data.  The server response data
		 * might look something like:
		 *
		 * ```
		 * {
		 * 	id: 5,
		 *  ownerId: 9
		 * }
		 * ```
		 *
		 * This data will be passed to [can-connect/constructor.createdInstance] which will default
		 * to adding those properties to `todo`, resulting in `todo` looking like:
		 *
		 * ```
		 * {
		 *  name: "do dishes",
		 *  id: 5,
		 *  ownerId: 9
		 * }
		 * ```
		 *
		 * To update the todo, change a property and call `.save()` again:
		 *
		 * ```
		 * // Change a property:
		 * todo.name = "Do dishes!!";
		 *
		 * // Call .save()
		 * todoConnection.save(todo)
		 * ```
		 *
		 * This will PUT to `/todos` with the `todo` data.  The server response data
		 * should look something like:
		 *
		 * ```
		 * {
		 *  name: "Do dishes!!",
		 *  id: 5,
		 *  ownerId: 9
		 * }
		 * ```
		 *
		 * This data will be passed to [can-connect/constructor.updatedInstance] which will default
		 * to setting all of `todos` properties to look like the response data.
		 */
		// ## destroy
		// Calls the data interface `destroyData` and as long as it
		// returns something, uses that data to call `destroyedInstance`.
		destroy: function(instance){
			var serialized = this.serializeInstance(instance),
				self = this;

			return this.destroyData(serialized).then(function(data){
				if(data !== undefined) {
					self.destroyedInstance(instance, data);
				}
				return instance;
			});
		},
		/**
		 * @function can-connect/constructor.createdInstance createdInstance
		 * @parent can.connect/constructor.callbacks
		 *
		 * Updates the instance being created with the result of [connection.createData].
		 *
		 * @signature `connection.createdInstance( instance, props )`
		 *
		 *   Adds every property and value in `props` to `instance`.
		 *
		 *   @param {Instance} instance The instance to update.
		 *
		 *   @param {Object} props The data from [connection.createData].
		 */
		createdInstance: function(instance, props){
			helpers.extend(instance, props);
		},
		/**
		 * @function can-connect/constructor.updatedInstance updatedInstance
		 * @parent can.connect/constructor.callbacks
		 *
		 * Updates the instance being updated with the result of [connection.updateData].
		 *
		 * @signature `connection.updatedInstance( instance, props )`
		 *
		 *   Sets the properties in `instance` to match the properties and values in `props`
		 *   with the exception of [connect.base.idProp], which it leaves alone.
		 *
		 *   @param {Instance} instance The instance to update.
		 *
		 *   @param {Object} props The data from [connection.updateData].
		 */
		updatedInstance: function(instance, data){
			overwrite(instance, data, this.idProp);
		},
		/**
		 * @function can-connect/constructor.updatedList updatedList
		 * @parent can.connect/constructor.callbacks
		 *
		 * Updates a list with new data.
		 *
		 * @signature `connection.updatedInstance( instance, props )`
		 *
		 *   [can-connect/constructor.hydrateInstance Hydrates] instances with `listData`'s data
		 *   and attempts to merge them into `list`.  The merge is able to identify simple insertions
		 *   and removals of elements instead of replacing the entire list.
		 *
		 *   @param {Instance} list The instance to update.
		 *
		 *   @param {can-connect.listData} listData The raw data usd to update `list`.
		 *
		 *   @param {Set} set The set of data `listData` represents.
		 */
		updatedList: function(list, listData, set) {
			var instanceList = [];
			for(var i = 0; i < listData.data.length; i++) {
				instanceList.push( this.hydrateInstance(listData.data[i]) );
			}
			// This only works with "referenced" instances because it will not
			// update and assume the instance is already updated
			// this could be overwritten so that if the ids match, then a merge of properties takes place
			idMerge(list, instanceList, bind(this.id, this), bind(this.hydrateInstance, this));
		},
		/**
		 * @function can-connect/constructor.destroyedInstance destroyedInstance
		 * @parent can.connect/constructor.callbacks
		 *
		 * Updates the instance being destroyed with the result of [connection.destroyData].
		 *
		 * @signature `connection.destroyedInstance( instance, props )`
		 *
		 *   Sets the properties in `instance` to match the properties and values in `props`
		 *   with the exception of [connect.base.idProp], which it leaves alone.
		 *
		 *   @param {Instance} instance The instance to update.
		 *
		 *   @param {Object} props The data from [connection.destroyData].
		 */
		destroyedInstance: function(instance, data){
			overwrite(instance, data, this.idProp);
		},
		/**
		 * @function can-connect/constructor.serializeInstance serializeInstance
		 * @parent can.connect/constructor.serializers
		 *
		 * @description Returns the serialized form of an instance.
		 *
		 * @signature `connection.serializeInstance( instance )`
		 *
		 *   This implementation simply clones the `instance` object.
		 *
		 *   @param {Instance} instance The instance to serialize.
		 *
		 *   @return {Object} A serialized representation of the instance.
		 */
		serializeInstance: function(instance){
			return helpers.extend({}, instance);
		},
		/**
		 * @function can-connect/constructor.serializeList serializeList
		 * @parent can.connect/constructor.serializers
		 *
		 * @description Returns the serialized form of an list.
		 *
		 * @signature `connection.serializeList( list )`
		 *
		 *   This implementation simply returns an `Array` containing the result of
		 *   [can-connect/constructor.serializeInstance] called on each item in the list.
		 *
		 *   @param {List} list The instance to serialize.
		 *
		 *   @return {Object|Array} A serialized representation of the list.
		 *
		 */
		serializeList: function(list){
			var self = this;
			return helpers.map.call(list, function(instance){
				return self.serializeInstance(instance);
			});
		},
		/**
		 * @function can-connect/constructor.isNew isNew
		 * @parent can.connect/constructor.helpers
		 *
		 * Returns if this instance has not been persisted.
		 *
		 * @param {Object} instance The instance to test.
		 *
		 * @return {Boolean} `true` if the instance has not been persisted.
		 */
		isNew: function(instance){
			var id = this.id(instance);
			return !(id || id === 0);
		}

		/**
		 * @property can-connect/constructor.list list
		 * @parent can.connect/constructor.hydrators
		 *
		 * Returns the appropraite form of list.
		 *
		 * @signature `connection.list( listInstanceData, set )`
		 *
		 *   Takes an object with a data property that is an array of instances returned by
		 *   [can-connect/constructor.hydrateInstance] and should return the right type of list.
		 *
		 *   @param {{data: Array<Instance>}} listInstanceData
		 *
		 *     @option {Array<Instance>} data
		 *
		 *   @param {{}} set
		 *
		 *   @return {List}
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * If you have a special type of list with helper functions you'd like to have available,
		 * you can do that in `list`.  The following makes it so `getList` resolves to array-like
		 * objects that have a `completed` function.
		 *
		 * ```
		 * var MyList = Object.create(Array.prototype);
		 * MyList.prototype.completed = function(){
		 *   return this.filter(function(){ return this.completed });
		 * };
		 *
		 * var todosConnection = connect(["constructor","data-url"], {
		 *   url: "todos",
		 *   list: function(listData, set){
		 *     var collection = Object.create(MyList);
		 *     Array.apply(collection, listData.data);
		 *     collection.__listSet = set;
		 *     return collection;
		 *   }
		 * });
		 * ```
		 *
		 * This allows:
		 *
		 * ```
		 * todosConnection.getList({}).then(function(todos){
		 *   console.log("There are",todos.completed().length, "completed todos")
		 * });
		 * ```
		 *
		 *
		 * Notice that we added the `__listSet` data on the list. This is useful
		 * for other extensions.
		 *
		 */

		/**
		 * @property can-connect/constructor.instance instance
		 * @parent can.connect/constructor.hydrators
		 *
		 * Returns the typed form of the serialized data.
		 *
		 * @signature `connection.instance( props )`
		 *
		 *   Takes an object with a data property that is an array of instances returned by
		 *   [can-connect/constructor.hydrateInstance] and should return the right type of list.
		 *
		 *   @param {Object} props
		 *
		 *   @return {Instance}
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * If you have a special type of list with helper functions you'd like to have available,
		 * you can do that in `list`.  The following makes it so `getList` resolves to array-like
		 * objects that have a `completed` function.
		 *
		 * ```
		 * var MyList = Object.create(Array.prototype);
		 * MyList.prototype.completed = function(){
		 *   return this.filter(function(){ return this.completed });
		 * };
		 *
		 * var todosConnection = connect(["constructor","data-url"], {
		 *   url: "todos",
		 *   list: function(listData, set){
		 *     var collection = Object.create(MyList);
		 *     Array.apply(collection, listData.data);
		 *     collection.__listSet = set;
		 *     return collection;
		 *   }
		 * });
		 * ```
		 *
		 * This allows:
		 *
		 * ```
		 * todosConnection.getList({}).then(function(todos){
		 *   console.log("There are",todos.completed().length, "completed todos")
		 * });
		 * ```
		 *
		 *
		 * Notice that we added the `__listSet` data on the list. This is useful
		 * for other extensions.
		 *
		 */
	};

	return behavior;

});

