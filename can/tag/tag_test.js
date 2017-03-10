var QUnit = require("steal-qunit");

var CanMap = require("can-map");
var CanList = require("can-list");
var compute = require("can-compute");

var $ = require("jquery");
var superMap = require("can-connect/can/super-map/");
var tag = require("can-connect/can/tag/");
var fixture = require("can-fixture");
var findAllTemplate = require("./tag_find_all_test.stache!");
var findOneTemplate = require("./tag_find_one_test.stache!");

require("can-util/dom/events/inserted/inserted");

QUnit.module("can-connect/can/tag");


QUnit.test("getList", function(){


	var Person = CanMap.extend({});
	Person.List = CanList.extend({Map: Person},{});

	var options = {
			url: "/api/people",
			Map: Person,
			List: Person.List,
			name: "person"
	};
	var connection = superMap(options);
	options.cacheConnection.clear();

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
	var type = compute("first");
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
				equal(el.childNodes[1].innerHTML, "1", "added id");
				setTimeout(function(){
					type("second");
				},1);
			} else {
				ok(true, "called resolved");
				equal(el.childNodes[1].innerHTML, "3", "added id");
				$("#qunit-fixture").empty();
				start();
			}

		},
		type: type
	});
	$("<div>").appendTo("#qunit-fixture").append(frag);
});


QUnit.test("get", function(){


	var Person = CanMap.extend({});
	Person.List = CanList.extend({Map: Person},{});

	var options = {
			url: "/api/people",
			Map: Person,
			List: Person.List,
			name: "person"
	};
	var connection = superMap(options);
	options.cacheConnection.clear();

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
	var personId = compute(1);
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
				equal(el.innerHTML, "first", "added id");
				setTimeout(function(){
					personId(2);
				},1);
			} else {
				ok(true, "called resolved");
				equal(el.innerHTML, "second", "added id");
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
});

if(System.env !== 'canjs-test') {
	// Brittle in IE
	QUnit.test("get fullCache", function(assert){
		var done = assert.async();
		var resolvedCalls = 0;

		var Person = CanMap.extend({});
		Person.List = CanList.extend({Map: Person},{});

		var options = {
				url: "/api/people",
				Map: Person,
				List: Person.List,
				name: "person"
		};
		var connection = superMap(options);
		connection.cacheConnection.clear();

		tag("person-model",connection);

		fixture({
			"GET /api/people/{id}": function(request){

				if(request.data.id === "1") {
					ok(resolvedCalls >= 1, "got data we already resolved from cache");
					return {id: 1, type: "first"};
				} else {
					ok(resolvedCalls >= 2, "got data we already resolved from cache");
					setTimeout(function(){
						done();
					}, 100);
					return {id: 2, type: "second"};
				}

			},
			"GET /api/people": function(request){
				return {data: [{id: 1, type: "first"},{id: 2, type: "second"}]};
			}
		});

		connection.getList({}).then(function(){

			var personId = compute(1);


			var frag = findOneTemplate({
				pending: function(){
					ok(true, "called pending");
				},
				resolved: function(context, el){
					resolvedCalls++;
					ok(true, "called resolved");
					if(resolvedCalls === 1) {

						equal(el.innerHTML, "first", "first id");
						setTimeout(function(){
							personId(2);

							setTimeout(function(){
								equal($("person-model .resolved").text(), "second", "updated id");
								$("#qunit-fixture").empty();
							},20);

						},1);
					} else {
						ok(true,"not called immediately, because .then cant be with Promises");
					}

				},
				personId: personId,
				rejected: function(){
					ok(false,"rejected");
					start();
				}
			});

			$("<div>").appendTo("#qunit-fixture").append(frag);
		});
	});
}
