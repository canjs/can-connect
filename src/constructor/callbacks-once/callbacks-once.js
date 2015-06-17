/**
 * @module can-connect/constructor/callbacks-once constructor-callbacks-once
 * @parent can-connect.behaviors
 * 
 * Glues the result of the raw `Data Interface` methods to callbacks. This is
 * useful if you want something to happen with raw data anytime raw data is requested
 * or manipulated.
 * 
 * 
 */
var connect = require("can-connect");
var sortedSetJSON = require("can-connect/helpers/sorted-set-json");

// wires up the following methods
var callbacks = [
	/**
	 * @function can-connect/data/callbacks.createdData createdData
	 * @parent can-connect/data/callbacks
	 * 
	 * Called with the resolved response data 
	 * of [connection.createData]. The result of this function will be used
	 * as the new response data. 
	 */
	"createdInstance",
	/**
	 * @function can-connect/data/callbacks.updatedData updatedData
	 * @parent can-connect/data/callbacks
	 * 
	 * Called with the resolved response data 
	 * of [connection.updateData]. The result of this function will be used
	 * as the new response data. 
	 */
	"updatedInstance",
	/**
	 * @function can-connect/data/callbacks.destroyedData destroyedData
	 * @parent can-connect/data/callbacks
	 * 
	 * Called with the resolved response data 
	 * of [connection.destroyData]. The result of this function will be used
	 * as the new response data. 
	 */
	"destroyedInstance"
];



module.exports = connect.behavior("constructor-callbacks-once",function(baseConnect){
	
	var behavior = {
	};
	
	// overwrites createData to createdData
	callbacks.forEach(function(name){
		behavior[name] = function(instance, data ){
			
			var lastSerialized = this.getInstanceMetaData(instance, "last-data");
			
			var serialize = sortedSetJSON(data),
				serialized = sortedSetJSON( this.serializeInstance( instance ) );
			if(lastSerialized !== serialize && serialized !== serialize) {
				var result =  baseConnect[name].apply(this, arguments);
				this.addInstanceMetaData(instance, "last-data", serialize);
				return result;
			}
		};
		
	});
	
	return behavior;
});