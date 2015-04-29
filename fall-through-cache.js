var getItems = require("./helpers/get-items");
var can = require("can/util/util");
var connect = require("can-connect");
var canSet = require("can-set");


/**
 * @module can-connect/fall-through-cache
 * 
 * A fall through cache that checks another `cacheConnection`.
 * 
 */
module.exports = connect.behavior("fall-through-cache",function(baseConnect, options){

	var behavior = {
		findAll: function(params){
			// first, always check the cache connection
			var self = this;
			return options.cacheConnection.getListData(params).then(function(data){
				// if the cache returned, get it to the user right away
				var list = self.makeInstances(data);
				
				// in the back ground, try to update it
				setTimeout(function(){
					self.getListData(params).then(function(listData){
						options.cacheConnection.updateListData(params, listData);
						self.updatedList(list, listData.data);
					}, function(){
						// what do we do here?  self.rejectedUpdatedList ?
						console.log("REJECTED", e);
					});
				},1);
				
				
				return list;
			}, function(){
				var listData = self.getListData(params);
				listData.then(function(listData){
					options.cacheConnection.updateListData(params, listData);
				});
				var list = listData.then(function(listData){
					return self.makeInstances(listData);
				});
				
				return list;
			});
		}
		
	};
	
	return behavior;
	
});


