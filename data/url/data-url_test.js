var QUnit = require("steal-qunit");
var fixture = require("can-fixture");
var persist = require("can-connect/data/url/");
var $ = require("jquery");

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

QUnit.test("Ajax requests should default to 'application/json' (#134)", function() {
	var connection = persist({
		url: "/api/restaurants",
		idProp: '_id',
	});

	fixture({
		"POST /api/restaurants": function(request) {
			if (typeof request.data === "object") {
				ok(true);
			} else {
				ok(false);
			}
			return request.data;
		}
	});

	stop();
	connection.createData({foo: "bar"}).then(function() {
		start();
	});
});

QUnit.test("contentType can be form-urlencoded (#134)", function() {
	var connection = persist({
		url: {
			createData: "POST /api/restaurants",
			contentType: "application/x-www-form-urlencoded"
		}
	});

	fixture({
		"POST /api/restaurants": function(request) {
			if (typeof request.data === "object") {
				ok(true);
			} else {
				ok(false);
			}
			return request.data;
		}
	});

	stop();
	connection.createData({foo: "bar"}).then(function() {
		start();
	});
});

QUnit.test("getting a real Promise back with functions", function() {
	var connection = persist({
		url: {
			getListData: function() {
				return $.get("GET /getList");
			},
			getData: function() {
				return $.get("GET /getInstance/{id}");
			}
		}
	});

	fixture({
		"GET /getList": function(){
			return [{id: 1}];
		},
		"GET /getInstance/{id}": function(){
			return {id: 2};
		}
	});

	ok(connection.getListData({foo: "bar"}).catch, 'getListData Promise has a catch method');
	ok(!connection.getListData({foo: "bar"}).fail, 'getListData Promise does not have a fail method');

	ok(connection.getData({foo: "bar", id: 2}).catch, 'getData Promise has a catch method');
	ok(!connection.getData({foo: "bar", id: 2}).fail, 'getData Promise does not have a fail method');

});

QUnit.test("getting a real Promise back with object using makeAjax", function() {
	var connection = persist({
		url: {
			getListData: {
				type: "get",
				url: "/getList"
			},
			getData: {
				type: "get",
				url: "/getList"
			}
		}
	});
	fixture({
		"GET /getList": function(){
			return [{id: 1}];
		},
		"GET /getInstance/{id}": function(){
			return {id: 2};
		}
	});

	ok(connection.getListData({foo: "bar"}).catch, 'getListData Promise has a catch method');
	ok(!connection.getListData({foo: "bar"}).fail, 'getListData Promise does not have a fail method');

	ok(connection.getData({foo: "bar", id: 2}).catch, 'getData Promise has a catch method');
	ok(!connection.getData({foo: "bar", id: 2}).fail, 'getData Promise does not have a fail method');

});

QUnit.test("getting a real Promise back with objects using makeAjax setting this.ajax", function() {
	var connection = persist({
		url: {
			getListData: {
				type: "get",
				url: "/getList"
			},
			getData: {
				type: "get",
				url: "/getList"
			}
		},
		ajax: $.ajax
	});

	fixture({
		"GET /getList": function(){
			return [{id: 1}];
		},
		"GET /getInstance/{id}": function(){
			return {id: 2};
		}
	});

	ok(connection.getListData({foo: "bar"}).catch, 'getListData Promise has a catch method');
	ok(!connection.getListData({foo: "bar"}).fail, 'getListData Promise does not have a fail method');

	ok(connection.getData({foo: "bar", id: 2}).catch, 'getData Promise has a catch method');
	ok(!connection.getData({foo: "bar", id: 2}).fail, 'getData Promise does not have a fail method');

});
