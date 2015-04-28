
var can = require("can/util/util");
var connect = require("can-connect");

/**
 * @module can-connect/constructor
 * 
 * Connect CRUD methods to a constructor function.
 * 
 * Consumes:
 * 
 * - getListData, getInstanceData, createInstanceData, updateInstanceData, destroyInstanceData
 * 
 * Produces:
 * 
 * - findAll, findOne, save, destroy, id, createdInstance, updatedInstance
 * 
 * @param {{}} options
 * 
 *   @option {function} instance
 *   @option {function} list
 *   @option {String} id
 */
module.exports = connect.behavior("instance-store",function(baseConnect, options){
	// - when an instance is created, and there are requests, add to the store
	// - this might need to be done by the framework
	// - need a hook for when an instance is created outside 
	// - of this loop ... or possibly if an ID is added
	// 
	// - add b/c a request might be going ... all instances should go through this
	// - add b/c it is observed
	//
	// - when an id property is added and we are binding
	// - looked up by `makeInstance`
	var behavior = {
		/**
		 * When an instance is observed ... put in the store.  This counts.
		 * @param {Object} instance
		 */
		observedInstance: function(instance) {
			var data = this._addInstance(instance);
			if(data) {
				data.observedCount++;
			}
		},
		// {ID: {instance: INSTANCE, observedCount: COUNT}}
		instanceStore: {},
		unobservedInstance: function(instance) {
			var id = this.id(instance);
			var data = this.instanceStore[id];
			if(data) {
				data.observedCount--;
				if( data.observedCount === 0 && this._pendingRequests === 0 ) {
					delete this.instanceStore[id];
				}
			}
		},
		_addInstance: function(instance){
			var id = this.id(instance);
			if(id != undefined) {
				var data = this.instanceStore[id];
				if( !data ) {
					return this.instanceStore[id] = {instance: instance, observedCount: 0};
				} else {
					return data;
				}
			}
		},
		/**
		 * Called whenever an instance is made.
		 * @param {Object} instance
		 */
		madeInstance: function(instance){
			if( this._pendingRequests > 0) {
				this._addInstance(instance);
			}
		},
		/**
		 * Overwrites makeInstance so it looks in the store and calls madeInstance.
		 * @param {Object} props
		 * @param {Object} options
		 */
		makeInstance: function(props, options){
			var id = this.id(props);
			if((id || id === 0) && this.instanceStore[id]) {
				var storeInstance = this.instanceStore[id].instance;
				this.updatedInstance(storeInstance, props);
				return storeInstance;
			}
			var instance = baseConnect.makeInstance.call(this, props, options);
			this.madeInstance(instance);
			return instance;
		},
		_pendingRequests: 0,
		_finishedRequest: function(){
			this._pendingRequests--;
			if(this._pendingRequests === 0) {
				for(var id in this.instanceStore) {
					if( this.instanceStore[id].observedCount === 0 ) {
						delete this.instanceStore[id];
					}
				}
			}
		},
		findAll: function(params) {
			var self = this;
			self._pendingRequests++;
			var promise = baseConnect.findAll.call(this, params);
			
			promise.then(function(instances){
				self._finishedRequest();
			}, function(){
				self._finishedRequest();
			});
			return promise;
		},
		findOne: function(params) {
			var self = this;
			self._pendingRequests++;
			var promise = baseConnect.findOne.call(this, params);
			
			promise.then(function(instance){
				self._finishedRequest();
			}, function(){
				self._finishedRequest();
			});
			return promise;
			
		}
	};
	
	return behavior;
	
});


