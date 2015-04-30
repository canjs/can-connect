var QUnit = require("steal-qunit");
var canSet = require("can/util/util");
var fixture = require("can/util/fixture/fixture");
var persist = require("../data-url");

QUnit.module("can-connect/persist",{
	setup: function(){
		fixture.delay = 1;
	}
});

QUnit.test("basics", function(assert){
	
	var connection = persist({},{
		findAll: "POST /findAll",
		findOne: "DELETE /findOne",
		create: "GET /create",
		update: "GET /update/{id}",
		destroy: "GET /delete/{id}",
	});
	
	fixture({
		"POST /findAll": function(){
			return [{id: 1}];
		},
		"DELETE /findOne": function(){
			return {id: 2};
		},
		"GET /create": function(){
			return {id: 3};
		},
		"GET /update/{id}": function(request){
			equal(request.data.id, 3, "update id");
			return {update: true};
		},
		"GET /delete/{id}": function(request){
			equal(request.data.id, 3, "update id");
			return {destroy: true};
		}
	});
	
	stop();
	connection.getListData({foo: "bar"}).then(function(items){
		deepEqual(items, [{id: 1}], "findAll");
		start();
	});
	
	stop();
	connection.getInstanceData({foo: "bar"}).then(function(data){
		deepEqual(data, {id: 2}, "findOne");
		start();
	});
	
	stop();
	connection.createInstanceData({foo: "bar"}).then(function(data){
		deepEqual(data, {id: 3}, "create");
		start();
	});
	
	stop();
	connection.destroyInstanceData({foo: "bar", id: 3}).then(function(data){
		deepEqual(data, {destroy: true}, "update");
		start();
	});
	
});
