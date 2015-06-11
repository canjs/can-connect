var can = require("can/util/util");
var connect = require("can-connect");
var pipe = require("can-connect/helpers/pipe");

// wires up the following methods
var pairs = {
	getListData: "gotListData",
	//getData: "gotInstanceData",
	createData: "createdInstanceData",
	updateData: "updatedInstanceData",
	destroyData: "destroyedInstanceData"
};
var returnArg = function(item){
	return item;
};

/**
 * @module can-connect/data-callbacks data-callbacks
 * @parent can-connect.modules
 * 
 * Glues the result of the raw `CRUD Methods` to callbacks.
 */
module.exports = connect.behavior("data-callbacks",function(baseConnect){
	
	var behavior = {
	};
	
	// overwrites createData to createdInstanceData
	can.each(pairs, function(callbackName, name){
		
		behavior[name] = function(params, cid){
			return pipe(baseConnect[name].call(this, params), this, function(data){
				if(this[callbackName]) {
					return this[callbackName].call(this,data, params, cid );
				} else {
					return data;
				}
			});
		};
		
	});
	return behavior;
});