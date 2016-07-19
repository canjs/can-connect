var connect = require("can-connect");
var sortedSetJSON = require("can-connect/helpers/sorted-set-json");

/**
 * @module can-connect/data/inline-cache/inline-cache
 * @parent can-connect.behaviors
 * @group can-connect/data/inline-cache/inline-cache.data-methods Data Methods
 * @group can-connect/data/inline-cache/inline-cache.globals Globals
 * @hide
 *
 * @deprecated {0.6.0} [can-zone] can now do this without this plugin.
 *
 * Use data embedded in the page response instead of making a request.
 *
 * @signature `dataInlineCache( baseBehavior )`
 *
 *   Makes requests look for their data in a
 *   [can-connect/data/inline-cache/inline-cache.INLINE_CACHE] object.  If it is found,
 *   that entry in the cache is deleted so future requests will pass through.
 *
 * @body
 *
 * ## Use
 *
 * Create a connection with `data-inline-cache` and a [connection.name].
 *
 * ```
 * var todosConnection = connect(["data-inline-cache","data-url"],{
 *   url: "/api/todos",
 *   name: "todos"
 * })
 * ```
 *
 * Make the page respond with an `INLINE_CACHE` that contains the name of the
 * connection and a mapping of ids or sets to the response data:
 *
 * ```
 * <script>
 * INLINE_CACHE = {
 *   "todos": {
 *     1: {id: 1, name: "dishes"},
 *     "{\"completed\": true}": {data: [{...},{...}]}
 *   }
 * }
 * </script>
 * ```
 *
 * Now, the first time the following requests are made, the cached data will be used:
 *
 * ```
 * todosConnection.get({id: 1})
 * todosConnection.getList({completed: true})
 * ```
 *
 *
 */
module.exports = connect.behavior("data/inline-cache",function(baseConnect){

	/**
	 * @property {Object} can-connect/data/inline-cache/inline-cache.INLINE_CACHE INLINE_CACHE
	 * @parent can-connect/data/inline-cache/inline-cache.globals
	 *
	 * Contains response data for requests that should not be made.
	 *
	 * @option {Object<connection.name,Object<id|Set,can-connect.listData | props>>}
	 *
	 *   A mapping of a [connection.name] to an Object that contains the
	 *   cached data for that connection.  That inner object is a mapping
	 *   between either [can-connect/base/base.id ids] or [can-connect/base/base.listSet serialized sets] to
	 *   response data for those requests.
	 *
	 *
	 */
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
		/**
		 * @function can-connect/data/inline-cache/inline-cache.getListData getListData
		 * @parent can-connect/data/inline-cache/inline-cache.data-methods
		 *
		 * Uses data in [can-connect/data/inline-cache/inline-cache.INLINE_CACHE] if available.
		 *
		 * @signature `connection.getListData( set )`
		 *
		 *   Looks if there is a key in [can-connect/data/inline-cache/inline-cache.INLINE_CACHE]
		 *   that matches `set`.  If there is, it uses that key's value for the
		 *   response data and deletes that key so it can not be reused.
		 *
		 *   If there is no matching `key`, the base `getListData` is used.
		 *
		 *   @param {can-set/Set} set
		 *
		 *   @return {Promise<can-connect.listData>}
		 */
		getListData: function(set){
			set = set || {};
			var id = sortedSetJSON(set);
			var data = getData.call(this, id);
			if(data !== undefined) {
				if(this.cacheConnection) {
					this.cacheConnection.updateListData(data, set);
				}
				return Promise.resolve(data);
			} else {
				return baseConnect.getListData.apply(this, arguments);
			}
		},
		/**
		 * @function can-connect/data/inline-cache/inline-cache.getData getData
		 * @parent can-connect/data/inline-cache/inline-cache.data-methods
		 *
		 * Uses data in [can-connect/data/inline-cache/inline-cache.INLINE_CACHE] if available.
		 *
		 * @signature `connection.getListData( set )`
		 *
		 *   Looks if there is a key in [can-connect/data/inline-cache/inline-cache.INLINE_CACHE]
		 *   that matches the [can-connect/base/base.id] of `params`.  If there is, it uses that key's value for the
		 *   response data and deletes that key so it can not be reused.
		 *
		 *   If there is no matching `key`, the base `getData` is used.
		 *
		 *   @param {Object} params
		 *
		 *   @return {Promise<props>}
		 */
		getData: function(params){
			var id = this.id(params);
			var data = getData.call(this, id);
			if(data !== undefined) {
				if(this.cacheConnection) {
					this.cacheConnection.updateData(data);
				}
				return Promise.resolve(data);
			} else {
				return baseConnect.getData.apply(this, arguments);
			}
		}
	};
});
