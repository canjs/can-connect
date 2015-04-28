
var connect = require("can-connect");
var can = require("can/util/util");
var getItems = require("./helpers/get-items");
var canSet = require("can-set");


/**
 * @module can-connect/cache-requests
 * 
 * Caches reponse data and uses it to prevent future requests or make future requests smaller.
 * 
 * Can request fewer or no items depending on what's in the cache.  If everything is loaded
 * (`getListData({})`) no future requests should be retreived.
 * 
 * By default, this uses an in-memory cache of data. However, it can be made to use cookies, localStorage, indexDb
 * or some other persisted storage.
 * 
 * @param {Behavior} A base behavior with the following implemented:
 * 
 *   @option {function} getListData
 * 
 * @param {{}} options
 * 
 *   @option {can.Object.compare} compare 
 */
module.exports = connect.behavior("cache-requests",function(base, options){
	options = options || {};
	
	// This keeps data 3 different ways
	// 1. A list of items for ranged sets
	//     {set: {}, items: []}
	var setData = [];
	
	// 2. A list of all items
	var cachedData = [];
	// 3. A map of items by id
	var cachedDataMap = {};
	
	return {
		id: function(){
			return (options && options.id) || "id";
		},
		// pure memory implementation
		getAvailableSets: function(){
			return new can.Deferred().resolve(setData.map(function(setData){
				return setData.set;
			}));
		},
		/**
		 * Compares the available set data to the requested data.
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
			
			var minSets;
			
			availableSets.forEach(function(set){
				var curSets;
				var difference = canSet.difference(params, set, options.compare);
				if(typeof difference === "object") {
					curSets = {
						needed: difference,
						cached: canSet.intersection(params, set, options.compare),
						count: canSet.count(difference, options.compare)
					};
				} else if( canSet.subset(params, set, options.compare) ){
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
		 * 
		 * @param {Object} params
		 * @return {Array<>} Array of cached data for these params
		 */
		getListCachedData: function(set){
			var setDatum;
			for(var i = 0; i < setData.length; i++) {
				setDatum = setData[i];
				
				if( canSet.subset(set, setDatum.set, options.compare) ) {
					var items = canSet.getSubset(set, setDatum.set, setDatum.items, options.compare);
					return new can.Deferred().resolve(items);
				}
			}
		},
		/**
		 * Adds a set and its data
		 * @param {Object} set - the set to load
		 * @param {Object} data - the data for the set
		 * @param {Object} options - current options
		 */
		addListCachedData: function(set, data, options){
			// when a union can be made ... make it
			console.log("addListCachedData", set);
			
			for(var i = 0 ; i < setData.length; i++) {
				var setDatum = setData[i];
				var union = canSet.union(setDatum.set, set, options.compare);
				if(union) {
					setDatum.items = canSet.getUnion(setDatum.set, set, setDatum.items, data, options.compare);
					setDatum.set = union;
					return new can.Deferred().resolve();
				}
			}
			setData.push({set: set, items: data});
			
			return new can.Deferred().resolve();
		},
		mergeData: function(params, diff, neededItems, cachedItems, options){
			// using the diff, re-construct everything
			return canSet.getUnion(diff.needed, diff.cached, neededItems, cachedItems, options.compare);
		},
		getListData: function(params){
			
			var self = this;
			
			return this.getAvailableSets(params).then(function(sets){
				
				var diff = self.diffSet(params, sets);
				
				if(!diff.needed) {
					return self.getListCachedData(diff.cached);
				} else if(!diff.cached) {
					return base.getListData(diff.needed).then(function(data){
						return self.addListCachedData(diff.needed, getItems(data), options).then(function(){
							return data;
						});
						
					});
				} else {
					var cachedPromise = self.getListCachedData(diff.cached);
					var needsPromise = base.getListData(diff.needed);
					
					var savedPromise = needsPromise.then(function(data){
						return self.addListCachedData(diff.needed, getItems(data), options).then(function(){
							return data;
						});
					});
					// start the combine while we might be saving param and adding to cache
					var combinedPromise = can.when(
						cachedPromise,
						needsPromise
					).then(function(cached, needed){
						return self.mergeData( params, diff, needed, cached, options);
					});
					
					return can.when(combinedPromise, savedPromise).then(function(data){
						return data;
					});
				}

			});	
		}
	};
	
});




