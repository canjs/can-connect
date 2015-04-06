
var connect = require("can-connect");
var canObject = require("can/util/object/object");
var can = require("can/util/util");
var setHelpers = require("./set-helpers");


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
module.exports = connect.behavior(function(base, options){
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
		 */
		diffSet: function( params, availableSets ){
			
			var minDiff;
			
			availableSets.forEach(function(set){
				var diff;
				if(canObject.subset(params,set)) {
					diff = {
						count: -1,
						cached: params
					};
				} else {
					diff = setHelpers.diffRanges(set, params, options);
				}
				
				if(diff) {
					if(!minDiff || diff.count < minDiff.count) {
						minDiff = diff;
					} 
				}
			});
			
			if(!minDiff) {
				return {
					needs: params
				};
			} else {
				return {
					needs: minDiff.needs,
					cached: minDiff.cached
				};
			}

		},
		/**
		 * 
		 * @param {Object} params
		 * @return {Array<>} Array of cached data for these params
		 */
		getListCachedData: function(set){
			console.log("getCached", set)
			// if this is ranged
			if( setHelpers.paramsHasRangedProperties(set, options) ) {
				// go through and see if there is a diff.  If there is get those items
				for( var i = 0 ; i < setData.length; i++ ) {
					var setDatum = setData[i];
					var diff = setHelpers.diff( setDatum.set, set, options );
					if(diff){
						var startRange = setDatum.set[diff.properties[0]];
						var items = setDatum.items.slice(diff.cached[0] - startRange, diff.cached[1] -startRange +1);
						return new can.Deferred().resolve(items);
					}
				}
			} else {
				// pull out data that matches
				var len = cachedData.length,
					items = [];
					
				for (var i = 0; i < len; i++) {
					//check this subset
					var item = cachedData[i];
					if (can.Object.subset(item,set , options.compare)) {
						items.push(item);
					}
				}
				return new can.Deferred().resolve(items);
			}
			
			
		},
		/**
		 * Adds a set and its data
		 * @param {Object} set - the set to load
		 * @param {Object} data - the data for the set
		 * @param {Object} options - current options
		 */
		addListCachedData: function(set, data, options){
			console.log("addListCachedData", set);
			// If this was a ranged request, we need to merge its data into other params
			if( setHelpers.paramsHasRangedProperties(set, options) ) {
				setData.push({
					set: set,
					items: data
				});
				setData = setHelpers.merge(setData, options, function(o1, o2, combined, options){
					var rangedProperties = setHelpers.rangedProperties(options);
					if(rangedProperties) {
						var diff = setHelpers.diff( o1.set, o2.set, options );
						if( diff ) {
							return {
								set: combined,
								items: diff.insertNeeds === "before" ? o2.items.concat(o1.items) : o1.items.concat(o2.items)
							};
						}
					}
					return {
						set: combined
					};
				});
			} else {
				setData.push({set: set});
				setData = setHelpers.merge(setData, options);
			}

			// add to our list of everything
			var idProp = this.id();
			data.forEach(function(item){
				var id = item[idProp];
				if(!cachedDataMap[id]){ 
					cachedData.push( cachedDataMap[id] = item );
				}
			});
			
			
			
			return new can.Deferred().resolve();
		},
		mergeData: function(params, diff, needed, cached, options){
			// using the diff, re-construct everything
			return setHelpers.mergeData(params, diff, needed, cached, options);
		},
		getListData: function(params){
			console.log("getListData", params);
			var self = this;
			
			return this.getAvailableSets(params).then(function(sets){
				
				var diff = self.diffSet(params, sets);
				
				if(!diff.needs) {
					return self.getListCachedData(diff.cached);
				} else if(!diff.cached) {
					return base.getListData(diff.needs).then(function(data){
						return self.addListCachedData(diff.needs, data, options).then(function(){
							return data;
						});
						
					});
				} else {
					var cachedPromise = self.getListCachedData(diff.cached);
					var needsPromise = base.getListData(diff.needs);
					
					var savedPromise = needsPromise.then(function(data){
						return self.addListCachedData(diff.needs, data, options).then(function(){
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




