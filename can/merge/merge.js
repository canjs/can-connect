var smartMerge = require('can-connect/helpers/map-deep-merge');
var connectMap = require('can-connect/can/map/map');
var canBatch = require('can-event/batch/batch');
var connect = require("can-connect");

module.exports = connect.behavior("can/merge",function(baseConnection){
	return {
		/**
		 * @function can-connect/can/merge/merge.createdInstance createdInstance
		 * @parent can-connect/can/merge/merge.instance-callbacks
		 *
		 * @description Makes minimal updates to an instance's properties and
		 * its nested properties using [can-connect/helpers/map-deep-merge].
		 *
		 * @signature `connection.createdInstance(instance, props)`
		 *
		 *   Calls `mapDeepMerge` and triggers the `'created'` event on the instance
		 *   within a [can-event/batch/batch batch].
		 *
		 *   @param {can-connect/Instance} instance The instance that was just created whose
		 *   properties will be updated.
		 *   @param {Object} props The new data the instance and children of the
		 *   instance should be updated to look like.
		 */
		createdInstance: function(instance, props){
			canBatch.start();
			smartMerge( instance, props );
			connectMap.callbackInstanceEvents('created', instance);
			canBatch.stop();
		},
		/**
		 * @function can-connect/can/merge/merge.destroyedInstance destroyedInstance
		 * @parent can-connect/can/merge/merge.instance-callbacks
		 *
		 * @description Makes minimal updates to an instance's properties and
		 * its nested properties using [can-connect/helpers/map-deep-merge].
		 *
		 * @signature `connection.destroyedInstance(instance, props)`
		 *
		 *   Calls `mapDeepMerge` and triggers the `'destroyed'` event on the instance
		 *   within a [can-event/batch/batch batch].
		 *
		 *   @param {can-connect/Instance} instance The instance that was just destroyed whose
		 *   properties will be updated.
		 *   @param {Object} props The new data the instance and children of the
		 *   instance should be updated to look like.
		 */
		destroyedInstance: function(instance, props){
			canBatch.start();
			smartMerge( instance, props );
			connectMap.callbackInstanceEvents('destroyed', instance);
			canBatch.stop();
		},
		/**
		 * @function can-connect/can/merge/merge.updatedInstance updatedInstance
		 * @parent can-connect/can/merge/merge.instance-callbacks
		 *
		 * @description Makes minimal updates to an instance's properties and
		 * its nested properties using [can-connect/helpers/map-deep-merge].
		 *
		 * @signature `connection.updatedInstance(instance, props)`
		 *
		 *   Calls `mapDeepMerge` and triggers the `'updated'` event on the instance
		 *   within a [can-event/batch/batch batch].
		 *
		 *   @param {can-connect/Instance} instance The instance that was just updated whose
		 *   properties will be updated.
		 *   @param {Object} props The new data the instance and children of the
		 *   instance should be updated to look like.
		 */
		updatedInstance: function(instance, props){
			canBatch.start();
			smartMerge( instance, props );
			connectMap.callbackInstanceEvents('updated', instance);
			canBatch.stop();
		},
		/**
		 * @function can-connect/can/merge/merge.updatedList updatedList
		 * @parent can-connect/can/merge/merge.instance-callbacks
		 *
		 * @description Makes minimal updates to an list's items and
		 * those items' nested properties using [can-connect/helpers/map-deep-merge].
		 *
		 * @signature `connection.updatedList(list, listData)`
		 *
		 *   Calls `mapDeepMerge` on the list
		 *   within a [can-event/batch/batch batch].
		 *
		 *   @param {can-connect.List} list The list that will be updated.
		 *   @param {can-connect.listData} listData The new data the list and items in the
		 *   list should be updated to look like.
		 */
		updatedList: function(list, listData){
			canBatch.start();
			smartMerge( list, listData.data );
			canBatch.stop();
		}
	};
});
