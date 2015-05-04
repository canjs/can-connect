var can = require("can/util/util");
var connect = require("can-connect");
var pipe = require("./helpers/pipe");
var idMerge = require("./helpers/id-merge");

// wires up the following methods
var pairs = {
	createdInstanceData: "createInstanceData",
	updatedInstanceData: "updateInstanceData",
	destroyedInstanceData: "destroyInstanceData",
	//gotInstanceData: "updateListData"
};
var returnArg = function(item){
	return item;
};

module.exports = connect.behavior("data-callbacks-cache",function(baseConnect, options){
	
	var behavior = {
		//gotListData: returnArg,
		//gotInstanceData: returnArg,
	};
	
	can.each(pairs, function(cacheCallback, dataCallbackName){
		behavior[dataCallbackName] = function(data, set, cid){

			// update the data in the cache
			options.cacheConnection[cacheCallback]( can.simpleExtend({}, data) );
			
			return baseConnect[dataCallbackName].call(this,  data, set, cid);
		};
	});
	return behavior;
});