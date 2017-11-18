var set = require("can-set");
var $ = require("jquery");
var Map = require("can-define/map/map");
var List = require("can-define/list/list");


// load connections
var constructor = require("can-connect/constructor/");
var canMap = require("can-connect/can/map/");
//var canRef = require("can-connect/can/ref/");
var constructorStore = require("can-connect/constructor/store/");
var dataCallbacks = require("can-connect/data/callbacks/");
var callbacksCache = require("can-connect/data/callbacks-cache/");
var combineRequests = require("can-connect/data/combine-requests/");
var localCache = require("can-connect/data/localstorage-cache/");
var dataParse = require("can-connect/data/parse/");
var dataUrl = require("can-connect/data/url/");
var fallThroughCache = require("can-connect/fall-through-cache/");
var realTime = require("can-connect/real-time/");

var connect = require("can-connect/can-connect");

var QUnit = require("steal-qunit");



var fixture = require("can-fixture");





var cleanUndefineds = function(obj) {
	if(Array.isArray(obj)) {
		return obj.map(cleanUndefineds);
	} else {
		var res = {};
		for(var prop in obj) {
			if(obj[prop] !== undefined) {
				res[prop] = obj[prop];
			}
		}
		return res;
	}
};

QUnit.module("can-connect/can/map/map with define",{
	setup: function(){

		var Todo = Map.extend("Todo",{
			id: "*",
			name: "*",
			type: "*",
			due: "*",
			createdId: "*",
			destroyed: "any"
		});
		var TodoList = List.extend("TodoList",{
			"*": Todo
		});
		this.Todo = Todo;
		this.TodoList = TodoList;

		var cacheConnection = connect([localCache],{
			name: "todos"
		});
		cacheConnection.clear();
		this.cacheConnection = cacheConnection;


		this.todoConnection = connect([
			constructor,
			canMap,
			constructorStore,
			dataCallbacks,
			callbacksCache,
			combineRequests,
			dataParse,
			dataUrl,
			fallThroughCache,
			realTime],
			{
				url: "/services/todos",
				cacheConnection: cacheConnection,
				Map: Todo,
				List: TodoList,
				ajax: $.ajax
			});


	}
});

require("./test-real-time-super-model")(function(){
	return {Todo: this.Todo, TodoList: this.TodoList};
});

test("listSet works", function(){
	fixture({
		"GET /services/todos": function(){
			return {data: []};
		}
	});

	var Todo = this.Todo;
	var TodoList = this.TodoList;
	var todoConnection = this.todoConnection;
	stop();

	Promise.all([
		todoConnection.getList({foo: "bar"}).then(function(list){
			deepEqual( todoConnection.listSet(list), {foo: "bar"});
		}),
		Todo.getList({zed: "ted"}).then(function(list){
			deepEqual( todoConnection.listSet(list), {zed: "ted"});
		})
	]).then(function(){
		var list = new TodoList({"zak": "ack"});
		deepEqual(  todoConnection.listSet(list), {zak: "ack"});
		start();
	});

});

test("findAll and findOne alias", function(){

	fixture({
		"GET /services/todos": function(){
			return {data: [{id: 1, name: "findAll"}]};
		},
		"GET /services/todos/{id}": function(){
			return {id: 2, name: "findOne"};
		}
	});

	var Todo = this.Todo;

	stop();
	Promise.all([
		Todo.findOne({id: 1}).then(function(todo){
			equal(todo.name, "findOne");
		}),
		Todo.findAll({}).then(function(todos){
			equal(todos.length, 1);
			equal(todos[0].name, "findAll");
		})
	]).then(function(){
		start();
	});
});

QUnit.test("reads id from set algebra (#82)", function(){
	var Todo = Map.extend({
		_id: "*"
	});
	var TodoList = List.extend({
		"*": Todo
	});


	var todoConnection = connect([
		constructor,
		canMap,
		constructorStore,
		dataCallbacks,
		callbacksCache,
		combineRequests,
		dataParse,
		dataUrl,
		fallThroughCache,
		realTime],
		{
			url: "/services/todos",
			Map: Todo,
			List: TodoList,
			ajax: $.ajax,
			algebra: new set.Algebra(
			   set.props.id("_id")
			)
		});

	QUnit.equal(todoConnection.id(new Todo({_id: 5})), 5, "got the right id");
});


QUnit.asyncTest("instances bound before create are moved to instance store (#296)", function(){
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

	var Todo = Map.extend({
		id: "string",
		name: "string",
		complete: {type: "boolean", value: false}
	});

	Todo.List = List.extend({
		"#": Todo
	});

	Todo.connection = connect([
		constructor,
		canMap,
		constructorStore,
		dataCallbacks,
		dataUrl],
		{
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
