var can = require("can/util/util");
var idMerge = require("./helpers/id-merge");
/**
 * 
 * @param {Array<String,Behavior,function>} behaviors - An array of behavior names or custom behaviors.
 * The order of named execution gets run in order.  
 * @param {Object} options
 */
var connect = function(behaviors, options){
	behaviors = behaviors.map(function(behavior, index){
		var sortedIndex;
		if(typeof behavior === "string") {
			sortedIndex = connect.order.indexOf(behavior);
			behavior = behaviorsMap[behavior];
		} else if(behavior.isBehavior) {
			
		} else {
			behavior = connect.behavior(behavior);
		}
		
		return {
			originalIndex: index,
			sortedIndex: sortedIndex,
			behavior: behavior
		};
	})
		.sort(function(b1, b2){
			// if both have a sorted index
			if(b1.sortedIndex != null && b2.sortedIndex != null) {
				return b1.sortedIndex - b2.sortedIndex;
			}
			return b1.originalIndex - b2.originalIndex;
		}).map(function(b){
			return b.behavior;
		});
	
	var behavior = core({},options);
	
	behaviors.forEach(function(behave){
		behavior = behave(behavior, options);
	});
	if(behavior.init) {
		behavior.init();
	}
	return behavior;
};

connect.order = ["data-localstorage-cache","data-url","data-parse","cache-requests","data-combine-requests",
	
	"constructor","constructor-store","constructor-map",
	"fall-through-cache","data-callbacks",
	];

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
		newBehavior.__name = name;
		return newBehavior;
	};
	if(name) {
		behaviorMixin.name = name;
		behaviorsMap[name] = behaviorMixin;
	}
	behaviorMixin.isBehavior = true;
	return behaviorMixin;
};

var behaviorsMap = {};

var core = connect.behavior("base",function(base, options){
	return {
		id: function(instance){
			return instance[options.id || this.idProp || "id"];
		},
		idProp: "id",
		listSet: function(list){
			return list[this.listSetProp];
		},
		listSetProp: "__set",
		updatedList: function(list, listData, set) {
			// This only works with "referenced" instances because it will not
			// update and assume the instance is already updated
			// this could be overwritten so that if the ids match, then a merge of properties takes place
			idMerge(list, listData.data, can.proxy(this.id, this), can.proxy(this.makeInstance, this));
		},
		init: function(){}
	};
});

connect.base = core;



module.exports = connect;