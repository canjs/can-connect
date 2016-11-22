/**
 * @module can-connect/data/callbacks/callbacks
 * @parent can-connect.behaviors
 *
 * Calls callback methods as a result of raw [can-connect/DataInterface] requests.
 *
 * @signature `dataCallbacks( baseConnection )`
 *
 *
 */
var connect = require("can-connect");
var each = require("can-util/js/each/each");

// wires up the following methods
var pairs = {
	/**
	 * @function can-connect/data/callbacks/callbacks.gotListData gotListData
	 * @parent can-connect/data/callbacks/callbacks
	 *
	 * @signature `connection.gotListData(data, params, cid)`
	 *
	 *   Called with the resolved response data
	 *   of [can-connect/connection.getListData]. The result of this function will be used
	 *   as the new response data.
	 *
	 *
	 *   @param {Object} data The raw data returned by the response.
	 *   @param {Object} params The parameters used to make this request.
	 *   @param {Number} cid The cid of the instance created.
	 *   @return {Object} The raw data this request represents.
	 */
	getListData: "gotListData",
	//getData: "gotInstanceData",
	/**
	 * @function can-connect/data/callbacks/callbacks.createdData createdData
	 * @parent can-connect/data/callbacks/callbacks
	 *
	 * @signature `connection.createdData(data, params, cid)`
	 *
	 *   Called with the resolved response data
	 *   of [can-connect/connection.createData]. The result of this function will be used
	 *   as the new response data.
	 *
	 *
	 *   @param {Object} data The raw data returned by the response.
	 *   @param {Object} params The parameters used to make this request.
	 *   @param {Number} cid The cid of the instance created.
	 *   @return {Object} The raw data this request represents.
	 */
	createData: "createdData",
	/**
	 * @function can-connect/data/callbacks/callbacks.updatedData updatedData
	 * @parent can-connect/data/callbacks/callbacks
	 *
	 * @signature `connection.updatedData(data, params, cid)`
	 *
	 *   Called with the resolved response data
	 *   of [can-connect/connection.updateData]. The result of this function will be used
	 *   as the new response data.
	 *
	 *
	 *   @param {Object} data The raw data returned by the response.
	 *   @param {Object} params The parameters used to make this request.
	 *   @param {Number} cid The cid of the instance created.
	 *   @return {Object} The raw data this request represents.
	 */
	updateData: "updatedData",
	/**
	 * @function can-connect/data/callbacks/callbacks.destroyedData destroyedData
	 * @parent can-connect/data/callbacks/callbacks
	 *
	 * @signature `connection.destroyedData(data, params, cid)`
	 *
	 *   Called with the resolved response data
	 *   of [can-connect/connection.destroyData]. The result of this function will be used
	 *   as the new response data.
	 *
	 *
	 *   @param {Object} data The raw data returned by the response.
	 *   @param {Object} params The parameters used to make this request.
	 *   @param {Number} cid The cid of the instance created.
	 *   @return {Object} The raw data this request represents.
	 */
	destroyData: "destroyedData"
};

module.exports = connect.behavior("data/callbacks",function(baseConnection){

	var behavior = {
	};

	// overwrites createData to createdData
	each(pairs, function(callbackName, name){

		behavior[name] = function(params, cid){
			var self = this;

			return baseConnection[name].call(this, params).then(function(data){
				if(self[callbackName]) {
					return self[callbackName].call(self,data, params, cid );
				} else {
					return data;
				}
			});
		};

	});
	return behavior;
});
