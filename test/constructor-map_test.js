// load connections

require("../constructor");
require("../constructor-map");
require("../constructor-store");
require("../data-callbacks");
require("../data-combine-requests");
require("../data-localstorage-cache");
require("../data-parse");
require("../data-url");
require("../fall-through-cache");
require("../real-time");
var Map = require("can/map/map");
var List = require("can/list/list");

var connect=  require("../can-connect");

var QUnit = require("steal-qunit");

var can = require("can/util/util");
var fixture = require("can/util/fixture/fixture");
var testHelpers = require("./test-helpers");

var later = testHelpers.later;

var logErrorAndStart = function(e){
	debugger;
	ok(false,"Error "+e);
	start();
};

QUnit.module("can-connect/constructor-map",{
	setup: function(){
		
		var Todo = Map.extend({
			
		});
		var TodoList = List.extend({
			Map: Todo
		});
		this.Todo = Todo;
		this.TodoList = TodoList;
		
		var cacheConnection = connect(["data-localstorage-cache"],{
			name: "todos"
		});
		cacheConnection.reset();
		
		this.Todo = Todo;
		
		this.todoConnection = connect([
			"constructor",
			"constructor-map",
			"constructor-store",
			"data-callbacks",
			"data-combine-requests",
			"data-parse",
			"data-url",
			"fall-through-cache",
			"real-time"],{
				resource: "/services/todos",
				cacheConnection: cacheConnection,
				Map: Map,
				List: TodoList
			});
		
		
	}
});


QUnit.test("real-time super model", function(){
	
	var firstItems = [ {id: 0, type: "important"}, {id: 1, type: "important"} ];
	var secondItems = [ {id: 2, due: "today"}, {id: 3, due: "today"} ];
	
	var state = testHelpers.makeStateChecker(QUnit, [
		"getListData-important",
		"getListData-today",
		"createInstanceData-today+important",
		"updateInstanceData-important",
		"updateInstanceData-today",
		"destroyInstanceData-important-1"
	]);
	
	stop();
	
	fixture({
		"GET /services/todos": function(){
			if(state.get() === "getListData-important") {
				state.next();
				return {data: firstItems.slice(0) };
			} else {
				state.check("getListData-today");
				return {data: secondItems.slice(0) };
			}
		},
		"POST /services/todos": function(){
			if( state.get() === "createInstanceData-today+important" ) {
				state.next();
				// todo change to all props
				return {id: 10};
			} 
		},
		"PUT /services/todos/{id}": function(request){
			if( state.get() === "updateInstanceData-important" || state.get() === "updateInstanceData-today" ) {
				state.next();
				// todo change to all props
				return can.simpleExtend({},request.data);
			} else {
				ok(false, "bad state!");
				debugger;
				start();
			}
		},
		"DELETE /services/todos/{id}": function(request){
			if(state.get() === "destroyInstanceData-important-1") {
				state.next();
				// todo change to all props
				return can.simpleExtend({destroyed:  1},request.data);
			}
		}
	});
	
	var connection = this.todoConnection,
		Todo = this.Todo,
		TodoList = this.TodoList;
	
	var importantList,
		todayList,
		bindFunc = function(){
			console.log("length changing");
		};
	can.when(connection.findAll({type: "important"}), connection.findAll({due: "today"})).then(function(important, dueToday){
		
		importantList = important;
		todayList = dueToday;
		
		important.bind("length", bindFunc);
		dueToday.bind("length",bindFunc);
		
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
		setTimeout(serverSideDuplicateCreate, 1);
		
	}
	
	function serverSideDuplicateCreate(){
		var createdInstance = connection.createInstance({id: 10, due: "today", id: 10, type: "important"});
		equal(createdInstance, created);
		
		ok( importantList.indexOf(created) >= 0, "in important");
		ok( todayList.indexOf(created) >= 0, "in today");
		
		equal(importantList.length, 3, "items stays the same");
		setTimeout(update1, 1);
	}
	
	function update1() {
		created.removeAttr("due");
		connection.save(created).then(later(checkLists2), logErrorAndStart);
	}
	function checkLists2() {
		ok( importantList.indexOf(created) >= 0, "still in important");
		equal( todayList.indexOf(created) , -1, "removed from today");
		update2();
	};
	
	function update2() {
		created.removeAttr("type");
		created.attr("due","today");
		connection.save(created).then(later(checkLists3), logErrorAndStart);
	}
	function checkLists3() {
		equal( importantList.indexOf(created),  -1, "removed from important");
		ok( todayList.indexOf(created) >= 1, "added to today");
		serverSideUpdate();
	}
	
	function serverSideUpdate(){

		var instance = connection.updateInstance({
			type: "important",
			due: "today",
			createId: 1,
			id: 10
		});
		equal(created, instance);
		ok( importantList.indexOf(created) >= 0, "in important");
		ok( todayList.indexOf(created) >= 0, "in today");
		destroyItem();
	}
	var firstImportant;
	function destroyItem(){
		firstImportant = importantList[0];
		
		connection.destroy(firstImportant)
			.then(later(checkLists4),logErrorAndStart);
	}
	
	function checkLists4(){
		equal( importantList.indexOf(firstImportant), -1, "in important");
		serverSideDestroy();
	}
	
	function serverSideDestroy(){
		var instance = connection.destroyInstance({
			type: "important",
			due: "today",
			createId: 1,
			id: 10
		});
		equal( importantList.indexOf(created), -1, "still in important");
		equal( todayList.indexOf(created) , -1, "removed from today");
		start();
	}
});
