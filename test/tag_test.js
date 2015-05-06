var QUnit = require("steal-qunit"); 

var can = require("can/util/util");
require("can/map/map");
require("can/list/list");

var stache = require("can/view/stache/stache");
var superMap = require("../super-map");
var tag = require("../tag");
var fixture = require("can/util/fixture/fixture");
var template = require("./tag_test.stache!");
QUnit.module("tag")


QUnit.test("basics", function(){
	
	
	var Person = can.Map.extend({});
	Person.List = can.List.extend({Map: Person},{});
	
	var options = {
			resource: "/api/people",
			Map: Person,
			List: Person.List,
			name: "person"
	};
	var connection = superMap(options);
	options.cacheConnection.reset();
	
	tag("person-model",connection);
	
	fixture({
		"GET /api/people": function(request){
			if(request.data.type === "first") {
				return {data: [{id: 1, type: "first"},{id: 2, type: "first"}]};
			} else {
				return {data: [{id: 3, type: "second"},{id: 4, type: "second"}]};
			}
			
		}
	});
	var type = can.compute("first");
	stop();
	
	var resolvedCalls = 0;
	
	var frag = template({
		pending: function(){
			ok(true, "called pending");
		},
		resolved: function(context, el){
			resolvedCalls++;
			ok(true, "called resolved");
			if(resolvedCalls === 1) {
				ok(true, "called resolved");
				equal(el[0].childNodes[1].innerHTML, "1", "added id");
				setTimeout(function(){
					type("second");
				},1);
			} else {
				ok(true, "called resolved");
				equal(el[0].childNodes[1].innerHTML, "3", "added id");
				start();
			}
			
		},
		type: type
	});
	$("<div>").appendTo("#qunit-fixture").append(frag);
	
	
	var viewModel = can.viewModel( frag.childNodes[0] );

	
});
