var can = require("can/util/util");
var connect = require("can-connect");
var pipe = require("./helpers/pipe");
var sortedSetJSON = require("./helpers/sorted-set-json");

/**
 * @module can-connect/data-inline-cache data-inline-cache
 * @parent can-connect.modules
 * 
 * Makes requests use a global `INLINE_CACHE` object for data a "single time".
 * 
 * `INILNE_CACHE` might look like:
 * 
 * ```
 * INLINE_CACHE = {
 *   "todos": {
 * 	   1: {id: 1, name: "dishes"},
 *     "{\"completed\": true}": {data: [{...},{...}]} 
 *   }
 * }
 * ```
 * 
 * This would use this inline cache for the data for a `.get({id: 1})`
 * and a `.getList({completed: true})` request for a connection named "todos".
 * 
 * 
 * @param {{}} options
 * 
 *   @option {String} name The name is used to identify which property in INLINE_CACHE this connection
 *   should look for IDs in.
 */
module.exports = connect.behavior("data-inline-cache",function(baseConnect){

	if(typeof INLINE_CACHE === "undefined") {
		// do nothing if no INLINE_CACHE when this module loads.  INLINE_CACHE has to be before steal.
		return {};
	}
	
	var getData = function(id){
		var type = INLINE_CACHE[this.name];
		if(type) {
			var data = type[id];
			if( data ) {
				// delete so it can't be used again
				delete type[id];
				return data;
			}
		}
	};
	
	return {
		getListData: function(set){
			var id = sortedSetJSON(set);
			var data = getData.call(this, id);
			if(data !== undefined) {
				if(this.cacheConnection) {
					this.cacheConnection.updateListData(data, set);
				}
				return new can.Deferred().resolve(data);
			} else {
				return baseConnect.getListData.apply(this, arguments);
			}
		},
		getData: function(params){
			var id = this.id(params);
			var data = getData.call(this, id);
			if(data !== undefined) {
				if(this.cacheConnection) {
					this.cacheConnection.updateData(data);
				}
				return new can.Deferred().resolve(data);
			} else {
				return baseConnect.getData.apply(this, arguments);
			}
		}
	};
	
	
	return behavior;
});