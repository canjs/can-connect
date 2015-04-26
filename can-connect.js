var can = require("can/util/util");

// whatever order they are given ... add them all in order
var connect = function(behaviors, options){
	behaviors = behaviors.slice(0);
	var behavior = {};
	can.each(connect.order, function(name){
		if(behaviors.indexOf(name) >= 0) {
			var behave = behaviorsMap[name];
			if(behave) {
				behavior = behave(behavior, options);
			}
		}
	});
	return behavior;
};

connect.order = ["rest","persist","parse-data","cache-requests","combine-requests","constructor","instance-store"];

connect.behavior = function(name, behavior){
	if(typeof name !== "string") {
		behavior = name;
		name = undefined;
	}
	var behaviorMixin = function(base){
		// basically Object.create
		var Behavior = function(){};
		Behavior.prototype = base;
		var newBehavior = new Behavior;
		var res = behavior.apply(newBehavior, arguments);
		can.simpleExtend(newBehavior, res);
		return newBehavior;
	};
	if(name) {
		behaviorMixin.name = name;
		behaviorsMap[name] = behaviorMixin;
	}
	
	return behaviorMixin;
};

var behaviorsMap = {};

module.exports = connect;