/**
 * @module {function} can-connect/constructor/callbacks-once/callbacks-once
 * @parent can-connect.behaviors
 *
 * Prevents unecessary calls to the instance callback methods.
 *
 * @signature `constructorCallbacksOnce( baseConnection )`
 *
 *   Prevents duplicate calls to the instance callback methods by tracking
 *   the last data the methods were called with.  If called with the
 *   same data again, it does not call the base connection's instance callback.
 *
 *
 */
var connect = require("can-connect");
var sortedSetJSON = require("can-connect/helpers/sorted-set-json");
var forEach = [].forEach;

// wires up the following methods
var callbacks = [
	/**
	 * @function can-connect/constructor/callbacks-once/callbacks-once.createdData createdData
	 * @parent can-connect/constructor/callbacks-once/callbacks-once
	 *
	 * Called with the resolved response data
	 * of [can-connect/connection.createData]. The result of this function will be used
	 * as the new response data.
	 */
	"createdInstance",
	/**
	 * @function can-connect/constructor/callbacks-once/callbacks-once.updatedData updatedData
	 * @parent can-connect/constructor/callbacks-once/callbacks-once
	 *
	 * Called with the resolved response data
	 * of [can-connect/connection.updateData]. The result of this function will be used
	 * as the new response data.
	 */
	"updatedInstance",
	/**
	 * @function can-connect/constructor/callbacks-once/callbacks-once.destroyedData destroyedData
	 * @parent can-connect/constructor/callbacks-once/callbacks-once
	 *
	 * Called with the resolved response data
	 * of [can-connect/connection.destroyData]. The result of this function will be used
	 * as the new response data.
	 */
	"destroyedInstance"
];



module.exports = connect.behavior("constructor/callbacks-once",function(baseConnection){

	var behavior = {
	};

	// overwrites createData to createdData
	forEach.call(callbacks, function(name){
		behavior[name] = function(instance, data ){

			var lastSerialized = this.getInstanceMetaData(instance, "last-data-" + name);

			var serialize = sortedSetJSON(data);
			if(lastSerialized !== serialize) {
				var result =  baseConnection[name].apply(this, arguments);
				this.addInstanceMetaData(instance, "last-data-" + name, serialize);
				return result;
			}
		};

	});

	return behavior;
});
