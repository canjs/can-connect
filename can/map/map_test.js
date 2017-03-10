var set = require("can-set");
var $ = require("jquery");
var Map = require("can-map");
var List = require("can-list");
var compute = require("can-compute");

// load connections
var constructor = require("can-connect/constructor/");
var canMap = require("can-connect/can/map/");
var constructorStore = require("can-connect/constructor/store/");
var dataCallbacks = require("can-connect/data/callbacks/");
var callbacksCache = require("can-connect/data/callbacks-cache/");
var combineRequests = require("can-connect/data/combine-requests/");
var localCache = require("can-connect/data/localstorage-cache/");
var dataParse = require("can-connect/data/parse/");
var dataUrl = require("can-connect/data/url/");
var fallThroughCache = require("can-connect/fall-through-cache/");
var realTime = require("can-connect/real-time/");



var connect=  require("can-connect/can-connect");

var QUnit = require("steal-qunit");


var fixture = require("can-fixture");
var testHelpers = require("can-connect/test-helpers");
var map = [].map;
var assign = require("can-util/js/assign/assign");

var later = testHelpers.later;

var logErrorAndStart = function(e){
	ok(false,"Error "+e);
	start();
};

QUnit.module("can-connect/can/map/map",{
	setup: function(){

		var Todo = Map.extend({

		});
		var TodoList = List.extend({
			Map: Todo
		});
		this.Todo = Todo;
		this.TodoList = TodoList;

		var cacheConnection = connect([localCache],{
			name: "todos"
		});
		cacheConnection.clear();
		this.cacheConnection = cacheConnection;

		this.Todo = Todo;

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


QUnit.test("real-time super model", function(){

	var firstItems = [ {id: 0, type: "important"}, {id: 1, type: "important"} ];
	var secondItems = [ {id: 2, due: "today"}, {id: 3, due: "today"} ];

	var state = testHelpers.makeStateChecker(QUnit, [
		"getListData-important",
		"getListData-today",
		"createData-today+important",
		"updateData-important",
		"updateData-today",
		"destroyData-important-1",
		"getListData-today-2"
	]);

	stop();

	fixture({
		"GET /services/todos": function(){
			if(state.get() === "getListData-important") {
				state.next();
				return {data: firstItems.slice(0) };
			} else if(state.get() === "getListData-today"){
				state.next();
				return {data: secondItems.slice(0) };
			} else {
				state.check("getListData-today-2");
				return { data: secondItems.slice(1) };
			}
		},
		"POST /services/todos": function(request){
			if( state.get() === "createData-today+important" ) {
				state.next();
				// todo change to all props
				return assign({id: 10}, request.data);
			}
		},
		"PUT /services/todos/{id}": function(request){
			if( state.get() === "updateData-important" || state.get() === "updateData-today" ) {
				state.next();
				// todo change to all props
				return assign({},request.data);
			} else {
				ok(false, "bad state!");
				start();
			}
		},
		"DELETE /services/todos/{id}": function(request){
			if(state.get() === "destroyData-important-1") {
				state.next();
				// todo change to all props
				return assign({destroyed:  1},request.data);
			} else {
				ok(false, "bad state!");
				start();
			}
		}
	});

	function checkCache(name, set, expectData, next) {
		cacheConnection.getListData(set).then(function(data){
			deepEqual(map.call(data.data, testHelpers.getId),
					  map.call(expectData, testHelpers.getId), name);
			setTimeout(next, 1);
		});
	}

	var connection = this.todoConnection,
		cacheConnection = this.cacheConnection,
		Todo = this.Todo;

	var importantList,
		todayList,
		bindFunc = function(){
			//canLog.log("length changing");
		};
	Promise.all([connection.getList({type: "important"}), connection.getList({due: "today"})])
		.then(function(result){

		importantList = result[0];
		todayList = result[1];

		importantList.bind("length", bindFunc);
		todayList.bind("length",bindFunc);

		setTimeout(createImportantToday,1);

	}, logErrorAndStart);

	var created;
	function createImportantToday() {
		connection.save(new Todo({
			type: "important",
			due: "today",
			createId: 1
		})).then( function(task){
			created = task;
			setTimeout(checkLists, 1);
		}, logErrorAndStart);
	}


	function checkLists() {
		ok( importantList.indexOf(created) >= 0, "in important");
		ok( todayList.indexOf(created) >= 0, "in today");

		checkCache("cache looks right", {type: "important"}, firstItems.concat(created.serialize()),serverSideDuplicateCreate );
	}



	function serverSideDuplicateCreate(){
		connection.createInstance({id: 10, due: "today",createdId: 1, type: "important"}).then(function(createdInstance){
			equal(createdInstance, created, "created instance returned from SSE is the same as what we created earlier");

			ok( importantList.indexOf(created) >= 0, "in important");
			ok( todayList.indexOf(created) >= 0, "in today");

			equal(importantList.length, 3, "items stays the same");

			checkCache("cache looks right", {type: "important"}, firstItems.concat(created.serialize()),serverSideCreate );
		});

	}

	var serverCreatedInstance;
	function serverSideCreate(){
		connection.createInstance({id: 11, due: "today", createdId: 2, type: "important"}).then(function(createdInstance){
			serverCreatedInstance = createdInstance;

			ok( importantList.indexOf(createdInstance) >= 0, "in important");
			ok( todayList.indexOf(createdInstance) >= 0, "in today");

			checkCache( "cache looks right afer SS create", {type: "important"}, firstItems.concat(created.serialize(), serverCreatedInstance.serialize()), update1 );
		});
	}

	function update1() {
		created.removeAttr("due");
		connection.save(created).then(later(checkLists2), logErrorAndStart);
	}
	function checkLists2() {
		ok( importantList.indexOf(created) >= 0, "still in important");
		equal( todayList.indexOf(created) , -1, "removed from today");
		update2();
	}

	function update2() {
		created.removeAttr("type");
		created.attr("due","today");
		connection.save(created).then(later(checkLists3), logErrorAndStart);
	}
	function checkLists3() {
		equal( importantList.indexOf(created),  -1, "removed from important");
		ok( todayList.indexOf(created) >= 1, "added to today");

		checkCache("cache looks right after update2", {type: "important"}, firstItems.concat(serverCreatedInstance.serialize()),serverSideUpdate );
	}

	function serverSideUpdate(){

		connection.updateInstance({
			type: "important",
			due: "today",
			createId: 1,
			id: 10
		}).then(function(instance){
			equal(created, instance);
			ok( importantList.indexOf(created) >= 0, "in important");
			ok( todayList.indexOf(created) >= 0, "in today");


			checkCache( "cache looks right afer SS update", {type: "important"}, importantList.serialize(), destroyItem );
		});

	}


	var firstImportant;
	function destroyItem(){
		firstImportant = importantList[0];

		connection.destroy(firstImportant)
			.then(later(checkLists4),logErrorAndStart);
	}

	function checkLists4(){
		equal( importantList.indexOf(firstImportant), -1, "in important");
		checkCache( "cache looks right afer destroy", {type: "important"}, importantList.serialize(), serverSideDestroy );
	}

	function serverSideDestroy(){
		connection.destroyInstance({
			type: "important",
			due: "today",
			createId: 1,
			id: 10
		}).then(function(instance){
			equal(instance, created, "got back deleted instance");
			equal( importantList.indexOf(created), -1, "still in important");
			equal( todayList.indexOf(created) , -1, "removed from today");

			checkCache( "cache looks right afer ss destroy", {type: "important"}, importantList.serialize(), function(){
				checkCache( "cache looks right afer SS destroy", {due: "today"}, todayList.serialize(), getListDueTodayAgainstCache);
			} );
		});

	}

	function getListDueTodayAgainstCache(){
		connection.getList({due: "today"}).then(function(updatedTodayList){
			var added = serverCreatedInstance.serialize();
			equal(todayList, updatedTodayList, "same todo list returned");

			deepEqual( updatedTodayList.serialize(), secondItems.concat([added]), "got initial items from cache");

			var batchNum;
			todayList.bind("length", function(ev){
				if(!ev.batchNum || ev.batchNum !== batchNum) {
					deepEqual( updatedTodayList.serialize(), secondItems.slice(1), "updated cache");
					start();
					batchNum = ev.batchNum;
				}

			});
		});
	}

});

test("isSaving and isDestroying", function(){

	stop();

	fixture({
		"POST /services/todos": function(request){
			return assign({id: 10}, request.data);
		},
		"PUT /services/todos/{id}": function(request){
			return assign({},request.data);
		},
		"DELETE /services/todos/{id}": function(request){
			return assign({destroyed:  1},request.data);
		}
	});


	var todo = new this.Todo({foo: "bar"});
	var todoConnection = this.todoConnection;
	var state = "hydrated",
		isSavingCalls = 0,
		isDestroyingCalls = 0;

	var isSaving = compute(function(){
		return todo.isSaving();
	});
	var isDestroying = compute(function(){
		return todo.isDestroying();
	});

	isSaving.bind("change", function(ev, newVal, oldVal){
		isSavingCalls++;
		if(isSavingCalls === 1) {
			equal(state,"hydrated");
			equal(newVal, true);
			equal(todo.isNew(), true);
		} else if(isSavingCalls === 2) {
			equal(state,"hydrated");
			equal(newVal, false);
			equal(todo.isNew(), false);
		} else if(isSavingCalls === 3) {
			equal(state,"created");
			equal(newVal, true);
			equal(todo.isNew(), false);
		} else if(isSavingCalls === 4) {
			equal(state,"created");
			equal(newVal, false);
		} else {
			ok(false, "extra saving call");
		}
	});

	isDestroying.bind("change", function(ev, newVal, oldVal){
		isDestroyingCalls++;
		if(isSavingCalls === 1) {
			equal(state,"updated");
			equal(newVal, true);
		} else if(isSavingCalls === 2) {
			equal(state,"updated");
			equal(newVal, false);
		}
	});


	todoConnection.save(todo).then(function(){
		state = "created";
		equal( todo.isSaving(), false, "isSaving is false" );

		todoConnection.save(todo).then(function(){
			state = "updated";
			equal( todo.isSaving(), false, "isSaving is false" );

			todoConnection.destroy(todo).then(function(){
				equal( todo.isDestroying(), false, "isDestroying is false" );
				start();
			});
			equal( todo.isSaving(), false, "isSaving is false" );
			equal( todo.isDestroying(), true, "isDestroying is true" );
		});

		equal( todo.isSaving(), true, "isSaving is true" );
	});

	equal( todo.isSaving(), true, "isSaving is true" );


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
	var Todo = Map.extend({});
	var TodoList = List.extend({
		Map: Todo
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
			   set.comparators.id("_id")
			)
		});

	QUnit.equal(todoConnection.id(new Todo({_id: 5})), 5, "got the right id");
});
