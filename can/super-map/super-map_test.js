var QUnit = require("steal-qunit");
var fixture = require("can-fixture");
var Map = require("can-map");
var DefineMap = require("can-define/map/map");
var DefineList = require("can-define/list/list");
var superMap = require("can-connect/can/super-map/");
var set = require("can-set");

QUnit.module("can-connect/can/super-map",{
	setup: function(){
		localStorage.clear();
	}
});

QUnit.test("uses idProp", function(){

	var Restaurant = Map.extend({});

	var connection = superMap({
		url: "/api/restaurants",
		idProp: '_id',
		Map: Restaurant,
		List: Restaurant.List,
		name: "restaurant"
	});

	fixture({
		"GET /api/restaurants/{_id}": function(request){
			return {id: 5};
		}
	});

	stop();
	connection.getData({_id: 5}).then(function(data){
		deepEqual(data, {id: 5}, "findOne");
		start();
	});


});


QUnit.test("creates map if none is provided (#8)", function(){

	var connection = superMap({
		url: "/api/restaurants",
		idProp: '_id',
		name: "restaurant"
	});

	fixture({
		"GET /api/restaurants/{_id}": function(request){
			return {id: 5};
		}
	});

	stop();
	connection.getData({_id: 5}).then(function(data){
		deepEqual(data, {id: 5}, "findOne");
		start();
	});


});

QUnit.test("allow other caches (#59)", function(){

	var cacheConnection = {
		getData: function(){
			ok(true, "called this cacheConnection");
			return Promise.resolve({id: 5});
		}
	};

	var connection = superMap({
		url: "/api/restaurants",
		name: "restaurant",
		cacheConnection: cacheConnection
	});

	fixture({
		"GET /api/restaurants/{_id}": function(request){
			return {id: 5};
		}
	});

	stop();
	connection.getData({_id: 5}).then(function(data){
		start();
	});
});

QUnit.test("uses idProp from algebra (#255)", function(){

	var Restaurant = Map.extend({});

	var connection = superMap({
		url: "/api/restaurants",
		Map: Restaurant,
		List: Restaurant.List,
		name: "restaurant",
		algebra: new set.Algebra(
		   set.comparators.id("_id")
		)
	});

	fixture({
		"GET /api/restaurants/{_id}": function(request){
			return {id: 5};
		}
	});

	stop();
	connection.getData({_id: 5}).then(function(data){
		deepEqual(data, {id: 5}, "findOne");
		start();
	});


});

QUnit.asyncTest("use the right dependencies (#296)", function(){
	var todoAlgebra = new set.Algebra(
		set.props.boolean("complete"),
		set.props.id("id"),
		set.props.sort("sort")
	);

	var todoStore = fixture.store([
		{ name: "mow lawn", complete: false, id: 5 },
		{ name: "dishes", complete: true, id: 6 },
		{ name: "learn canjs", complete: false, id: 7 }
	], todoAlgebra);

	fixture("/theapi/todos", todoStore);

	var Todo = DefineMap.extend({
		id: "string",
		name: "string",
		complete: {type: "boolean", value: false}
	});

	Todo.List = DefineList.extend({
		"#": Todo
	});

	Todo.connection = superMap({
		url: "/theapi/todos",
		Map: Todo,
		List: Todo.List,
		name: "todo",
		algebra: todoAlgebra
	});

	var newTodo = new Todo({name: "test superMap"});
	newTodo.on("name", function(){});
	
	newTodo.save().then(function(savedTodo){

		Todo.get({id: savedTodo.id}).then(function(t){
			QUnit.equal(t._cid, newTodo._cid); // NOK
			QUnit.start();
		});
	});


});
