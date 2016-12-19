

/**
 * @module {connect.Behavior} can-connect/constructor/constructor
 * @parent can-connect.behaviors
 * @group can-connect/constructor/constructor.crud 0 crud methods
 * @group can-connect/constructor/constructor.callbacks 1 crud callbacks
 * @group can-connect/constructor/constructor.hydrators 2 hydrators
 * @group can-connect/constructor/constructor.serializers 3 serializers
 * @group can-connect/constructor/constructor.helpers 4 helpers
 *
 * Adds the ability to operate on special types instead of plain JavaScript Objects
 * and Arrays.
 *
 * @signature `constructor( baseConnection )`
 *
 * Adds methods that allow the connection to operate on special types.
 *
 *
 * @param {connection} baseConnection A connection with most of the
 * [can-connect/DataInterface] implemented.
 *
 * @return {connection} A new connection with the additional methods.
 *
 * @body
 *
 * ## Use
 *
 * The `can-connect/constructor/constructor` behavior allows you to hydrate the raw, serialized representation of
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
 * var todoConnection = connect([
 *   require("can-connect/constructor/constructor"),
 *   require("can-connect/data/url/url")
 * ],{
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
 * representation for advanced behavior like [can-connect/real-time/real-time] or [can-connect/fall-through-cache/fall-through-cache].
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
 * ## Instantiators
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
var isArray = require("can-util/js/is-array/is-array");
var makeArray = require("can-util/js/make-array/make-array");
var assign = require("can-util/js/assign/assign");
var connect = require("can-connect");
var WeakReferenceMap = require("can-connect/helpers/weak-reference-map");
var overwrite = require("can-connect/helpers/overwrite");
var idMerge = require("can-connect/helpers/id-merge");

module.exports = connect.behavior("constructor",function(baseConnection){

	var behavior = {
		// stores references to instances
		// for now, only during create
		/**
		 * @property {can-connect/helpers/weak-reference-map} can-connect/constructor/constructor.cidStore cidStore
		 * @parent can-connect/constructor/constructor.helpers
		 *
		 * A WeakReferenceMap that contains instances being created by their `._cid` property.
		 *
		 * @type {can-connect/helpers/weak-reference-map}
		 *
		 *   The `cidStore` is used to temporarily hold references to instances by [can-util/js/cid/cid] that don't
		 *   yet have an id which are in the process of being created.
		 */
		cidStore: new WeakReferenceMap(),
		_cid: 0,

		/**
		 * @function can-connect/constructor/constructor.get get
		 * @parent can-connect/constructor/constructor.crud
		 *
		 * Get a single instance from the "data interface".
		 *
		 * @signature `connection.get(set)`
		 *
		 *   Gets an instance from [can-connect/connection.getData] and runs the resulting data
		 *   through [can-connect/constructor/constructor.hydrateInstance].
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
			return this.getData(params).then(function(data){
				return self.hydrateInstance(data);
			});
		},

		/**
		 * @function can-connect/constructor/constructor.getList getList
		 * @parent can-connect/constructor/constructor.crud
		 *
		 * Get a single instance from the "data interface".
		 *
		 * @signature `connection.getList(set)`
		 *
		 *   Gets an instance from [can-connect/connection.getListData] and runs the resulting data
		 *   through [can-connect/constructor.hydrateList].
		 *
		 *   @param {can-set/Set} set Data specifying the instance to retrieve.  Normally, this
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
			set = set ||  {};
			var self = this;
			return this.getListData( set ).then(function(data){
				return self.hydrateList(data, set);
			});
		},


		/**
		 * @function can-connect/constructor.hydrateList hydrateList
		 * @parent can-connect/constructor/constructor.hydrators
		 *
		 * Makes a list type object given raw data.
		 *
		 * @signature `connection.hydrateList(listData, set)`
		 *
		 *   Calls [can-connect/constructor/constructor.hydrateInstance] with each raw instance data item and then
		 *   calls [can-connect/constructor/constructor.list] with an array of the instances.  If [can-connect/constructor/constructor.list]
		 *   is not provided, a normal array is used.
		 *
		 *   @param {can-connect.listData} listData Raw list data.
		 *   @param {can-set/Set} set The set used to retrieve the list.
		 *
		 *   @return {can-connect.List} The data type used to represent the list.
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
				copyMetadata(listData, list);
				return list;
			}
		},

		/**
		 * @function can-connect/constructor/constructor.hydrateInstance hydrateInstance
		 * @parent can-connect/constructor/constructor.hydrators
		 *
		 * Makes a type object given raw data.
		 *
		 * @signature `connection.hydrateInstance(props)`
		 *
		 *   If [can-connect/constructor/constructor.instance] is available passes `props` to that
		 *   and returns that value.  Otherwise, returns a clone of `props`.
		 *
		 *   @param {Object} props The properties returned by [can-connect/connection.getData].
		 *
		 *   @return {can-connect/Instance} The data type used to represent the list.
		 */
		hydrateInstance: function(props){
			if(this.instance) {
				return this.instance(props);
			}  else {
				return assign({}, props);
			}
		},
		/**
		 * @function can-connect/constructor/constructor.save save
		 * @parent can-connect/constructor/constructor.crud
		 *
		 * @description Creates or updates an instance using the underlying data interface.
		 *
		 * @signature `connection.save( instance )`
		 *
		 *   Checks if the instance has an [can-connect/base/base.id] or not.  If it
		 *   has an id, the instance will be updated; otherwise, it will be created.
		 *
		 *   To create an instance, the instance is added to the [can-connect/constructor.cidStore],
		 *   and its [can-connect/constructor/constructor.serializeInstance serialized data] is passed to
		 *   [can-connect/connection.createData].  If `createData`'s promise resolves to anything other than `undefined`,
		 *   [can-connect/constructor/constructor.createdInstance] is called.
		 *
		 *   To update an instance, its [can-connect/constructor/constructor.serializeInstance serialized data] is passed to
		 *   [can-connect/connection.updateData]. If `updateData`'s promise resolves to anything other than `undefined`,
		 *   [can-connect/constructor/constructor.updatedInstance] is called.
		 *
		 *   @param {can-connect/Instance} instance The instance to create or save.
		 *
		 *   @return {can-connect/Instance} resolves to the same instance that was passed to `save`.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * To use `save`, create a connection, then an instance, and call `.save()` with it.
		 *
		 * ```
		 * // Create a connection:
		 * var todoConnection = connect([
		 *   require('can-connect/constructor/constructor'),
		 *   require('can-connect/data/url/url')
		 * ],{
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
		 * This data will be passed to [can-connect/constructor/constructor.createdInstance] which will default
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
		 * This data will be passed to [can-connect/constructor/constructor.updatedInstance] which will default
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
		 * @function can-connect/constructor/constructor.destroy destroy
		 * @parent can-connect/constructor/constructor.crud
		 * @description Destroys an instance using the underlying data interface.
		 *
		 * @signature `connection.destroy( instance )`
		 *
		 *   To destroy an instance, its [can-connect/constructor/constructor.serializeInstance serialized data] is passed to
		 *   [can-connect/connection.destroyData]. If `destroyData`'s promise resolves to anything other than `undefined`,
		 *   [can-connect/constructor/constructor.destroyedInstance] is called.
		 *
		 *   @param {can-connect/Instance} instance The instance to create or save.
		 *
		 *   @return {can-connect/Instance} resolves to the same instance that was passed to `save`.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * To use `destroy`, create a connection, then retrieve an instance, and call `.destroy()` with it.
		 *
		 * ```
		 * // Create a connection:
		 * var todoConnection = connect([
		 *   require('can-connect/constructor/constructor'),
		 *   require('can-connect/data/url/url')
		 * ],{
		 *   url: "/todos"
		 * })
		 *
		 * // Get a todo instance
		 * todoConnection.get({id: 5}).then(function(todo){
		 *   // Call .destroy():
		 *   todoConnection.destroy(todo)
		 * });
		 * ```
		 *
		 * This will DELETE to `/todos/5` with the `todo` data.  The server response data
		 * might look something like:
		 *
		 * ```
		 * {}
		 * ```
		 *
		 * This data will be passed to [can-connect/constructor/constructor.destroyedInstance].
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
		 * @function can-connect/constructor/constructor.createdInstance createdInstance
		 * @parent can-connect/constructor/constructor.callbacks
		 *
		 * Updates the instance being created with the result of [can-connect/connection.createData].
		 *
		 * @signature `connection.createdInstance( instance, props )`
		 *
		 *   Adds every property and value in `props` to `instance`.
		 *
		 *   @param {can-connect/Instance} instance The instance to update.
		 *
		 *   @param {Object} props The data from [can-connect/connection.createData].
		 */
		createdInstance: function(instance, props){
			assign(instance, props);
		},
		/**
		 * @function can-connect/constructor/constructor.updatedInstance updatedInstance
		 * @parent can-connect/constructor/constructor.callbacks
		 *
		 * Updates the instance being updated with the result of [can-connect/connection.updateData].
		 *
		 * @signature `connection.updatedInstance( instance, props )`
		 *
		 *   Sets the properties in `instance` to match the properties and values in `props`
		 *   with the exception of [can-connect/base/base.idProp], which it leaves alone.
		 *
		 *   @param {can-connect/Instance} instance The instance to update.
		 *
		 *   @param {Object} props The data from [can-connect/connection.updateData].
		 */
		updatedInstance: function(instance, data){
			overwrite(instance, data, this.idProp);
		},
		/**
		 * @function can-connect/constructor/constructor.updatedList updatedList
		 * @parent can-connect/constructor/constructor.callbacks
		 *
		 * Updates a list with new data.
		 *
		 * @signature `connection.updatedList( list, listData, set )`
		 *
		 *   [can-connect/constructor/constructor.hydrateInstance Hydrates] instances with `listData`'s data
		 *   and attempts to merge them into `list`.  The merge is able to identify simple insertions
		 *   and removals of elements instead of replacing the entire list.
		 *
		 *   @param {can-connect/Instance} list The instance to update.
		 *
		 *   @param {can-connect.listData} listData The raw data usd to update `list`.
		 *
		 *   @param {can-set/Set} set The set of data `listData` represents.
		 */
		updatedList: function(list, listData, set) {
			var instanceList = [];
			for(var i = 0; i < listData.data.length; i++) {
				instanceList.push( this.hydrateInstance(listData.data[i]) );
			}
			// This only works with "referenced" instances because it will not
			// update and assume the instance is already updated
			// this could be overwritten so that if the ids match, then a merge of properties takes place
			idMerge(list, instanceList, this.id.bind(this), this.hydrateInstance.bind(this));

			copyMetadata(listData, list);
		},
		/**
		 * @function can-connect/constructor/constructor.destroyedInstance destroyedInstance
		 * @parent can-connect/constructor/constructor.callbacks
		 *
		 * Updates the instance being destroyed with the result of [can-connect/connection.destroyData].
		 *
		 * @signature `connection.destroyedInstance( instance, props )`
		 *
		 *   Sets the properties in `instance` to match the properties and values in `props`
		 *   with the exception of [can-connect/base/base.idProp], which it leaves alone.
		 *
		 *   @param {can-connect/Instance} instance The instance to update.
		 *
		 *   @param {Object} props The data from [can-connect/connection.destroyData].
		 */
		destroyedInstance: function(instance, data){
			overwrite(instance, data, this.idProp);
		},
		/**
		 * @function can-connect/constructor/constructor.serializeInstance serializeInstance
		 * @parent can-connect/constructor/constructor.serializers
		 *
		 * @description Returns the serialized form of an instance.
		 *
		 * @signature `connection.serializeInstance( instance )`
		 *
		 *   This implementation simply clones the `instance` object.
		 *
		 *   @param {can-connect/Instance} instance The instance to serialize.
		 *
		 *   @return {Object} A serialized representation of the instance.
		 */
		serializeInstance: function(instance){
			return assign({}, instance);
		},
		/**
		 * @function can-connect/constructor/constructor.serializeList serializeList
		 * @parent can-connect/constructor/constructor.serializers
		 *
		 * @description Returns the serialized form of an list.
		 *
		 * @signature `connection.serializeList( list )`
		 *
		 *   This implementation simply returns an `Array` containing the result of
		 *   [can-connect/constructor/constructor.serializeInstance] called on each item in the list.
		 *
		 *   @param {can-connect.List} list The instance to serialize.
		 *
		 *   @return {Object|Array} A serialized representation of the list.
		 *
		 */
		serializeList: function(list){
			var self = this;
			return makeArray(list).map(function(instance){
				return self.serializeInstance(instance);
			});
		},
		/**
		 * @function can-connect/constructor/constructor.isNew isNew
		 * @parent can-connect/constructor/constructor.helpers
		 *
		 * Returns if this instance has not been persisted.
		 *
		 * @signature `connection.isNew(instance)`
		 *
		 *   Checks that the instance has an [can-connect/base/base.id].
		 *
		 *   @param {Object} instance The instance to test.
		 *   @return {Boolean} `true` if the instance has not been persisted.
		 */
		isNew: function(instance){
			var id = this.id(instance);
			return !(id || id === 0);
		}

		/**
		 * @property can-connect/constructor/constructor.list list
		 * @parent can-connect/constructor/constructor.hydrators
		 *
		 * Returns the data in its typed list form.
		 *
		 * @signature `connection.list( listInstanceData, set )`
		 *
		 *   Takes an object with a data property that is an array of instances returned by
		 *   [can-connect/constructor/constructor.hydrateInstance] and should return the right type of list.
		 *
		 *   @param {{data: Array<Instance>}} listInstanceData An object that contains an array
		 *   of instances.
		 *
		 *   @param {can-set/Set} set The set this list belongs to.
		 *
		 *   @return {can-connect.List} The instances in the special list type.
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
		 * var todosConnection = connect([
		 *   require("can-connect/constructor/constructor"),
		 *   require("can-connect/data/url/url")
		 * ], {
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
		 * Notice that we added the default [can-connect/base/base.listSetProp] (`__listSet`) data on the list. This is useful
		 * for other extensions.
		 *
		 */

		/**
		 * @property can-connect/constructor/constructor.instance instance
		 * @parent can-connect/constructor/constructor.hydrators
		 *
		 * Returns the typed form of the raw data.
		 *
		 * @signature `connection.instance( props )`
		 *
		 *   Takes raw data and runs it through [can-connect/constructor/constructor.hydrateInstance].
		 *
		 *   @param {Object} props
		 *
		 *   @return {can-connect/Instance} The typed instance.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * If you have a special type with helper functions you'd like to have available,
		 * you can convert raw data to that type in `instance`.  The following makes it so
		 * [can-connect/constructor/constructor.get .get] resolves to objects with a `complete` method.
		 *
		 * ```
		 * Todo = function(props){
		 *   Object.assign(this, props);
		 * };
		 * Todo.prototype.complete = function(){
		 *   this.completed = true;
		 * }
		 *
		 * var todosConnection = connect([
		 *   require("can-connect/constructor/constructor"),
		 *   require("can-connect/data/url/url")
		 * ], {
		 *   url: "todos",
		 *   instance: function( props ) {
		 *     return new Todo(props);
		 *   }
		 * });
		 * ```
		 *
		 * This allows:
		 *
		 * ```
		 * todosConnection.get({id: 5}).then(function(todo){
		 *   todo.complete();
		 * });
		 * ```
		 *
		 */
	};

	return behavior;

});

function copyMetadata(listData, list){
	for(var prop in listData) {
		if(prop !== "data") {
			// this is map infultrating constructor, but it's alright here.
			if(typeof list.set === "function") {
				list.set(prop, listData[prop]);
			} else if(typeof list.attr === "function") {
				list.attr(prop, listData[prop]);
			} else {
				list[prop] = listData[prop];
			}

		}
	}
}
