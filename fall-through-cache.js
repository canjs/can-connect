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
module.exports = connect.behavior("fall-through-cache",function(baseConnect, options){

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
		// if we do findAll, the cacheConnection runs on
		// if we do getListData, ... we need to register the list that is going to be created
		// so that when the data is returned, it updates this
		getListData: function(params){
			// first, always check the cache connection
			var self = this;
			return options.cacheConnection.getListData(params).then(function(data){
				
				// get the list that is going to be made
				// it might be possible that this never gets called, but not right now
				self._getMakeList(params, function(list){
					setTimeout(function(){
						baseConnect.getListData.call(self, params).then(function(listData){
							
							options.cacheConnection.updateListData(listData, params);
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
					options.cacheConnection.updateListData(listData, params);
				});
				
				return listData;
			});
		}
		
	};
	
	return behavior;
	
});


