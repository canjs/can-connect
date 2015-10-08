/**
 * @module can-connect/data/localstorage-cache data-localstorage-cache
 * @parent can-connect.behaviors
 * @group can-connect/data/localstorage-cache.identifiers 0 Indentifiers
 * @group can-connect/data/localstorage-cache.data-methods 1 Data Methods
 *
 * Saves raw data in localStorage.
 *
 * @signature `localStorage( baseConnection )`
 *
 *   Creates a cache of instances and a cache of sets of instances that is
 *   accessible to read via [can-connect/data/localstorage-cache.getSets],
 *   [can-connect/data/localstorage-cache.getData], and [can-connect/data/localstorage-cache.getListData].
 *   The caches are updated via [can-connect/data/localstorage-cache.createData],
 *   [can-connect/data/localstorage-cache.updateData], [can-connect/data/localstorage-cache.destroyData],
 *   and [can-connect/data/localstorage-cache.updateListData].
 *
 *   [can-connect/data/localstorage-cache.createData],
 *   [can-connect/data/localstorage-cache.updateData],
 *   [can-connect/data/localstorage-cache.destroyData] are able to move items in and out
 *   of sets.
 *
 * @body
 *
 * ## Use
 *
 * `data-localstorage-cache` is often used with a caching strategy like [can-connect/fall-through-cache] or
 * [can-connect/cache-requests].  Make sure you configure the connection's [can-connect/data/localstorage-cache.name].
 *
 * ```
 * var cacheConnection = connect(["data-localstorage-cache"],{
 *   name: "todos"
 * });
 *
 * var todoConnection = connect(["data-url","fall-through-cache"],{
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
require("when/es6-shim/Promise");
var helpers = require("can-connect/helpers/");
var forEach = helpers.forEach;
var map = helpers.map;

//
var indexOf = function(connection, props, items){
	var id = connection.id(props);
	for(var i = 0; i < items.length; i++) {
		if( id == connection.id(items[i]) ) {
			return i;
		}
	}
	return -1;
};

var setAdd = function(set, items, item, algebra){
	return items.concat([item]);
};


module.exports = connect.behavior("data-localstorage-cache",function(baseConnect){

	var behavior = {
		// ## Helpers


		// a map of each id to an instance
		_instances: {},
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
		_getSets: function(setData){
			var sets = [];
			setData = setData || this.getSetData();
			for(var setKey in setData) {
				sets.push(setData[setKey].set);
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
		getInstances: function(ids){
			var self = this;
			return map.call(ids, function(id){
				return self.getInstance(id);
			});
		},
		removeSet: function(setKey, noUpdate) {
			var sets = this.getSetData();
			localStorage.removeItem(this.name+"/set/"+setKey);
			delete sets[setKey];
			if(noUpdate !== true) {
				this.updateSets(sets);
			}
		},
		updateSets: function(sets){
			var setData = this._getSets(sets);
			localStorage.setItem(this.name+"-sets", JSON.stringify( setData ) );
		},

		updateSet: function(setDatum, items, newSet) {

			var newSetKey = newSet ? sortedSetJSON(newSet) : setDatum.setKey;
			if(newSet) {
				// if the setKey is changing
				if(newSetKey !== setDatum.setKey) {
					// add the new one
					var sets = this.getSetData();
					var oldSetKey = setDatum.setKey;
					sets[newSetKey] = setDatum;
					setDatum.setKey = newSetKey;
					// remove the old one
					this.removeSet(oldSetKey);
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
				return cb(setDatum, setKey, function(){

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
		 * @property {String} can-connect/data/localstorage-cache.name name
		 * @parent can-connect/data/localstorage-cache.identifiers
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
		 * @function can-connect/data/localstorage-cache.clear clear
		 * @parent can-connect/data/localstorage-cache.data-methods
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
		 * @function can-connect/data/localstorage-cache.getSets getSets
		 * @parent can-connect/data/localstorage-cache.data-methods
		 *
		 * Returns the sets contained within the cache.
		 *
		 * @signature `connection.getSets(set)`
		 *
		 *   Returns the sets added by [can-connect/data/localstorage-cache.updateListData].
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
		 * @function can-connect/data/localstorage-cache.getListData getListData
		 * @parent can-connect/data/localstorage-cache.data-methods
		 *
		 * Gets a set of data from localstorage.
		 *
		 * @signature `connection.getListData(set)`
		 *
		 *   Goes through each set add by [can-connect/data/memory-cache.updateListData]. If
		 *   `set` is a subset, uses [connect.base.algebra] to get the data for the requested `set`.
		 *
		 *   @param {Set} set An object that represents the data to load.
		 *
		 *   @return {Promise<can-connect.listData>} A promise that resolves if `set` is a subset of
		 *   some data added by [can-connect/data/memory-cache.updateListData].  If it is not,
		 *   the promise is rejected.
		 */
		getListData: function(set){
			var setKey = sortedSetJSON(set);

			var setDatum = this.getSetData()[setKey];
			if(setDatum) {
				var localData = localStorage.getItem(this.name+"/set/"+setKey);
				if(localData) {
					return Promise.resolve( {data: this.getInstances( JSON.parse( localData ) )} );
				}
			}
			return Promise.reject({message: "no data", error: 404});

		},
		/**
		 * @function can-connect/data/localstorage-cache.getData getData
		 * @parent can-connect/data/localstorage-cache.data-methods
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
				return new Promise.reject({message: "no data", error: 404});
			}
		},

		/**
		 * @function can-connect/data/localstorage-cache.updateListData updateListData
		 * @parent can-connect/data/localstorage-cache.data-methods
		 *
		 * Saves a set of data in the cache.
		 *
		 * @signature `connection.updateListData(listData, set)`
		 *
		 *   Tries to merge this set of data with any other saved sets of data. If
		 *   unable to merge this data, saves the set by itself.
		 *
		 *   @param {can-connect.listData} listData
		 *   @param {Set} set
		 *   @return {Promise} Promise resolves if and when the data has been successfully saved.
		 */
		updateListData: function(data, set){
			var items = getItems(data);
			var sets = this.getSetData();
			var self = this;

			for(var setKey in sets) {
				var setDatum = sets[setKey];
				var union = canSet.union(setDatum.set, set, this.algebra);
				if(union) {
					return this.getListData(setDatum.set).then(function(setData){

						self.updateSet(setDatum, canSet.getUnion(setDatum.set, set, getItems(setData), items, this.algebra), union);
					});
				}
			}

			this.addSet(set, data);
			// setData.push({set: set, items: data});
			return Promise.resolve();
		},

		/**
		 * @function can-connect/data/localstorage-cache.createData createData
		 * @parent can-connect/data/localstorage-cache.data-methods
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
			// for now go through every set, if this belongs, add
			this._eachSet(function(setDatum, setKey, getItems){
				if(canSet.subset(props, setDatum.set, this.algebra)) {
					self.updateSet(setDatum, setAdd(setDatum.set,  getItems(), props, this.algebra), setDatum.set);
				}
			});
			var id = this.id(props);
			localStorage.setItem(this.name+"/instance/"+id, JSON.stringify(props));
			return Promise.resolve({});
		},

		/**
		 * @function can-connect/data/localstorage-cache.updateData updateData
		 * @parent can-connect/data/localstorage-cache.data-methods
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
			// for now go through every set, if this belongs, add it or update it, otherwise remove it
			this._eachSet(function(setDatum, setKey, getItems){
				// if props belongs
				var items = getItems();
				var index = indexOf(self, props, items);

				if(canSet.subset(props, setDatum.set, this.algebra)) {

					// if it's not in, add it
					if(index == -1) {
						// how to insert things together?

						self.updateSet(setDatum, setAdd(setDatum.set,  getItems(), props, this.algebra) );
					} else {
						// otherwise add it
						items.splice(index,1, props);
						self.updateSet(setDatum, items);
					}

				} else if(index != -1){
					// otherwise remove it
					items.splice(index,1);
					self.updateSet(setDatum, items);
				}
			});
			var id = this.id(props);

			localStorage.setItem(this.name+"/instance/"+id, JSON.stringify(props));

			return Promise.resolve({});
		},

		/**
		 * @function can-connect/data/localstorage-cache.destroyData destroyData
		 * @parent can-connect/data/localstorage-cache.data-methods
		 *
		 * Called when an instance should be removed from the cache.
		 *
		 * @signature `connection.destroyData(props)`
		 *
		 *   Goes through each set of data and removes any data that matches
		 *   `props`'s [connect.base.id]. Finally removes this from the instance store.
		 */
		destroyData: function(props){
			var self = this;
			// for now go through every set, if this belongs, add it or update it, otherwise remove it
			this._eachSet(function(setDatum, setKey, getItems){
				// if props belongs
				var items = getItems();
				var index = indexOf(self, props, items);

				if(index != -1){
					// otherwise remove it
					items.splice(index,1);
					self.updateSet(setDatum, items);
				}
			});
			var id = this.id(props);
			localStorage.removeItem(this.name+"/instance/"+id);
			return Promise.resolve({});
		}
	};

	return behavior;

});


