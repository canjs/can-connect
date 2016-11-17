/**
 * @module can-connect/data/callbacks-cache/callbacks-cache
 * @parent can-connect.behaviors
 *
 * Callback [can-connect/base/base.cacheConnection] methods when [can-connect/data/callbacks/callbacks data interface callbacks]
 * are called.
 *
 * @signature `dataCallbacksCache( baseConnection )`
 *
 *   Implements the [can-connect/data/callbacks/callbacks data callbacks] so that a corresponding method is called
 *   on the [can-connect/base/base.cacheConnection].This is
 *   useful for making sure a [can-connect/base/base.cacheConnection] is updated whenever data is updated.
 */
var connect = require("can-connect");
var assign = require("can-util/js/assign/assign");
var each = require("can-util/js/each/each");

// wires up the following methods
var pairs = {
	/**
	 * @function can-connect/data/callbacks-cache/callbacks-cache.createdData createdData
	 * @parent can-connect/data/callbacks-cache/callbacks-cache
	 *
	 * Called with the resolved response data
	 * of [can-connect/connection.createData]. Calls `createData` on the [can-connect/base/base.cacheConnection].
	 */
	createdData: "createData",
	/**
	 * @function can-connect/data/callbacks-cache/callbacks-cache.updatedData updatedData
	 * @parent can-connect/data/callbacks-cache/callbacks-cache
	 *
	 * Called with the resolved response data
	 * of [can-connect/connection.updateData]. Calls `updateData` on the [can-connect/base/base.cacheConnection].
	 */
	updatedData: "updateData",
	/**
	 * @function can-connect/data/callbacks-cache/callbacks-cache.destroyedData destroyedData
	 * @parent can-connect/data/callbacks-cache/callbacks-cache
	 *
	 * Called with the resolved response data
	 * of [can-connect/connection.destroyData]. Calls `destroyData` on the [can-connect/base/base.cacheConnection].
	 */
	destroyedData: "destroyData"
	//gotInstanceData: "updateListData"
};



module.exports = connect.behavior("data/callbacks-cache",function(baseConnection){

	var behavior = {};

	each(pairs, function(cacheCallback, dataCallbackName){
		behavior[dataCallbackName] = function(data, set, cid){

			// update the data in the cache
			this.cacheConnection[cacheCallback]( assign(assign({}, set), data) );

			return baseConnection[dataCallbackName].call(this,  data, set, cid);
		};
	});
	return behavior;
});
