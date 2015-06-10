
var can = require("can/util/util");
var connect = require("can-connect");
var WeakReferenceMap = require("./helpers/weak-reference-map");
var sortedSetJSON = require("./helpers/sorted-set-json");
/**
 * @module can-connect/constructor-store constructor-store
 * @parent can-connect.modules
 * 
 * Connect CRUD methods to a constructor function.
 * 
 * Consumes:
 * 
 * - getListData, getData, createData, updateData, destroyData
 * 
 * Produces:
 * 
 * - getList, getInstance, save, destroy, id, createdInstance, updatedInstance
 * 
 * @param {{}} options
 * 
 *   @option {function} instance
 *   @option {function} list
 *   @option {String} id
 */
module.exports = connect.behavior("constructor-store",function(baseConnect){
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
		instanceStore: new WeakReferenceMap(),
		listStore: new WeakReferenceMap(),
		_requestInstances: {},
		_requestLists: {},
		_pendingRequests: 0,
		_finishedRequest: function(){
			this._pendingRequests--;
			if(this._pendingRequests === 0) {
				for(var id in this._requestInstances) {
					this.instanceStore.deleteReference(id);
				}
				this._requestInstances = {};
				for(var id in this._requestLists) {
					this.listStore.deleteReference(id);
				}
				this._requestLists = {};
			}
		},
		
		addInstanceReference: function(instance) {
			this.instanceStore.addReference( this.id(instance), instance );
		},
		deleteInstanceReference: function(instance) {
			this.instanceStore.deleteReference( this.id(instance), instance );
		},
		addListReference: function(list, set) {
			var id = sortedSetJSON( set || this.listSet(list) );
			this.listStore.addReference( id, list );
		},
		deleteListReference: function(list, set) {
			var id = sortedSetJSON( set || this.listSet(list) );
			this.listStore.deleteReference( id, list );
		},
		
		// Called whenever an instance is made.
		madeInstance: function(instance){
			if( this._pendingRequests > 0) {
				var id = this.id(instance);
				if(! this._requestInstances[id] ) {
					this.addInstanceReference(instance);
					this._requestInstances[id] = instance;
				}
				
			}
		},
		// Overwrites makeInstance so it looks in the store and calls madeInstance.
		makeInstance: function(props){
			var id = this.id(props);
			if((id || id === 0) && this.instanceStore.has(id) ) {
				var storeInstance = this.instanceStore.get(id);
				// TODO: find a way to prevent this from being called so many times.
				this.updatedInstance(storeInstance, props);
				return storeInstance;
			}
			var instance = baseConnect.makeInstance.call(this, props);
			this.madeInstance(instance);
			return instance;
		},
		
		madeList: function(list, set){
			if( this._pendingRequests > 0) {
				var id = sortedSetJSON( set || this.listSet(list) );
				if(id) {
					if(! this._requestLists[id] ) {
						this.addListReference(list, set);
						this._requestLists[id] = list;
					}
				}
				
				
			}
		},
		makeList: function(listData, set){
			set = set || this.listSet(listData);
			var id = sortedSetJSON( set );
			
			if( id && this.listStore.has(id) ) {
				var storeList = this.listStore.get(id);
				this.updatedList(storeList, listData, set);
				return storeList;
			}
			var list = baseConnect.makeList.call(this, listData, set);
			this.madeList(list, set);
			return list;
		},
		
		getList: function(params) {
			var self = this;
			self._pendingRequests++;
			var promise = baseConnect.getList.call(this, params);
			
			promise.then(function(instances){
				self._finishedRequest();
			}, function(){
				self._finishedRequest();
			});
			return promise;
		},
		get: function(params) {
			var self = this;
			self._pendingRequests++;
			var promise = baseConnect.get.call(this, params);
			
			promise.then(function(instance){
				self._finishedRequest();
			}, function(){
				self._finishedRequest();
			});
			return promise;
			
		},
		save: function(instance) {
			var self = this;
			self._pendingRequests++;
			
			var updating = !this.isNew(instance);
			if(updating) {
				this.addInstanceReference(instance);
			}
			
			var promise = baseConnect.save.call(this, instance);
			
			promise.then(function(instances){
				if(updating) {
					self.deleteInstanceReference(instance);
				}
				self._finishedRequest();
			}, function(){
				self._finishedRequest();
			});
			return promise;
		},
		destroy: function(instance) {
			var self = this;
			self._pendingRequests++;
			var promise = baseConnect.destroy.call(this, instance);
			
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


