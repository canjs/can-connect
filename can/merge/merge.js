var smartMerge = require('can-connect/helpers/map-deep-merge');
var connectMap = require('can-connect/can/map/map');
var canBatch = require('can-event/batch/batch');
var connect = require("can-connect");

module.exports = connect.behavior("can/merge",function(baseConnection){
	return {
		createdInstance: function(instance, props){
			canBatch.start();
			smartMerge( instance, props );
			connectMap.callbackInstanceEvents('created', instance);
			canBatch.stop();
		},
		/**
		 * @function can-connect/can/merge/merge.updatedInstance updatedInstance
		 * @parent can-connect/can/merge/merge.instance-callbacks
		 *
		 * @description Uses [can-connect/helpers/map-deep-merge] to 
		 *
		 * Initializes the base connection and then creates and
		 * sets [can-connect/can/ref/ref.Map.Ref].
		 */
		updatedInstance: function(instance, props){
			canBatch.start();
			smartMerge( instance, props );
			connectMap.callbackInstanceEvents('updated', instance);
			canBatch.stop();
		},
		updatedList: function(list, listData){
			canBatch.start();
			smartMerge( list, listData.data );
			canBatch.stop();
		}
	}
});
