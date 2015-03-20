
var connect = require("can-connect");
var canObject = require("can/util/object/object");
var can = require("can/util/util");
var setHelpers = require("./set_helpers");


/**
 * @module can-connect/subset-set
 * 
 * Can request fewer or no items depending on what's in the cache.  If everything is loaded
 * (`getListData({})`) no future requests should be retreived.
 * 
 * By default, this uses an in-memory cache of data. However, it can be made to use cookies, localStorage, indexDb
 * or some other persisted storage.
 * 
 * @param {{}} options
 * 
 *   @option {can.Object.compare} compare 
 */
module.exports = connect.behavior(function(base, options){
	options = options || {};
	
	var loadedSets = [];
	
	var cachedData = [];
	var cachedDataMap = {};
	
	return {
		id: function(){
			return (options && options.id) || "id";
		},
		// pure memory implementation
		getAvailableSets: function(){
			return new can.Deferred().resolve(loadedSets);
		},
		addAvailableSet: function(params){
			// this needs to be able to combine sets
			loadedSets.push(params);
			loadedSets = setHelpers.mergeParams(loadedSets, options);
			return new can.Deferred().resolve();
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
					diff = setHelpers.diffParamsRanges(set, params, options);
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
		getListCachedData: function(params){
			// pull out data that matches
			var len = cachedData.length,
				items = [];
				
			for (var i = 0; i < len; i++) {
				//check this subset
				var item = cachedData[i];
				if (can.Object.subset(item,params , options.compare)) {
					items.push(item);
				}
			}
			return new can.Deferred().resolve(items);
		},
		addListCachedData: function(data){
			var idProp = this.id();
			data.forEach(function(item){
				var id = item[idProp];
				if(!cachedDataMap[id]){ 
					cachedData.push( cachedDataMap[id] = item );
				}
			});
			return new can.Deferred().resolve();
		},
		mergeData: function(params, diff, needed, local){
			// using the diff, re-construct everything
			return helpers.mergeData(params, diff, needed, cached);
		},
		getListData: function(params){
			var self = this;
			
			return this.getAvailableSets(params).then(function(sets){
				var diff = self.diffSet(params, sets);
				
				if(!diff.needs) {
					return self.getListCachedData(diff.cached);
				} else if(!diff.cached) {
					return base.getListData(diff.needs).then(function(data){
						return can.when(
							self.addAvailableSet(diff.needs),
							self.addListCachedData(data)
						).then(function(){
							return data;
						});
						
					});
				} else {
					
					var needsPromise = base.getListData(diff.needs);
					
					var savedPromise = needsPromise.then(function(data){
						return can.when(
							self.addAvailableSet(diff.needs),
							self.addListCachedData(diff.needs)
						).then(function(){
							return data;
						});
					});
					// start the combine while we might be saving param and adding to cache
					var combinedPromise = can.when(
						this.getListCachedData(diff.cached),
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




