
var connect = require("can-connect");
var canSet = require("can-set");
var getItems = require("can-connect/helpers/get-items");
var deepAssign = require("can-util/js/deep-assign/deep-assign");

var makeDeferred = require("can-connect/helpers/deferred");
var forEach = [].forEach;
/**
 * @module can-connect/data/combine-requests/combine-requests
 * @parent can-connect.behaviors
 * @group can-connect/data/combine-requests.data-methods data methods
 * @group can-connect/data/combine-requests.options options
 * @group can-connect/data/combine-requests.algebra algebra methods
 * @group can-connect/data/combine-requests.types types
 *
 * Combines multiple incoming requests into one if possible.
 *
 * @signature `dataCombineRequests( baseConnection )`
 *
 *   Overwrites [can-connect/data/combine-requests.getListData] to collect the requested
 *   sets for
 *   some [can-connect/data/combine-requests.time].  Once that time has expired, it tries
 *   to take the [can-connect/data/combine-requests.unionPendingRequests union] of those sets. It
 *   makes requests with those unioned sets. Once the unioned set data has returned,
 *   the original requests re satisified by getting
 *   [can-connect/data/combine-requests.getSubset subsets] of the unioned set data.
 *
 * @body
 *
 * ## Use
 *
 * Create a connection with the `combine-requests` plugin like:
 *
 * ```
 * var todosConnection = connect([
 *   require("can-connect/data/combine-requests/combine-requests"),
 *   require("can-connect/data/url/url")
 * ],{
 *   url: "/todos"
 * });
 * ```
 *
 * By default, the following will only make a single request if made at the same time:
 *
 * ```
 * todosConnection.getListData({})
 * todosConnection.getListData({userId: 5});
 * todosConnection.getListData({userId: 5, type: "critical"});
 * ```
 *
 * This is because [can-set](https://github.com/canjs/can-set) knows that
 * `{userId: 5, type: "critical"}` and `{userId: 5}` are subsets of `{}`.
 *
 * For more advanced combining, use set algebra.  The following supports
 * combining ranges:
 *
 * ```
 * var todosConnection = connect([
 *   require("can-connect/data/combine-requests/combine-requests"),
 *   require("can-connect/data/url/url")
 * ],{
 *   url: "/todos",
 *   algebra: new Algebra(set.props.range("start","end"))
 * });
 * ```
 *
 * Now the following will make single request:
 *
 * ```
 * todosConnection.getListData({start: 0, end: 49})
 * todosConnection.getListData({start: 0, end: 5});
 * todosConnection.getListData({start: 50, end: 99});
 * ```
 *
 */
module.exports = connect.behavior("data/combine-requests",function(baseConnection){
	var pendingRequests; //[{set, deferred}]

	return {
		/**
		 * @function can-connect/data/combine-requests.unionPendingRequests unionPendingRequests
		 * @parent can-connect/data/combine-requests.algebra
		 *
		 * @signature `connection.unionPendingRequests( pendingRequests )`
		 *
		 *   @param {Array<can-connect/data/combine-requests.PendingRequest>}
		 *
		 *   An array of objects, each containing:
		 *
		 *   - `set` - the requested set
		 *   - `deferred` - a deferred that will be resolved with this sets data
		 *
		 *   @return {Array<{set: Set, pendingRequests: can-connect/data/combine-requests.PendingRequest}>}
		 *
		 *   Returns an array of each of the unioned requests to be made.  Each unionized request should have:
		 *
		 *   - `set` - the set to request
		 *   - `pendingRequests` - the array of [can-connect/data/combine-requests.PendingRequest pending requests] the set satisfies.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * This function gets called automatically.  However, it converts something like:
		 *
		 * ```
		 * [
		 *   {set: {completed: false}, deferred: def1},
		 *   {set: {completed: true}, deferred: def2}
		 * ]
		 * ```
		 *
		 * to
		 *
		 * ```
		 * [
		 *   {
		 *    set: {},
		 *    pendingRequests: [
		 *      {set: {completed: false}, deferred: def1},
		 *      {set: {completed: true}, deferred: def2}
		 *    ]
		 *   }
		 * ]
		 * ```
		 *
		 */
		unionPendingRequests: function(pendingRequests){
			// this should try to merge existing param requests, into an array of
			// others to send out
			// but this data structure keeps the original promises.


			// we need the "biggest" sets first so they can swallow up everything else
			// O(n log n)
			var self = this;

			pendingRequests.sort(function(pReq1, pReq2){

				if(canSet.subset(pReq1.set, pReq2.set, self.algebra)) {
					return 1;
				} else if( canSet.subset(pReq2.set, pReq1.set, self.algebra) ) {
					return -1;
				} else {
					return 0;
				}

			});

			// O(n^2).  This can probably be made faster, but there are rarely lots of pending requests.
			var combineData = [];
			var current;

			doubleLoop(pendingRequests, {
				start: function(pendingRequest){
					current = {
						set: pendingRequest.set,
						pendingRequests: [pendingRequest]
					};
					combineData.push(current);
				},
				iterate: function(pendingRequest){
					var combined = canSet.union(current.set, pendingRequest.set, self.algebra);
					if(combined) {
						// add next
						current.set = combined;
						current.pendingRequests.push(pendingRequest);
						// removes this from iteration
						return true;
					}
				}
			});

			return Promise.resolve(combineData);
		},
		/**
		 * @function can-connect/data/combine-requests.getSubset getSubset
		 * @parent can-connect/data/combine-requests.algebra
		 *
		 * Return the items that belong to an initial request.
		 *
		 * @signature `connection.getSubset( set, unionSet, data )`
		 *
		 *   This implementation uses [can-set.Algebra.prototype.getSubset] on the [can-connect/base/base.algebra].
		 *
		 *   @param {can-set/Set} set the subset initially requested
		 *   @param {can-set/Set} unionSet the combined set that was actually requested
		 *   @param {can-connect.listData} data the data from the combined set
		 *   @return {can-connect.listData} the data that belongs to `set`
		 */
		getSubset: function(set, unionSet, data){
			return canSet.getSubset(set, unionSet, data, this.algebra);
		},
		/**
		 * @property {Number} can-connect/data/combine-requests.time time
		 * @parent can-connect/data/combine-requests.options
		 *
		 * Specifies the amount of time to wait to combine requests.
		 *
		 * @option {Number} Defaults to `1` which means that only requests made within the same
		 * "thread of execution" will be combined.  Increasing this number will mean
		 * that requests are going to be delayed that length of time in case other requests
		 * are made.  Generally speaking, there's no good reason to increase the amount of time.
		 *
		 * ```
		 * connect([
		 *   require("can-connect/data/combine-requests/combine-requests"),
		 *   ...
		 * ],{
		 *   time: 100
		 * })
		 * ```
		 */
		time:1,
		/**
		 * @function can-connect/data/combine-requests.getListData getListData
		 * @parent can-connect/data/combine-requests.data-methods
		 *
		 * Tries to combine requests using set logic.
		 *
		 * @signature `connection.getListData( set )`
		 *
		 *   Collects the sets for calls to `getListData` for
		 *   some [can-connect/data/combine-requests.time].  Once that time has expired, it tries
		 *   to take the [union](https://github.com/canjs/can-set#setunion) of those sets. It
		 *   makes requests with those unioned sets. Once the unioned set data has returned,
		 *   the original requests rae satisified by taking
		 *   [can-set.Algebra.prototype.getSubset] of the unioned set data.
		 *
		 *   @param {can-set/Set} set The set used to request data.
		 *   @return {can-connect.listData} The data for the requested set of data.
		 */
		getListData: function(set){
			set = set || {};
			var self = this;

			if(!pendingRequests) {

				pendingRequests = [];

				setTimeout(function(){

					var combineDataPromise = self.unionPendingRequests(pendingRequests);
					pendingRequests = null;
					combineDataPromise.then(function(combinedData){
						// farm out requests
						forEach.call(combinedData, function(combined){
							// clone combine.set to prevent mutations by baseConnection.getListData
							var combinedSet = deepAssign({}, combined.set);

							baseConnection.getListData(combinedSet).then(function(data){
								if(combined.pendingRequests.length === 1) {
									combined.pendingRequests[0].deferred.resolve(data);
								} else {
									forEach.call(combined.pendingRequests, function(pending){
										// get the subset using the combine.set property before being passed down
										// to baseConnection.getListData which might mutate it causing combinedRequests
										// to resolve with an `undefined` value instead of an actual set
										// https://github.com/canjs/can-connect/issues/139
										pending.deferred.resolve( {data: self.getSubset(pending.set, combined.set, getItems(data) )} );
									});
								}
							}, function(err){
								if(combined.pendingRequests.length === 1) {
									combined.pendingRequests[0].deferred.reject(err);
								} else {
									forEach.call(combined.pendingRequests, function(pending){
										pending.deferred.reject(err);
									});
								}

							});
						});
					});


				}, this.time || 1);
			}
			var deferred = makeDeferred();

			pendingRequests.push({deferred: deferred, set: set});

			return deferred.promise;
		}
	};
});

/**
 * @typedef {{set: Set, deferred: Deferred}} can-connect/data/combine-requests.PendingRequest PendingRequest
 * @parent can-connect/data/combine-requests.types
 *
 * @option {can-set/Set} set A [can-set](https://github.com/canjs/can-set) set object.
 * @option {Deferred} deferred A defferred that can be used to resolve or reject a promise.
 */
// ### doubleLoop
var doubleLoop = function(arr, callbacks){
	var i = 0;
	while(i < arr.length) {
		callbacks.start(arr[i]);
		var j = i+1;
		while( j < arr.length ) {
			if(callbacks.iterate(arr[j]) === true) {
				arr.splice(j, 1);
			} else {
				j++;
			}
		}
		i++;
	}
};
