var getItems = require("./helpers/get-items");
var can = require("can/util/util");
var connect = require("can-connect");
var canSet = require("can-set");

var sortedSetJSON = require("./helpers/sorted-set-json");

/**
 * @module can-connect/fall-through-cache
 * 
 * A fall through cache that checks another `cacheConnection`.
 * 
 */
module.exports = connect.behavior("fall-through-cache",function(baseConnect){

	var behavior = {
		// overwrite makeList calls
		// so we can know the list that was made
		makeList: function(listData, set){
			set = set || this.listSet(listData);
			var id = sortedSetJSON( set );
			var list = baseConnect.makeList.call(this, listData, set);
			
			if(this._getMakeListCallbacks[id]) {
				this._getMakeListCallbacks[id].shift()(list);
				if(!this._getMakeListCallbacks[id].length){
					delete this._getMakeListCallbacks[id]
				}
			}
			return list;
		},
		_getMakeListCallbacks: {},
		_getMakeList: function(set, callback){
			var id = sortedSetJSON( set );
			if(!this._getMakeListCallbacks[id]) {
				this._getMakeListCallbacks[id]= []
			}
			this._getMakeListCallbacks[id].push(callback);
		},
		_ignoreUpdateObjects: {},
		ignoreNextUpdatedWith: function(instance, data){
			var id = this.id(instance);
			if(!this._ignoreUpdateObjects[id]) {
				this._ignoreUpdateObjects[id] = [];
			}
			this._ignoreUpdateObjects[id].push(data);
		},
		updatedInstance: function(instance, data){
			var id = this.id(instance);
			var updateObjects = this._ignoreUpdateObjects[id];
			if(updateObjects) {
				var index = updateObjects.indexOf(data);
				if(index >= 0) {
					updateObjects.splice(index, 1);
					if(!updateObjects.length) {
						delete this._ignoreUpdateObjects[id];
					}
					// DO NOTHING!
					return;
				}
			}
			return baseConnect.updatedInstance.apply(this, arguments);
		},
		// if we do findAll, the cacheConnection runs on
		// if we do getListData, ... we need to register the list that is going to be created
		// so that when the data is returned, it updates this
		getListData: function(params){
			// first, always check the cache connection
			var self = this;
			return this.cacheConnection.getListData(params).then(function(data){
				
				// get the list that is going to be made
				// it might be possible that this never gets called, but not right now
				
				
				self._getMakeList(params, function(list){
					self.addListReference(list, params);
					
					setTimeout(function(){
						baseConnect.getListData.call(self, params).then(function(listData){
							
							self.cacheConnection.updateListData(listData, params);
							self.updatedList(list, listData, params);
							self.deleteListReference(list, params);
							
						}, function(){
							// what do we do here?  self.rejectedUpdatedList ?
							console.log("REJECTED", e);
						});
					},1);
				});
				// TODO: if we wired up all responses to updateListData, this one should not
				// updateListData with itself.
				// But, how would we do a bypass?
				return data;
			}, function(){
				var listData = baseConnect.getListData.call(self, params);
				listData.then(function(listData){
					self.cacheConnection.updateListData(listData, params);
				});
				
				return listData;
			});
		},
		makeInstance: function(props){

			var id = this.id( props );
			var instance = baseConnect.makeInstance.apply(this, arguments);
			
			if(this._getMakeInstanceCallbacks[id]) {
				this._getMakeInstanceCallbacks[id].shift()(instance);
				if(!this._getMakeInstanceCallbacks[id].length){
					delete this._getMakeInstanceCallbacks[id]
				}
			}
			return instance;
		},
		_getMakeInstanceCallbacks: {},
		_getMakeInstance: function(id, callback){
			if(!this._getMakeInstanceCallbacks[id]) {
				this._getMakeInstanceCallbacks[id]= [];
			}
			this._getMakeInstanceCallbacks[id].push(callback);
		},
		getInstanceData: function(params){
			// first, always check the cache connection
			var self = this;
			return this.cacheConnection.getInstanceData(params).then(function(instanceData){
				
				// get the list that is going to be made
				// it might be possible that this never gets called, but not right now
				self._getMakeInstance(self.id(instanceData) || self.id(params), function(instance){
					self.addInstanceReference(instance);
				
					setTimeout(function(){
						baseConnect.getInstanceData.call(self, params).then(function(instanceData2){
							
							self.cacheConnection.updateInstanceData(instanceData2);
							self.updatedInstance(instance, instanceData2);
							self.deleteInstanceReference(instance);
							
						}, function(){
							// what do we do here?  self.rejectedUpdatedList ?
							console.log("REJECTED", e);
						});
					},1);
				});

				return instanceData;
			}, function(){
				var listData = baseConnect.getInstanceData.call(self, params);
				listData.then(function(instanceData){
					self.cacheConnection.updateInstanceData(instanceData);
				});
				
				return listData;
			});
		}
		
	};
	
	return behavior;
	
});


