/**
 * @module can-connect/data/callbacks-cache data-callbacks-cache
 * @parent can-connect.behaviors
 * 
 * Calls [connect.base.cacheConnection] methods whenever 
 * the [can-connect/data/callbacks data interface callbacks] are called. This is
 * useful for making sure a [connect.base.cacheConnection] is updated whenever data is updated.
 */
var connect = require("can-connect");
var idMerge = require("can-connect/helpers/id-merge");
var helpers = require("can-connect/helpers/");

// wires up the following methods
var pairs = {
	/**
	 * @function can-connect/data/callbacks-cache.createdData createdData
	 * @parent can-connect/data/callbacks-cache
	 * 
	 * Called with the resolved response data 
	 * of [connection.createData]. Calls `createData` on the [connect.base.cacheConnection].
	 */
	createdData: "createData",
	/**
	 * @function can-connect/data/callbacks-cache.updatedData updatedData
	 * @parent can-connect/data/callbacks-cache
	 * 
	 * Called with the resolved response data 
	 * of [connection.updateData]. Calls `updateData` on the [connect.base.cacheConnection].
	 */
	updatedData: "updateData",
	/**
	 * @function can-connect/data/callbacks-cache.destroyedData destroyedData
	 * @parent can-connect/data/callbacks-cache
	 * 
	 * Called with the resolved response data 
	 * of [connection.destroyData]. Calls `destroyData` on the [connect.base.cacheConnection].
	 */
	destroyedData: "destroyData"
	//gotInstanceData: "updateListData"
};



module.exports = connect.behavior("data-callbacks-cache",function(baseConnect){
	
	var behavior = {};
	
	helpers.each(pairs, function(cacheCallback, dataCallbackName){
		behavior[dataCallbackName] = function(data, set, cid){

			// update the data in the cache
			this.cacheConnection[cacheCallback]( helpers.extend({}, data) );
			
			return baseConnect[dataCallbackName].call(this,  data, set, cid);
		};
	});
	return behavior;
});