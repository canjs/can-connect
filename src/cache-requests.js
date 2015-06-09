
var connect = require("can-connect");
var can = require("can/util/util");
var getItems = require("./helpers/get-items");
var canSet = require("can-set");


/**
 * @module can-connect/cache-requests cache-requests
 * @parent can-connect.modules
 * 
 * Caches reponse data and uses it to prevent future requests or make future requests smaller.
 * 
 * Can request fewer or no items depending on what's in the cache.  If everything is loaded
 * (`getListData({})`) no future requests should be retreived.
 * 
 * By default, this uses an in-memory cache of data. However, it can be made to use cookies, localStorage, indexDb
 * or some other persisted storage.
 * 
 * @param {{}} A base behavior with the following implemented:
 * 
 *   @option {function} getListData abc
 * 
 * @param {{}} options
 * 
 *   @option {can.Object.compare} compare 
 * 
 * @body
 * 
 * Supports caching data for requests that are made for sets of data that
 * overlap.  By default caching is done in-memory only.
 * 
 * 
 * ```js
 * combineBehavior = cacheRequests( persistBehavior );
 * 
 * combineBehavior.getListData({}) //-> promise(Array<items>)
 * 
 * // this will use the previous data if done later
 * combineBehavior.getListData({type: "critical"}) //-> promise(Array<items>)
 * 
 * // this will use the previous loaded data if done later
 * combineBehavior.getListData({due: "today"}) //-> promise(Array<items>)
 * ```
 */
module.exports = connect.behavior("cache-requests",function(base){
	
	// This keeps data 3 different ways
	// 1. A list of items for ranged sets
	//     {set: {}, items: []}
	var setData = [];
	
	// 2. A list of all items
	var cachedData = [];
	// 3. A map of items by id
	var cachedDataMap = {};
	
	return {
		/**
		 * Gets a list of the sets that have been stored.
		 * @return {Promise<Array<Set>>}
		 */
		getAvailableSets: function(){
			return new can.Deferred().resolve(setData.map(function(setData){
				return setData.set;
			}));
		},
		/**
		 * Compares the available set data to the requested data.
		 * 
		 * 
		 * @return {Promise<{needs: Set, cached: Set}>}
		 * 
		 * Return a Promise that:
		 * - specifies the set that __needs__ to be loaded by base `getListData`
		 * - specifies the set that should be loaded from `getListCachedData`
		 * 
		 * @body
		 * 
		 * Ideally, this will not have to compare every set ever loaded.
		 * 
		 * We could prevent that by "collapsing" sets similar to the combine-set
		 * method.  Then the sets loaded should be unique and easier to 
		 * 
		 * returns
		 *   - what needs to be loaded - difference  - setA \ setB 
		 *   - what is already available  - intersection - setA ∩ setB
		 *   - the count
		 */
		diffSet: function( params, availableSets ){
			
			var minSets,
				self = this;
			
			availableSets.forEach(function(set){
				var curSets;
				var difference = canSet.difference(params, set, self.compare);
				if(typeof difference === "object") {
					curSets = {
						needed: difference,
						cached: canSet.intersection(params, set, self.compare),
						count: canSet.count(difference, self.compare)
					};
				} else if( canSet.subset(params, set, self.compare) ){
					curSets = {
						cached: params,
						count: 0
					};
				}
				if(curSets) {
					if(!minSets || curSets.count < minSets.count) {
						minSets = curSets;
					} 
				}
			});
			
			if(!minSets) {
				return {
					needed: params
				};
			} else {
				return {
					needed: minSets.needed,
					cached: minSets.cached
				};
			}
		},
		/**
		 * Gets data for a given set from storage.
		 * @param {Object} params
		 * @return {Promise<Array<InstanceData>>} Array of cached data for these params.
		 */
		getListCachedData: function(set){
			var setDatum;
			for(var i = 0; i < setData.length; i++) {
				setDatum = setData[i];
				
				if( canSet.subset(set, setDatum.set, this.compare) ) {
					var items = canSet.getSubset(set, setDatum.set, setDatum.items, this.compare);
					return new can.Deferred().resolve(items);
				}
			}
		},
		/**
		 * Adds a set and its data
		 * @param {Object} set - the set to load
		 * @param {Object} data - the data for the set
		 * @param {Object} options - current options
		 * @return {Promise}
		 */
		addListCachedData: function( set, data ){
			// when a union can be made ... make it
			console.log("addListCachedData", set);
			
			for(var i = 0 ; i < setData.length; i++) {
				var setDatum = setData[i];
				var union = canSet.union(setDatum.set, set, this.compare);
				if(union) {
					setDatum.items = canSet.getUnion(setDatum.set, set, setDatum.items, data, this.compare);
					setDatum.set = union;
					return new can.Deferred().resolve();
				}
			}
			setData.push({set: set, items: data});
			
			return new can.Deferred().resolve();
		},
		/**
		 * 
		 * @param {Object} params
		 * @param {Object} diff
		 * @param {Object} neededItems
		 * @param {Object} cachedItems
		 * @return {Array<{data: items}>} Return merged cached and requested data.
		 */
		mergeData: function(params, diff, neededItems, cachedItems){
			// using the diff, re-construct everything
			return canSet.getUnion(diff.needed, diff.cached, neededItems, cachedItems, this.compare);
		},
		getListData: function(params){
			
			var self = this;
			
			return this.getAvailableSets(params).then(function(sets){
				
				var diff = self.diffSet(params, sets);
				
				if(!diff.needed) {
					return self.getListCachedData(diff.cached);
				} else if(!diff.cached) {
					return base.getListData(diff.needed).then(function(data){
						return self.addListCachedData(diff.needed, getItems(data) ).then(function(){
							return data;
						});
						
					});
				} else {
					var cachedPromise = self.getListCachedData(diff.cached);
					var needsPromise = base.getListData(diff.needed);
					
					var savedPromise = needsPromise.then(function(data){
						return self.addListCachedData( diff.needed, getItems(data) ).then(function(){
							return data;
						});
					});
					// start the combine while we might be saving param and adding to cache
					var combinedPromise = can.when(
						cachedPromise,
						needsPromise
					).then(function(cached, needed){
						return self.mergeData( params, diff, needed, cached);
					});
					
					return can.when(combinedPromise, savedPromise).then(function(data){
						return data;
					});
				}

			});	
		}
	};
	
});




