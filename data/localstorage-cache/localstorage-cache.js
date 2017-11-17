/**
 * @module can-connect/data/localstorage-cache/localstorage-cache localstorage-cache
 * @parent can-connect.behaviors
 * @group can-connect/data/localstorage-cache/localstorage-cache.identifiers 0 identifiers
 * @group can-connect/data/localstorage-cache/localstorage-cache.data-methods 1 data methods
 *
 * Saves raw data in localStorage.
 *
 * @signature `localStorage( baseConnection )`
 *
 *   Creates a cache of instances and a cache of sets of instances that is
 *   accessible to read via [can-connect/data/localstorage-cache/localstorage-cache.getSets],
 *   [can-connect/data/localstorage-cache/localstorage-cache.getData], and [can-connect/data/localstorage-cache/localstorage-cache.getListData].
 *   The caches are updated via [can-connect/data/localstorage-cache/localstorage-cache.createData],
 *   [can-connect/data/localstorage-cache/localstorage-cache.updateData], [can-connect/data/localstorage-cache/localstorage-cache.destroyData],
 *   and [can-connect/data/localstorage-cache/localstorage-cache.updateListData].
 *
 *   [can-connect/data/localstorage-cache/localstorage-cache.createData],
 *   [can-connect/data/localstorage-cache/localstorage-cache.updateData],
 *   [can-connect/data/localstorage-cache/localstorage-cache.destroyData] are able to move items in and out
 *   of sets.
 *
 * @body
 *
 * ## Use
 *
 * `data/localstorage-cache` is often used with a caching strategy like [can-connect/fall-through-cache/fall-through-cache] or
 * [can-connect/cache-requests/cache-requests].  Make sure you configure the connection's [can-connect/data/localstorage-cache/localstorage-cache.name].
 *
 * ```
 * var cacheConnection = connect([
 *   require("can-connect/data/localstorage-cache/localstorage-cache")
 * ],{
 *   name: "todos"
 * });
 *
 * var todoConnection = connect([
 *   require("can-connect/data/url/url"),
 *   require("can-connect/fall-through-cache/fall-through-cache")
 * ],
 * {
 *   url: "/services/todos",
 *   cacheConnection: cacheConnection
 * });
 * ```
 *
 */
var getItems = require("can-connect/helpers/get-items");
var connect = require("can-connect");
var sortedSetJSON = require("can-connect/helpers/sorted-set-json");
var canSet = require("can-set");
var forEach = [].forEach;
var map = [].map;
var setAdd = require("can-connect/helpers/set-add");
var indexOf = require("can-connect/helpers/get-index-by-id");
var assign = require("can-util/js/assign/assign");
var overwrite = require("can-connect/helpers/overwrite");

module.exports = connect.behavior("data/localstorage-cache",function(baseConnection){

	var behavior = {
		// ## Helpers


		// a map of each id to an instance
		_instances: {},
		// Returns the sets stored in localstorage like:
		// `{setKey: {set: set, setKey: setKey}}`
		getSetData: function(){

			var sets = {};
			var self = this;
			forEach.call((JSON.parse(localStorage.getItem(this.name+"-sets"))|| []), function(set){
				// make sure we actually have set data
				 var setKey = sortedSetJSON(set);

				if( localStorage.getItem(self.name+"/set/"+setKey) ) {
					sets[setKey] = {
						set: set,
						setKey: setKey
					};
				}
			});

			return sets;
		},
		// returns an array of sets
		_getSets: function(setData){
			var sets = [];
			setData = setData || this.getSetData();
			for(var setKey in setData) {
				sets.push(JSON.parse(setKey));
			}
			return sets;
		},

		getInstance: function(id){
			//if(!this._instances[id]) {
				var res = localStorage.getItem(this.name+"/instance/"+id);
				if(res) {
					return JSON.parse( res );
				}
			//}
			//return this._instances[id];
		},
		updateInstance: function(props) {
			var id = this.id(props);
			var instance = this.getInstance(id);
			if(!instance) {
				instance = props;
			} else {
				overwrite(instance, props, this.idProp);
			}
			localStorage.setItem(this.name+"/instance/"+id, JSON.stringify(instance) );

			return instance;
		},
		getInstances: function(ids){
			var self = this;
			return map.call(ids, function(id){
				return self.getInstance(id);
			});
		},
		// Removes one particular set
		removeSet: function(setKey) {
			var sets = this.getSetData();
			localStorage.removeItem(this.name+"/set/"+setKey);
			delete sets[setKey];
		},
		// updates the available sets to what's provided in sets.
		updateSets: function(sets){
			var setData = this._getSets(sets);
			localStorage.setItem(this.name+"-sets", JSON.stringify( setData ) );
		},

		updateSet: function(setDatum, items, newSet) {

			var newSetKey = newSet ? sortedSetJSON(newSet) : setDatum.setKey;
			if(newSet) {
				// if the setKey is changing
				if(newSetKey !== setDatum.setKey) {
					// get current sets
					var sets = this.getSetData();

					// remove the old one
					localStorage.removeItem(this.name+"/set/"+setDatum.setKey);
					delete sets[setDatum.setKey];

					// add the new one
					sets[newSetKey] = {setKey: newSetKey, set: newSet};
					this.updateSets(sets);
				}
			}

			setDatum.items = items;
			// save objects and ids
			var self = this;

			var ids = map.call(items, function(item){
				var id = self.id(item);
				localStorage.setItem(self.name+"/instance/"+id, JSON.stringify(item) );
				return id;
			});

			localStorage.setItem(this.name+"/set/"+newSetKey, JSON.stringify(ids) );
		},
		addSet: function(set, data) {
			var items = getItems(data);
			var sets = this.getSetData();
			var setKey = sortedSetJSON(set);
			sets[setKey] = {
				setKey: setKey,
				items: items,
				set: set
			};

			var self = this;

			var ids = map.call(items, function(item){
				var id = self.id(item);
				localStorage.setItem(self.name+"/instance/"+id, JSON.stringify(item));
				return id;
			});

			localStorage.setItem(this.name+"/set/"+setKey, JSON.stringify(ids) );
			this.updateSets(sets);
		},
		_eachSet: function(cb){
			var sets = this.getSetData();
			var self = this;
			var loop = function(setDatum, setKey) {
				return cb.call(self,setDatum, setKey, function(){

					if( !("items" in setDatum) ) {
						var ids = JSON.parse( localStorage.getItem(self.name+"/set/"+setKey) );
						setDatum.items = self.getInstances(ids);
					}
					return setDatum.items;

				});
			};

			for(var setKey in sets) {
				var setDatum = sets[setKey];
				var result = loop(setDatum, setKey);
				if(result !== undefined) {
					return result;
				}
			}
		},
		// ## Identifiers

		/**
		 * @property {String} can-connect/data/localstorage-cache/localstorage-cache.name name
		 * @parent can-connect/data/localstorage-cache/localstorage-cache.identifiers
		 *
		 * Specify a name to use when saving data in localstorage.
		 *
		 * @option {String} This name is used to find and save data in
		 * localstorage. Instances are saved in `{name}/instance/{id}`
		 * and sets are saved in `{name}/set/{set}`.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var cacheConnection = connect(["data-localstorage-cache"],{
		 *   name: "todos"
		 * });
		 * ```
		 */


		// ## External interface

		/**
		 * @function can-connect/data/localstorage-cache/localstorage-cache.clear clear
		 * @parent can-connect/data/localstorage-cache/localstorage-cache.data-methods
		 *
		 * Resets the memory cache so it contains nothing.
		 *
		 * @signature `connection.clear()`
		 *
		 */
		clear: function(){
			var sets = this.getSetData();
			for(var setKey in sets) {
				localStorage.removeItem(this.name+"/set/"+setKey);
			}
			localStorage.removeItem(this.name+"-sets");

			// remove all instances

			// firefox is weird about what happens when a key at an index is removed,
			// so we need to get all keys first
			var keys = [];
			for ( var i = 0, len = localStorage.length; i < len; ++i ) {
				if(localStorage.key(i).indexOf(this.name+"/instance/") === 0) {
					keys.push(localStorage.key(i));
				}
			}
			forEach.call(keys, function(key){
				localStorage.removeItem( key );
			});
			this._instances = {};
		},



		/**
		 * @function can-connect/data/localstorage-cache/localstorage-cache.getSets getSets
		 * @parent can-connect/data/localstorage-cache/localstorage-cache.data-methods
		 *
		 * Returns the sets contained within the cache.
		 *
		 * @signature `connection.getSets(set)`
		 *
		 *   Returns the sets added by [can-connect/data/localstorage-cache/localstorage-cache.updateListData].
		 *
		 *   @return {Promise<Array<Set>>} A promise that resolves to the list of sets.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * connection.getSets() //-> Promise( [{type: "completed"},{user: 5}] )
		 * ```
		 *
		 */
		getSets: function(){
			return Promise.resolve( this._getSets() );
		},
		/**
		 * @function can-connect/data/localstorage-cache/localstorage-cache.getListData getListData
		 * @parent can-connect/data/localstorage-cache/localstorage-cache.data-methods
		 *
		 * Gets a set of data from localstorage.
		 *
		 * @signature `connection.getListData(set)`
		 *
		 *   Goes through each set add by [can-connect/data/memory-cache.updateListData]. If
		 *   `set` is a subset, uses [can-connect/base/base.algebra] to get the data for the requested `set`.
		 *
		 *   @param {can-set/Set} set An object that represents the data to load.
		 *
		 *   @return {Promise<can-connect.listData>} A promise that resolves if `set` is a subset of
		 *   some data added by [can-connect/data/memory-cache.updateListData].  If it is not,
		 *   the promise is rejected.
		 */
		getListData: function(set){
			set = set || {};
			var listData = this.getListDataSync(set);
			if(listData) {
				return Promise.resolve(listData);
			}
			return Promise.reject({message: "no data", error: 404});
		},
		/**
		 * @function can-connect/data/localstorage-cache.getListDataSync getListDataSync
		 * @parent can-connect/data/localstorage-cache.data-methods
		 *
		 * Synchronously gets a set of data from localstorage.
		 *
		 * @signature `connection.getListDataSync(set)`
		 * @hide
		 */
		getListDataSync: function(set){
			var sets = this._getSets();
			for(var i = 0; i < sets.length; i++) {
				var checkSet = sets[i];

				if( canSet.subset(set, checkSet, this.algebra) ) {
					var items = canSet.getSubset(set, checkSet, this.__getListData(checkSet), this.algebra);
					return {data: items};
				}
			}
		},
		__getListData: function(set){
			var setKey = sortedSetJSON(set);

			var setDatum = this.getSetData()[setKey];
			if(setDatum) {
				var localData = localStorage.getItem(this.name+"/set/"+setKey);
				if(localData) {
					return this.getInstances( JSON.parse( localData ) );
				}
			}
		},
		/**
		 * @function can-connect/data/localstorage-cache/localstorage-cache.getData getData
		 * @parent can-connect/data/localstorage-cache/localstorage-cache.data-methods
		 *
		 * Get an instance's data from localstorage.
		 *
		 * @signature `connection.getData(params)`
		 *
		 *   Looks in localstorage for the requested instance.
		 *
		 *   @param {Object} params An object that should have the [conenction.id] of the element
		 *   being retrieved.
		 *
		 *   @return {Promise} A promise that resolves to the item if the memory cache has this item.
		 *   If localstorage does not have this item, it rejects the promise.
		 */
		getData: function(params){
			var id = this.id(params);
			var res = localStorage.getItem(this.name+"/instance/"+id);
			if(res){
				return Promise.resolve( JSON.parse(res) );
			} else {
				return Promise.reject({message: "no data", error: 404});
			}
		},

		/**
		 * @function can-connect/data/localstorage-cache/localstorage-cache.updateListData updateListData
		 * @parent can-connect/data/localstorage-cache/localstorage-cache.data-methods
		 *
		 * Saves a set of data in the cache.
		 *
		 * @signature `connection.updateListData(listData, set)`
		 *
		 *   Tries to merge this set of data with any other saved sets of data. If
		 *   unable to merge this data, saves the set by itself.
		 *
		 *   @param {can-connect.listData} listData
		 *   @param {can-set/Set} set
		 *   @return {Promise} Promise resolves if and when the data has been successfully saved.
		 */
		updateListData: function(data, set){
			set = set || {};
			var items = getItems(data);
			var sets = this.getSetData();
			var self = this;
			for(var setKey in sets) {
				var setDatum = sets[setKey];
				var union = canSet.union(setDatum.set, set, this.algebra);
				if(union) {
					// Get the data for the old set we can union with.
					return this.getListData(setDatum.set).then(function(setData){
						// update the old set to the new set
						self.updateSet(setDatum, canSet.getUnion(setDatum.set, set, getItems(setData), items, this.algebra), union);
					});
				}
			}

			this.addSet(set, data);
			// setData.push({set: set, items: data});
			return Promise.resolve();
		},

		/**
		 * @function can-connect/data/localstorage-cache/localstorage-cache.createData createData
		 * @parent can-connect/data/localstorage-cache/localstorage-cache.data-methods
		 *
		 * Called when an instance is created and should be added to cache.
		 *
		 * @signature `connection.createData(props)`
		 *
		 *   Adds `props` to the stored list of instances. Then, goes
		 *   through every set and adds props the sets it belongs to.
		 */
		createData: function(props){
			var self = this;
			var instance = this.updateInstance(props);
			// for now go through every set, if this belongs, add
			this._eachSet(function(setDatum, setKey, getItems){
				if(canSet.has(setDatum.set, instance, this.algebra)) {
					self.updateSet(setDatum, setAdd(self, setDatum.set,  getItems(), instance, self.algebra), setDatum.set);
				}
			});
			return Promise.resolve(assign({},instance));
		},

		/**
		 * @function can-connect/data/localstorage-cache/localstorage-cache.updateData updateData
		 * @parent can-connect/data/localstorage-cache/localstorage-cache.data-methods
		 *
		 * Called when an instance is updated.
		 *
		 * @signature `connection.updateData(props)`
		 *
		 *   Overwrites the stored instance with the new props. Then, goes
		 *   through every set and adds or removes the instance if it belongs or not.
		 */
		updateData: function(props){
			var self = this;
			var instance = this.updateInstance(props);
			// for now go through every set, if this belongs, add it or update it, otherwise remove it
			this._eachSet(function(setDatum, setKey, getItems){
				// if instance belongs
				var items = getItems();
				var index = indexOf(self, instance, items);

				if(canSet.has(setDatum.set, instance, this.algebra)) {

					// if it's not in, add it
					if(index === -1) {
						// how to insert things together?

						self.updateSet(setDatum, setAdd(self, setDatum.set,  getItems(), instance, self.algebra) );
					} else {
						// otherwise add it
						items.splice(index,1, instance);
						self.updateSet(setDatum, items);
					}

				} else if(index !== -1){
					// otherwise remove it
					items.splice(index,1);
					self.updateSet(setDatum, items);
				}
			});

			return Promise.resolve(assign({},instance));
		},

		/**
		 * @function can-connect/data/localstorage-cache/localstorage-cache.destroyData destroyData
		 * @parent can-connect/data/localstorage-cache/localstorage-cache.data-methods
		 *
		 * Called when an instance should be removed from the cache.
		 *
		 * @signature `connection.destroyData(props)`
		 *
		 *   Goes through each set of data and removes any data that matches
		 *   `props`'s [can-connect/base/base.id]. Finally removes this from the instance store.
		 */
		destroyData: function(props){
			var self = this;
			var instance = this.updateInstance(props);
			// for now go through every set, if this belongs, add it or update it, otherwise remove it
			this._eachSet(function(setDatum, setKey, getItems){
				// if props belongs
				var items = getItems();
				var index = indexOf(self, instance, items);

				if(index !== -1){
					// otherwise remove it
					items.splice(index,1);
					self.updateSet(setDatum, items);
				}
			});
			var id = this.id(instance);
			localStorage.removeItem(this.name+"/instance/"+id);
			return Promise.resolve(assign({},instance));
		}
	};

	return behavior;

});
