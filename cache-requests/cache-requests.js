
var connect = require("can-connect");
var getItems = require("can-connect/helpers/get-items");
var canSet = require("can-set");
var forEach = [].forEach;


/**
 * @module can-connect/cache-requests/cache-requests
 * @parent can-connect.behaviors
 * @group can-connect/cache-requests/cache-requests.data data interface
 * @group can-connect/cache-requests/cache-requests.algebra algebra
 *
 * Caches reponse data and uses it to prevent future requests or make future requests smaller.
 *
 * @signature `cacheRequests( baseConnection )`
 *
 *   Overwrites [can-connect/cache-requests/cache-requests.getListData] to use set logic to
 *   determine which data is already in [can-connect/base/base.cacheConnection] or needs to be loaded from the base connection.
 *
 *   It then gets data from the cache and/or the base connection, merges it, and returns it.
 *
 * @body
 *
 * ## Use
 *
 * Use `cache-requests` in combination with a cache
 * like [can-connect/data/memory-cache/memory-cache] or [can-connect/data/localstorage-cache/localstorage-cache].  For example,
 *
 * ```
 * var cacheConnection = connect([
 *   require("can-connect/data/memory-cache/memory-cache")
 * ],{});
 *
 * var todoConnection = connect([
 *   require("can-connect/data/url/url"),
 *   require("can-connect/cache-requests/cache-requests")
 * ],{
 *   cacheConnection: cacheConnection,
 *   url: "/todos"
 * })
 * ```
 *
 * This will make it so response data is cached in memory.  For example, if
 * today's todos are loaded:
 *
 * ```
 * todoConnection.getListData({due: "today"})
 * ```
 *
 * And later, a subset of those todos are loaded:
 *
 * ```
 * todoConnection.getListData({due: "today", status: "critical"})
 * ```
 *
 * The original request's data will be used.
 *
 * ## Using Algebra
 *
 * `cache-requests` can also "fill in" the data the cache is mising if you provide
 * it the necessary [set algebra](https://github.com/canjs/can-set).
 *
 * For example, if you requested paginated data like:
 *
 * ```
 * todoConnection.getListData({start: 1, end: 10})
 * ```
 *
 * And then later requested:
 *
 * ```
 * todoConnection.getListData({start: 1, end: 20})
 * ```
 *
 * ... with the appropriate configuration, `cache-requests` will only request `{start: 11, end: 20}`.
 * That configuration looks like:
 *
 * ```
 * var algebra = new set.Algebra( set.comparators.range("start","end") );
 *
 * var cacheConnection = connect([
 *   require("can-connect/data/memory-cache/memory-cache")
 * ],{algebra: algebra});
 *
 * var todoConnection = connect([
 *   require("can-connect/data/url/url"),
 *   require("can-connect/cache-requests/cache-requests")
 * ],{
 *   cacheConnection: cacheConnection,
 *   url: "/todos",
 *   algebra: algebra
 * })
 * ```
 *
 * Notice that `cacheConnection`s often share many of the same options as the
 * primary connection.
 */
module.exports = connect.behavior("cache-requests",function(baseConnection){

	return {

		/**
		 * @function can-connect/cache-requests/cache-requests.getDiff getDiff
		 * @parent can-connect/cache-requests/cache-requests.algebra
		 *
		 * Compares the available set data to the requested data and returns
		 * the data that should be loaded from the cache and the data loaded
		 * from the base connection.
		 *
		 * @signature `connection.getDiff( set, availableSets )`
		 *
		 *   This attempts to find the minimal amount of data to load by
		 *   going through each `availableSet` and doing a [subset](https://github.com/canjs/can-set#setsubset)
		 *   test and a [set difference](https://github.com/canjs/can-set#setdifference) with
		 *   `set`.
		 *
		 *   If `set` is a subset of an `availableSet`, `{cached: set}` will be returned.
		 *
		 *   If there is a difference of `set` and an `availableSet`, the difference
		 *   will be what's `needed`.  The intersection of `set` and that
		 *   `availableSet` will be what's `cached`.  A `count` will be taken of
		 *   what's `needed` resulting in an object like:
		 *
		 *   ```
		 *   {
		 *     needed: {start: 50, end: 99},
		 *     cached: {start: 0, end: 49},
		 *     count: 49
		 *   }
		 *   ```
		 *
		 *   Finally, `getDiff` will pick the diff objet with the lowest count. If there
		 *   is no diff object, `{needed: set}` is returned.
		 *
		 *
		 *   @param {can-set/Set} set The set that is being loaded.
		 *   @param {Array<Set>} availableSets An array of available sets in the
		 *   [can-connect/base/base.cacheConnection].
		 *   @return {Promise<{needs: Set, cached: Set}>}
		 *
		 *
		 */
		getDiff: function( params, availableSets ){

			var minSets,
				self = this;

			forEach.call(availableSets, function(set){
				var curSets;
				var difference = canSet.difference(params, set, self.algebra);
				if(typeof difference === "object") {
					curSets = {
						needed: difference,
						cached: canSet.intersection(params, set, self.algebra),
						count: canSet.count(difference, self.algebra)
					};
				} else if( canSet.subset(params, set, self.algebra) ){
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
		 * @function can-connect/cache-requests/cache-requests.getUnion getUnion
		 * @parent can-connect/cache-requests/cache-requests.algebra
		 *
		 * Returns the union of the cached and needed data.
		 *
		 * @signature `connection.getUnion(set, diff, neededData, cachedData)`
		 *
		 *   Uses [can-set.getUnion](https://github.com/canjs/can-set#setgetunion) to merge the two sets.
		 *
		 *   @param {can-set/Set} set The set requested.
		 *   @param {Object} diff The result of [can-connect/cache-requests/cache-requests.getDiff].
		 *   @param {can-connect.listData} neededData The data loaded from the base connection.
		 *   @param {can-connect.listData} cachedData The data loaded from the [can-connect/base/base.cacheConnection].
		 *
		 *   @return {can-connect.listData} Return the merged cached and requested data.
		 */
		getUnion: function(params, diff, neededItems, cachedItems){
			// using the diff, re-construct everything
			return {data: canSet.getUnion(diff.needed, diff.cached, getItems(neededItems), getItems(cachedItems), this.algebra)};
		},
		/**
		 * @function can-connect/cache-requests/cache-requests.getListData getListData
		 * @parent can-connect/cache-requests/cache-requests.data
		 *
		 * Only request data that hasn't already been loaded by [can-connect/base/base.cacheConnection].
		 *
		 * @signature `connection.getListData(set)`
		 *
		 *   Overwrites a base connection's `getListData` to use data in the [can-connect/base/base.cacheConnection]
		 *   whenever possible.  This works by [can-connect/connection.getSets getting the stored sets] and doing a
		 *   [can-connect/cache-requests/cache-requests.getDiff diff] to see what should be loaded from the cache
		 *   or from the base connection.
		 *
		 *   With that information, this `getListData` requests data from the cache and/or the base
		 *   connection.  Once it has been recieved, it combines the data with [can-connect/cache-requests/cache-requests.getUnion].
		 *
		 * @param {can-set/Set} set
		 */
		getListData: function(set){
			set = set || {};
			var self = this;

			return this.cacheConnection.getSets(set).then(function(sets){

				var diff = self.getDiff(set, sets);

				if(!diff.needed) {
					return self.cacheConnection.getListData(diff.cached);
				} else if(!diff.cached) {
					return baseConnection.getListData(diff.needed).then(function(data){

						return self.cacheConnection.updateListData(getItems(data), diff.needed ).then(function(){
							return data;
						});

					});
				} else {
					var cachedPromise = self.cacheConnection.getListData(diff.cached);
					var needsPromise = baseConnection.getListData(diff.needed);

					var savedPromise = needsPromise.then(function(data){
						return self.cacheConnection.updateListData(  getItems(data), diff.needed ).then(function(){
							return data;
						});
					});
					// start the combine while we might be saving param and adding to cache
					var combinedPromise = Promise.all([
						cachedPromise,
						needsPromise
					]).then(function(result){
						var cached = result[0],
							needed = result[1];
						return self.getUnion( set, diff, needed, cached);
					});

					return Promise.all([combinedPromise, savedPromise]).then(function(data){
						return data[0];
					});
				}

			});
		}
	};

});
