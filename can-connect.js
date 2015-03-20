var can = require("can/util/util");

var connect = function(){
	
};


connect.behavior = function(behavior){
	return function(base){
		// basically Object.create
		var Behavior = function(){};
		Behavior.protoype = base;
		var newBehavior = new Behavior;
		var res = behavior.apply(newBehavior, arguments);
		can.simpleExtend(newBehavior, res);
		return newBehavior;
	};
};

module.exports = connect;