/**
 * @module can-connect/fall-through-cache/fall-through-cache
 * @parent can-connect.behaviors
 * @group can-connect/fall-through-cache/fall-through-cache.data Data Callbacks
 * @group can-connect/fall-through-cache/fall-through-cache.hydrators Hydrators
 * @group can-connect/fall-through-cache/fall-through-cache.mixins mixins Mixins
 *
 * A fall through cache that checks another `cacheConnection`.
 *
 * @signature `fallThroughCache( baseConnection )`
 *
 *   Implements a `getData` and `getListData` that
 *   check their [can-connect/base/base.cacheConnection] for data and then
 *   in the background update the instance or list with data
 *   retrieved using the base connection.
 *
 * @body
 *
 * ## Use
 *
 * To use the `fall-through-cache`, create a connection with a
 * [can-connect/base/base.cacheConnection] and a behavior that implements
 * [can-connect/connection.getData] and [can-connect/connection.getListData].
 *
 * ```
 * var cache = connect([
 *   require("can-connect/data/localstorage-cache/localstorage-cache")
 * ],{
 *   name: "todos"
 * });
 *
 * var todoConnection = connect([
 *    require("can-connect/fall-through-cache/fall-through-cache"),
 *    require("can-connect/data/url/url"),
 *    require("can-connect/constructor/constructor"),
 *    require("can-connect/constructor/store/store")
 *   ], {
 *   url: "/todos",
 *   cacheConnection: cache
 * });
 * ```
 *
 * Then, make requests.  If the cache has the data,
 * it will be returned immediately, and then the item or list updated later
 * with the response from the base connection:
 *
 * ```
 * todoConnection.getList({due: "today"}).then(function(todos){
 *
 * })
 * ```
 *
 * ## Demo
 *
 * The following shows the `fall-through-cache` behavior.
 *
 * @demo ../../demos/can-connect/fall-through-cache.html
 *
 * Clicking
 * "Completed" or "Incomplete" will make one of the following requests and
 * display the results in the page:
 *
 * ```
 * todoConnection.getList({completed: true});
 * todoConnection.getList({completed: false});
 * ```
 *
 * If you click back and forth between "Completed" and "Incomplete" multiple times
 * you'll notice that the old data is displayed immediately and then
 * updated after about a second.
 *
 */
var connect = require("can-connect");
var sortedSetJSON = require("../helpers/sorted-set-json");

var canEvent = require("can-event");
var Observation = require("can-observation");

module.exports = connect.behavior("fall-through-cache",function(baseConnect){
	var setExpando = function(map, prop, value) {
		if("attr" in map) {
			map[prop] = value;
		} else {
			map._data[prop] = value;
		}
	};
	var getExpando = function(map, prop) {
		if("attr" in map) {
			return map[prop];
		} else {
			return map._data[prop];
		}
	};

	var overwrite = function( connection, Constructor, prototype, statics) {
		var prop;

		for(prop in prototype) {
			Constructor.prototype[prop] = prototype[prop](Constructor.prototype[prop], connection);
		}
		if(statics) {
			for(prop in statics) {
				Constructor[prop] = statics[prop](Constructor[prop], connection);
			}
		}
	};

	var addIsConsistent = function(connection, Constructor) {
		overwrite(connection, Constructor, {

			_setInconsistencyReason: function(base, connection) {
				return function(error) {
					var oldError = getExpando(this, "inconsistencyReason");

					setExpando(this, "inconsistencyReason", error);
					canEvent.dispatch.call(this, "inconsistencyReason", [error, oldError]);	
				}
			},

			_setIsConsistent: function(base, connection) {
				return function(isConsistent) {
					setExpando(this, "_isConsistent", isConsistent);
					canEvent.dispatch.call(this, "_isConsistent", [isConsistent, !isConsistent]);
				};
			},
      /**
       * @function can-connect/fall-through-cache/fall-through-cache.isConsistent isConsistent
       * @parent can-connect/fall-through-cache/fall-through-cache.mixins
       *
       * Returns whether or not the data is consistent between the server and 
       * the fall-through-cache data.
       *
       * @signature `[map|list].isConsistent()`
       *
       *   Returns true if the data has been successfully returned from the 
       *   server and in sync with the fall-through-cache. Returns false if the
       *   data is from the cache.
       *   
       *   @return {Boolean}
       */
			isConsistent: function(base, connection) {
				return function() {
					Observation.add(this,"_isConsistent");
		    	return !!getExpando(this, "_isConsistent");
				};
			}
      /**
       * @function can-connect/fall-through-cache/fall-through-cache.inconsistencyReason inconsistencyReason
       * @parent can-connect/fall-through-cache/fall-through-cache.mixins
       *
       * Returns the error of the AJAX call from the base data layer.
       *
       * @signature `[map|list].inconsistencyReason`
       *
       *   Returns the error fo the base data layer's AJAX call if it's promise
       *   was rejected. If there isn't an inconsistency issue between the server
       *   and fall-through-cache layer, this will be undefined.
       *   
       *   @return {Object}
       */
		});
	};

	var behavior = {
		init: function() {
      // If List and Map are on the behavior, then we go ahead and add the 
      // isConsistent API information.
			if(this.List) {
				addIsConsistent(this, this.List);
			}
			if(this.Map) {
				addIsConsistent(this, this.Map);
			}

			baseConnect.init.apply(this, arguments);
		},
		_setIsConsistent: function(instance, isConsistent) {
			if(instance._setIsConsistent) {
				instance._setIsConsistent(isConsistent);
			}
		},
		/**
		 * @function can-connect/fall-through-cache/fall-through-cache.hydrateList hydrateList
		 * @parent can-connect/fall-through-cache/fall-through-cache.hydrators
		 *
		 * Returns a List instance given raw data.
		 *
		 * @signature `connection.hydrateList(listData, set)`
		 *
		 *   Calls the base `hydrateList` to create a List for `listData`.
		 *
		 *   Then, Looks for registered hydrateList callbacks for a given `set` and
		 *   calls them.
		 *
		 *   @param {can-connect.listData} listData
		 *   @param {can-set/Set} set
		 *   @return {can-connect.List}
		 */
		hydrateList: function(listData, set){
			set = set || this.listSet(listData);
			var id = sortedSetJSON( set );
			var list = baseConnect.hydrateList.call(this, listData, set);

			if(this._getHydrateListCallbacks[id]) {
				this._getHydrateListCallbacks[id].shift()(list);
				if(!this._getHydrateListCallbacks[id].length){
					delete this._getHydrateListCallbacks[id];
				}
			}
			return list;
		},
		_getHydrateListCallbacks: {},
		_getHydrateList: function(set, callback){
			var id = sortedSetJSON( set );
			if(!this._getHydrateListCallbacks[id]) {
				this._getHydrateListCallbacks[id]= [];
			}
			this._getHydrateListCallbacks[id].push(callback);
		},
		/**
		 * @function can-connect/fall-through-cache/fall-through-cache.getListData getListData
		 * @parent can-connect/fall-through-cache/fall-through-cache.data
		 *
		 * Get raw data from the cache if available, and then update
		 * the list later with data from the base connection.
		 *
		 * @signature `connection.getListData(set)`
		 *
		 *   Checks the [can-connect/base/base.cacheConnection] for `set`'s data.
		 *
		 *   If the cache connection has data, the cached data is returned. Prior to
		 *   returning the data, the [can-connect/constructor.hydrateList] method
		 *   is intercepted so we can get a handle on the list that's being created
		 *   for the returned data. Once the intercepted list is retrieved,
		 *   we use the base connection to get data and update the intercepted list and
		 *   the cacheConnection.
		 *
		 *   If the cache connection does not have data, the base connection
		 *   is used to load the data and the cached connection is updated with that
		 *   data.
		 *
		 *   @param {can-set/Set} set The set to load.
		 *
		 *   @return {Promise<can-connect.listData>} A promise that returns the
		 *   raw data.
		 */
		// if we do getList, the cacheConnection runs on
		// if we do getListData, ... we need to register the list that is going to be created
		// so that when the data is returned, it updates this
		getListData: function(set){
			set = set || {};
			var self = this;
			return this.cacheConnection.getListData(set).then(function(data){
				// get the list that is going to be made
				// it might be possible that this never gets called, but not right now
				self._getHydrateList(set, function(list){

					self._setIsConsistent(list, false);
					self.addListReference(list, set);

					setTimeout(function(){
						baseConnect.getListData.call(self, set).then(function(listData){

							self._setInconsistencyReason(list, undefined);
							self.cacheConnection.updateListData(listData, set);
							self.updatedList(list, listData, set);
							self._setIsConsistent(list, true);
							self.deleteListReference(list, set);

						}, function(e){
							console.error("baseConnect.getListData rejected", e);
							self.rejectedUpdatedInstance(list, e);
						});
					},1);
				});
				// TODO: if we wired up all responses to updateListData, this one should not
				// updateListData with itself.
				// But, how would we do a bypass?
				return data;
			}, function(){

				var listData = baseConnect.getListData.call(self, set);
				listData.then(function(listData){

					self.cacheConnection.updateListData(listData, set);
				});

				return listData;
			});
		},
		/**
		 * @function can-connect/fall-through-cache/fall-through-cache.hydrateInstance hydrateInstance
		 * @parent can-connect/fall-through-cache/fall-through-cache.hydrators
		 *
		 * Returns an instance given raw data.
		 *
		 * @signature `connection.hydrateInstance(props)`
		 *
		 *   Calls the base `hydrateInstance` to create an Instance for `props`.
		 *
		 *   Then, Looks for registered hydrateInstance callbacks for a given [can-connect/base/base.id] and
		 *   calls them.
		 *
		 *   @param {Object} props
		 *   @return {can-connect/Instance}
		 */
		hydrateInstance: function(props){

			var id = this.id( props );
			var instance = baseConnect.hydrateInstance.apply(this, arguments);

			if(this._getMakeInstanceCallbacks[id]) {
				this._getMakeInstanceCallbacks[id].shift()(instance);
				if(!this._getMakeInstanceCallbacks[id].length){
					delete this._getMakeInstanceCallbacks[id];
				}
			}
			return instance;
		},
		_getMakeInstanceCallbacks: {},
		_getMakeInstance: function(id, callback){
			if(!this._getMakeInstanceCallbacks[id]) {
				this._getMakeInstanceCallbacks[id]= [];
			}
			this._getMakeInstanceCallbacks[id].push(callback);
		},
		/**
		 * @function can-connect/fall-through-cache/fall-through-cache.getData getData
		 * @parent can-connect/fall-through-cache/fall-through-cache.data
		 *
		 * Get raw data from the cache if available, and then update
		 * the instance later with data from the base connection.
		 *
		 * @signature `connection.getData(params)`
		 *
		 *   Checks the [can-connect/base/base.cacheConnection] for `params`'s data.
		 *
		 *   If the cache connection has data, the cached data is returned. Prior to
		 *   returning the data, the [can-connect/constructor/constructor.hydrateInstance] method
		 *   is intercepted so we can get a handle on the instance that's being created
		 *   for the returned data. Once the intercepted instance is retrieved,
		 *   we use the base connection to get data and update the intercepted instance and
		 *   the cacheConnection.
		 *
		 *   If the cache connection does not have data, the base connection
		 *   is used to load the data and the cached connection is updated with that
		 *   data.
		 *
		 *   @param {Object} params The set to load.
		 *
		 *   @return {Promise<Object>} A promise that returns the
		 *   raw data.
		 */
		getData: function(params){
			// first, always check the cache connection
			var self = this;
			return this.cacheConnection.getData(params).then(function(instanceData){

				// get the list that is going to be made
				// it might be possible that this never gets called, but not right now
				self._getMakeInstance(self.id(instanceData) || self.id(params), function(instance){
					self.addInstanceReference(instance);

					self._setIsConsistent(instance, false);

					setTimeout(function(){
						baseConnect.getData.call(self, params).then(function(instanceData2){


							self._setInconsistencyReason(instance, undefined);
							self.cacheConnection.updateData(instanceData2);
							self.updatedInstance(instance, instanceData2);
							self._setIsConsistent(instance, true);
							self.deleteInstanceReference(instance);

						}, function(e){
							console.error("baseConnect.getData rejected", e);
							self.rejectedUpdatedInstance(instance, e);
						});
					},1);
				});

				return instanceData;
			}, function(){
				var listData = baseConnect.getData.call(self, params);
				listData.then(function(instanceData){
					self.cacheConnection.updateData(instanceData);
				});

				return listData;
			});
		},
		rejectedUpdatedInstance: function(instance, error) {
			this._setIsConsistent(instance, false);
			this._setInconsistencyReason(instance, error);
		},

		_setInconsistencyReason: function(instance, error) {
			if(instance._setInconsistencyReason) {
				instance._setInconsistencyReason(error);
			}
		}

	};

	return behavior;

});
