var connect = require("can-connect");
var getItems = require("can-connect/helpers/get-items");
var canSet = require("can-set");
var forEach = [].forEach;


/**
 * @module can-connect/cache-requests/cache-requests cache-requests
 * @parent can-connect.behaviors
 * @group can-connect/cache-requests/cache-requests.data data interface
 * @group can-connect/cache-requests/cache-requests.algebra algebra
 *
 * Cache response data and use it to prevent unnecessary future requests or make future requests smaller.
 *
 * @signature `cacheRequests( baseConnection )`
 *
 *   Provide an implementation of [can-connect/cache-requests/cache-requests.getListData] that uses set logic to
 *   determine what data is already in the [can-connect/base/base.cacheConnection cache] and what data needs to be
 *   loaded from the base connection.
 *
 *   It then gets data from the cache and the base connection (if needed), merges it, and returns it. Any data returned
 *   from the base connection is added to the cache.
 *
 *   @param {{}} baseConnection `can-connect` connection object that is having the `cache-requests` behavior added
 *   on to it. Should already contain the behaviors that provide the [can-connect/DataInterface]
 *   (e.g [can-connect/data/url/url]). If the `connect` helper is used to build the connection, the behaviors will
 *   automatically be ordered as required.
 *
 *   @return {Object} A `can-connect` connection containing the methods provided by `cache-requests`.
 *
 *
 * @body
 *
 * ## Use
 *
 * Use `cache-requests` in combination with a cache like [can-connect/data/memory-cache/memory-cache] or
 * [can-connect/data/localstorage-cache/localstorage-cache].  For example, to make it so response data is cached
 * in memory:
 *
 * ```
 * var memoryCache = require("can-connect/data/memory-cache/");
 * var dataUrl = require("can-connect/data/url/");
 * var cacheRequests = require("can-connect/cache-requests/");
 *
 * var cacheConnection = connect([memoryCache], {});
 * var todoConnection = connect([dataUrl, cacheRequests],{
 *   cacheConnection: cacheConnection,
 *   url: "/todos"
 * });
 * ```
 *
 * Now if today's todos are loaded:
 *
 * ```
 * todoConnection.getListData({due: "today"});
 * ```
 *
 * And later, a subset of those todos are loaded:
 *
 * ```
 * todoConnection.getListData({due: "today", status: "critical"});
 * ```
 *
 * The subset will be created from the original request's data.
 *
 * ## Algebra Usage
 *
 * `cache-requests` can also "fill in" the data the cache is missing if you provide it the necessary [can-set set algebra].
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
 * ... with the appropriate algebra configuration, `cache-requests` will only request `{start: 11, end: 20}`, merging
 * that response with the data already present in the cache.
 *
 * That configuration looks like:
 *
 * ```
 * var algebra = new set.Algebra( set.props.rangeInclusive("start","end") );
 *
 * var cacheConnection = connect([memoryCache], {algebra: algebra});
 * var todoConnection = connect([dataUrl, cacheRequests], {
 *   cacheConnection: cacheConnection,
 *   url: "/todos",
 *   algebra: algebra
 * })
 * ```
 *
 * **Note:** `cacheConnection` shares the same algebra configuration as the primary connection.
 */
var cacheRequestsBehaviour = connect.behavior("cache-requests",function(baseConnection){

	return {

		/**
		 * @function can-connect/cache-requests/cache-requests.getDiff getDiff
		 * @parent can-connect/cache-requests/cache-requests.algebra
		 *
		 * Compares the cached sets to the requested set and returns a description of what subset can be loaded from the
		 * cache and what subset must be loaded from the base connection.
		 *
		 * @signature `connection.getDiff( set, availableSets )`
		 *
		 *   This determines the minimal amount of data that must be loaded from the base connection by going through each
		 *   cached set (`availableSets`) and doing a [can-set.Algebra.prototype.subset subset] check and a
		 *   [can-set.Algebra.prototype.difference set difference] with the requested set (`set`).
		 *
		 *   If `set` is a subset of an `availableSet`, `{cached: set}` will be returned.
		 *
		 *   If `set` is neither a subset of, nor intersects with any `availableSets`, `{needed: set}` is returned.
		 *
		 *   If `set` has an intersection with one or more `availableSets`, a description of the difference that has the fewest
		 *   missing elements will be returned. An example diff description looks like:
		 *
		 *   ```
		 *   {
		 *     needed: {start: 50, end: 99}, // the difference, the set that is not cached
		 *     cached: {start: 0, end: 49}, // the intersection, the set that is cached
		 *     count: 49 // the size of the needed set
		 *   }
		 *   ```
		 *
		 *   @param {can-set/Set} set The set that is being requested.
		 *   @param {Array<can-set/Set>} availableSets An array of [can-connect/connection.getSets available sets] in the
		 *     [can-connect/base/base.cacheConnection cache].
		 *   @return {Promise<{needed: Set, cached: Set, count: Integer}>} a difference description object. Described above.
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
		 * Create the requested data set, a union of the cached and un-cached data.
		 *
		 * @signature `connection.getUnion(set, diff, neededData, cachedData)`
		 *
		 *   Uses [can-set.Algebra.prototype.getUnion] to merge the two sets of data (`neededData` & `cachedData`).
		 *
		 * @param {can-set/Set} set The parameters of the data set requested.
		 * @param {Object} diff The result of [can-connect/cache-requests/cache-requests.getDiff].
		 * @param {can-connect.listData} neededData The data loaded from the base connection.
		 * @param {can-connect.listData} cachedData The data loaded from the [can-connect/base/base.cacheConnection].
		 *
		 * @return {can-connect.listData} A merged [can-connect.listData] representation of the the cached and requested data.
		 */
		getUnion: function(params, diff, neededItems, cachedItems){
			// using the diff, re-construct everything
			return {data: canSet.getUnion(diff.needed, diff.cached, getItems(neededItems), getItems(cachedItems), this.algebra)};
		},

		/**
		 * @function can-connect/cache-requests/cache-requests.getListData getListData
		 * @parent can-connect/cache-requests/cache-requests.data
		 *
		 * Only request data that isn't already present in the [can-connect/base/base.cacheConnection cache].
		 *
		 * @signature `connection.getListData(set)`
		 *
		 *   Overwrites a base connection's `getListData` to use data in the [can-connect/base/base.cacheConnection cache]
		 *   whenever possible.  This works by [can-connect/connection.getSets getting the stored sets]
		 *   from the [can-connect/base/base.cacheConnection cache] and
		 *   doing a [can-connect/cache-requests/cache-requests.getDiff diff] to see what needs to be loaded from the base
		 *   connection and what can be loaded from the [can-connect/base/base.cacheConnection cache].
		 *
		 *   With that information, this `getListData` requests data from the cache or the base connection as needed.
		 *   Data loaded from different sources is combined via [can-connect/cache-requests/cache-requests.getUnion].
		 *
		 * @param {can-set/Set} set the parameters of the list that is being requested.
		 * @return {Promise<can-connect.listData>} a promise that returns an object conforming to the [can-connect.listData] format.
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

module.exports = cacheRequestsBehaviour;

//!steal-remove-start
var validate = require("can-connect/helpers/validate");
module.exports = validate(cacheRequestsBehaviour, ['getListData', 'cacheConnection']);
//!steal-remove-end