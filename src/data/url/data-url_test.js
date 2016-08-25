var QUnit = require("steal-qunit");
var fixture = require("can-fixture");
var persist = require("can-connect/data/url/");

QUnit.module("can-connect/data/url",{
	setup: function(){
		fixture.delay = 1;
	}
});

QUnit.test("basics", function(assert){

	var connection = persist({
		url: {
			getListData: "POST /getList",
			getData: "DELETE /getInstance",
			createData: "GET /create",
			updateData: "GET /update/{id}",
			destroyData: "GET /delete/{id}"
		}
	});

	fixture({
		"POST /getList": function(){
			return [{id: 1}];
		},
		"DELETE /getInstance": function(){
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
		deepEqual(items, [{id: 1}], "getList");
		start();
	});

	stop();
	connection.getData({foo: "bar"}).then(function(data){
		deepEqual(data, {id: 2}, "getInstance");
		start();
	});

	stop();
	connection.createData({foo: "bar"}).then(function(data){
		deepEqual(data, {id: 3}, "create");
		start();
	});

	stop();
	connection.destroyData({foo: "bar", id: 3}).then(function(data){
		deepEqual(data, {destroy: true}, "update");
		start();
	});

});

QUnit.test('idProp is not part of the parameters', function() {
	var connection = persist({
		idProp: 'id',
		url: "api/todos/"
	});

	fixture({
		"GET api/todos/2": function (req) {
			ok(!req.data.id);
			deepEqual(req.data, {other: 'prop'});
			return [{id: 1}];
		}
	});

	stop();
	connection.getData({id: 2, other: 'prop'}).then(function() {
		start();
	});

});

QUnit.test("destroyData()", function(){
	var connection = persist({
		idProp: "id",
		url: "/api/todos"
	});

	fixture("DELETE /api/todos/3", function(req) {
		notEqual(req.data.other, "prop", "don't include it");
		return {};
	});

	stop();
	connection.destroyData({ id: 3, other: "prop" }).then(function(){
		start();
	});
});
