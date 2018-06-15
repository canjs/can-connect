var QUnit = require("steal-qunit");
var fixture = require("can-fixture");
var persist = require("./url");
var $ = require("jquery");
var set = require("can-set-legacy");
var QueryLogic = require("can-query-logic");

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
		queryLogic: new QueryLogic({
			identity: ["id"]
		}),
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
		url: "/api/todos",
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
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
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
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
		},
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
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

QUnit.test("contentType defaults to form-urlencoded for GET", function() {
	var connection = persist({
		url: {
			getData: "GET /api/restaurants"
		},
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
	});

	fixture({
		"GET /api/restaurants": function(request){
			equal(request.headers["Content-Type"], "application/x-www-form-urlencoded");
			return request.data;
		}
	});

	stop();
	connection.getData({foo:"bar"}).then(function() {
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
		},
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
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
		},
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
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

QUnit.test('URL parameters should be encoded', function (assert) {
	var done = assert.async();
	var connection = persist({
		url: {
			getData: {
				type: 'get',
				url: '/dogs/{id}'
			}
		},
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
	});
	fixture({
		"GET /dogs/%23asher": function () {
			return {id: '#asher'}
		}
	});

	connection.getData({id: '#asher'})
		.then(function (data) {
			assert.equal(data.id, '#asher');
			done();
		})
		.catch(function (error) {
			done(error);
		});
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
		ajax: $.ajax,
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
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

QUnit.asyncTest("fixture stores work with data (#298)", function(){

	var basicAlgebra = new set.Algebra();

	var todoStore = fixture.store([{
		id: "1",
		name: "todo 1"
	}], basicAlgebra);

	fixture("/v1/places/todos/{id}", todoStore);

	var connection = persist({
		url: "/v1/places/todos/{id}",
		queryLogic: basicAlgebra
	});

	connection.getData({id: 1}).then(function(todo){
		QUnit.equal(todo.name, "todo 1", "got one item");
	}).then(function(){

		var queryLogic = new set.Algebra(
			set.props.id("_todoId")
		);

		var todoStore = fixture.store([{
			_todoId: "1",
			name: "todo 1"
		}], queryLogic);

		fixture("/v2/places/todos", todoStore);

		var connection = persist({
			url: "/v2/places/todos",
			queryLogic: queryLogic
		});

		connection.getData({_todoId: "1"}).then(function(todo){
			QUnit.equal(todo.name, "todo 1");
			QUnit.start();
		}, function(error){
			debugger;
		});
	}, function(){
		debugger;
	});
});
