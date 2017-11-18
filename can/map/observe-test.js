var observe = require("can-observe");
var QUnit = require("steal-qunit");

QUnit.module("can-connect/can/map/map with can-observe",{});

require("./test-real-time-super-model")(function(){
	return {Todo: observe.makeMapType("Todo",{},{}), TodoList: observe.makeListType("TodoList",{},{})};
});
