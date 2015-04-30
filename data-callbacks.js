var can = require("can/util/util");
var connect = require("can-connect");

// wires up the following methods
var pairs = {
	getListData: "gotListData",
	getInstanceData: "gotInstanceData",
	createInstanceData: "createdInstanceData",
	updateInstanceData: "updatedInstanceData",
	destroyInstanceData: "destroyedInstanceData"
};
var returnArg = function(item){
	return item;
};

module.exports = connect.behavior("data-callbacks",function(baseConnect, options){
	
	var behavior = {
		gotListData: returnArg,
		gotInstanceData: returnArg,
		createdInstanceData: returnArg,
		updatedInstanceData: returnArg,
		destroyedInstanceData: returnArg
	};
	
	can.each(pairs, function(parseFunction, name){
		behavior[name] = function(params){
			return pipe(baseConnect[name].call(this, params), this, function(){
				return this[parseFunction].apply(this, arguments);
			});
		};
	});

});