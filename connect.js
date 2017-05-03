var assign = require("can-util/js/assign/assign");
var each = require("can-util/js/each/each");
var CID = require("can-cid");
/**
 *
 * @param {Array<String,Behavior,function>} behaviors - An array of behavior names or custom behaviors.
 * The order of named execution gets run in order.
 * @param {Object} options
 */
var connect = function(behaviors, options){
	var i, behavior, scores = {};
	behaviors = behaviors.slice(0);
	for (i = 0; i < behaviors.length; i++) {
		behavior = behaviors[i];
		if(typeof behavior === "string") {
			behavior = behaviorsMap[behavior];
		} else if(!behavior.isBehavior) {
			behavior = connect.behavior(behavior);
		}

		//  Make sure required dependencies are found.
		each(behavior.dependencies, function(level, dep) {
			if(typeof dep === "string") {
				dep = behaviorsMap[dep];
			}
			if(dep &&
				(level === "required:base" || level === "required:derived") &&
				behaviors.indexOf(dep) === -1 &&
				behaviors.indexOf(dep.behaviorName) === -1
			) {
				behaviors.push(dep);
			}
		});
		behaviors[i] = behavior;
		// give everything an initial score based on its order
		scores[behavior.behaviorName] = i;
	}

	var updated;
	do {
		updated = false;
		each(behaviors, function(behavior) {
			each(behavior.dependencies, function(direction, dep) {
				if(typeof dep === "string") {
					dep = behaviorsMap[dep];
				}
				if(direction === "required:base" || direction === "base") {
					if(scores[behavior.behaviorName] <= scores[dep.behaviorName]) {
						updated = true;
						scores[behavior.behaviorName] = scores[dep.behaviorName] + 1;
					}
				} else if(direction === "required:derived" || direction === "derived") {
					if(scores[behavior.behaviorName] >= scores[dep.behaviorName]) {
						updated = true;
						scores[dep.behaviorName] = scores[behavior.behaviorName] + 1;
					}
				}
			});
		});

	} while(updated);
	behaviors.sort(function(a, b) {
		return scores[a.behaviorName] > scores[b.behaviorName] ? 1 : -1;
	});

	// set up a base behavior
	behavior = connect.base( connect.behavior("options",function(){ return options; })() );

	// then add all of the others in score order
	behaviors.forEach(function(behave){
		behavior = behave(behavior);
	});
	if(behavior.init) {
		behavior.init();
	}
	return behavior;
};

// connect.order = ["data/localstorage-cache","data/url","data/parse","cache-requests","data/combine-requests",

//         "constructor","constructor/store","can/map","can/ref",
//         "fall-through-cache",

//         "data/worker","real-time",

/*, {
	"data/localstorage-cache": "base",
	"data/url": "base",
	"data/parse": "base",
	"cache-requests": "base",
	"data/combine-requests": "base",
	"constructor": "base",
	"constructor/store": "base",
	"can/map": "base",
	"can/ref": "base",
	"fall-through-cache": "base"
	"data/worker": "base",
	"real-time": "base"
}*/

//         "data/callbacks-cache","data/callbacks","constructor/callbacks-once"
//         ];

connect.behavior = function(name, behavior, dependencies){
    if(typeof name !== "string") {
		dependencies = behavior;
        behavior = name;
        name = CID({}, "behavior");
    }
    var behaviorMixin = function(base){
        // basically Object.create
        var Behavior = function(){};
        Behavior.name = name;
        Behavior.prototype = base;
        var newBehavior = new Behavior();
        // allows behaviors to be a simple object, not always a function
        var res = typeof behavior === "function" ? behavior.apply(newBehavior, arguments) : behavior;
        assign(newBehavior, res);
        newBehavior.__behaviorName = name;
        return newBehavior;
    };
    if(name) {
        behaviorMixin.behaviorName = name;
        behaviorsMap[name] = behaviorMixin;
    }
    behaviorMixin.isBehavior = true;
    behaviorMixin.dependencies = dependencies;
    return behaviorMixin;
};

var behaviorsMap = {};

module.exports= connect;
