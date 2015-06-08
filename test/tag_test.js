var QUnit = require("steal-qunit"); 

var can = require("can/util/util");
require("can/map/map");
require("can/list/list");

var stache = require("can/view/stache/stache");
var superMap = require("can-connect/super-map");
var tag = require("can-connect/tag");
var fixture = require("can/util/fixture/fixture");
var findAllTemplate = require("./tag_find_all_test.stache!");
var findOneTemplate = require("./tag_find_one_test.stache!");
QUnit.module("can-connect/tag");


QUnit.test("findAll", function(){
	
	
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
	
	var frag = findAllTemplate({
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
				$("#qunit-fixture").empty();
				start();
			}
			
		},
		type: type
	});
	$("<div>").appendTo("#qunit-fixture").append(frag);
	
	
	var viewModel = can.viewModel( frag.childNodes[0] );
	
	
});


QUnit.test("findOne", function(){
	
	
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
		"GET /api/people/{id}": function(request){
			if(request.data.id === "1") {
				return {id: 1, type: "first"};
			} else {
				return {id: 2, type: "second"};
			}
			
		}
	});
	var personId = can.compute(1);
	stop();
	
	var resolvedCalls = 0;
	
	var frag = findOneTemplate({
		pending: function(){
			ok(true, "called pending");
		},
		resolved: function(context, el){
			resolvedCalls++;
			ok(true, "called resolved");
			if(resolvedCalls === 1) {
				ok(true, "called resolved");
				equal(el[0].innerHTML, "first", "added id");
				setTimeout(function(){
					personId(2);
				},1);
			} else {
				ok(true, "called resolved");
				equal(el[0].innerHTML, "second", "added id");
				$("#qunit-fixture").empty();
				start();
			}
			
		},
		personId: personId,
		rejected: function(){
			ok(false,"rejected");
			start();
		}
	});
	$("<div>").appendTo("#qunit-fixture").append(frag);
	
	
	var viewModel = can.viewModel( frag.childNodes[0] );
	
	
	
});

QUnit.test("findOne fullCache", function(){
	
	
	var Person = can.Map.extend({});
	Person.List = can.List.extend({Map: Person},{});
	
	var options = {
			resource: "/api/people",
			Map: Person,
			List: Person.List,
			name: "person"
	};
	var connection = superMap(options);
	//options.cacheConnection.reset();
	
	tag("person-model",connection);
	
	fixture({
		"GET /api/people/{id}": function(request){
			if(request.data.id === "1") {
				return {id: 1, type: "first"};
			} else {
				return {id: 2, type: "second"};
			}
			
		},
		"GET /api/people": function(request){
			return {data: [{id: 1, type: "first"},{id: 2, type: "second"}]};
		}
	});
	stop();
	
	connection.findAll({}).then(function(){

		var personId = can.compute(1);
	
	
		var resolvedCalls = 0;
		
		var frag = findOneTemplate({
			pending: function(){
				ok(true, "called pending");
			},
			resolved: function(context, el){
				resolvedCalls++;
				ok(true, "called resolved");
				if(resolvedCalls === 1) {
	
					equal(el[0].innerHTML, "first", "first id");
					setTimeout(function(){
						personId(2);
						
						setTimeout(function(){
							equal($("person-model .resolved").text(), "second", "updated id");
							$("#qunit-fixture").empty();
							start();
						},20);
						
					},1);
				} else {
					ok(false,"resolved immediately");
				}
				
			},
			personId: personId,
			rejected: function(){
				ok(false,"rejected");
				start();
			}
		}, function(e){
			ok(false,e);
			start();
		});
		
		$("<div>").appendTo("#qunit-fixture").append(frag);
		
		
		var viewModel = can.viewModel( frag.childNodes[0] );
		
	});
	
	
	
	
	
});
