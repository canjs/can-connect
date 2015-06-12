/**
 * @module can-connect/data/callbacks data-callbacks
 * @parent can-connect.modules
 * 
 * Glues the result of the raw `Data Interface` methods to callbacks. This is
 * useful if you want something to happen with raw data anytime raw data is requested
 * or manipulated.
 * 
 * 
 */
var can = require("can/util/util");
var connect = require("can-connect");
var pipe = require("can-connect/helpers/pipe");

// wires up the following methods
var pairs = {
	/**
	 * @function can-connect/data/callbacks.gotListData gotListData
	 * @parent can-connect/data/callbacks
	 * 
	 * Called with the resolved response data 
	 * of [connection.getListData]. The result of this function will be used
	 * as the new response data. 
	 */
	getListData: "gotListData",
	//getData: "gotInstanceData",
	/**
	 * @function can-connect/data/callbacks.createdData createdData
	 * @parent can-connect/data/callbacks
	 * 
	 * Called with the resolved response data 
	 * of [connection.createData]. The result of this function will be used
	 * as the new response data. 
	 */
	createData: "createdData",
	/**
	 * @function can-connect/data/callbacks.updatedData updatedData
	 * @parent can-connect/data/callbacks
	 * 
	 * Called with the resolved response data 
	 * of [connection.updateData]. The result of this function will be used
	 * as the new response data. 
	 */
	updateData: "updatedData",
	/**
	 * @function can-connect/data/callbacks.destroyedData destroyedData
	 * @parent can-connect/data/callbacks
	 * 
	 * Called with the resolved response data 
	 * of [connection.destroyData]. The result of this function will be used
	 * as the new response data. 
	 */
	destroyData: "destroyedData"
};
var returnArg = function(item){
	return item;
};


module.exports = connect.behavior("data-callbacks",function(baseConnect){
	
	var behavior = {
	};
	
	// overwrites createData to createdData
	can.each(pairs, function(callbackName, name){
		
		behavior[name] = function(params, cid){
			return pipe(baseConnect[name].call(this, params), this, function(data){
				if(this[callbackName]) {
					return this[callbackName].call(this,data, params, cid );
				} else {
					return data;
				}
			});
		};
		
	});
	return behavior;
});