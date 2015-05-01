var connect = require("../can-connect");
require("../real-time");
require("../constructor");
require("../constructor-store");
require("../data-callbacks");
var can = require("can/util/util");

var QUnit = require("steal-qunit");

var testHelpers = require("./test-helpers");



var asyncResolve = function(data) {
	var def = new can.Deferred();
	setTimeout(function(){
		def.resolve(data);
	},1);
	return def;
};

var later = function(fn){
	return function(){
		setTimeout(fn, 1);
	};
};

var logErrorAndStart = function(e){
	debugger;
	ok(false,"Error "+e);
	start();
};


QUnit.test("basics", function(){
	// get two lists
	// user creates / updates / destroys things
	// real-time creates / updates / destroys things
	stop();
	
	var state = testHelpers.makeStateChecker(QUnit, [
		"getListData-important",
		"getListData-today",
		"createInstanceData-today+important",
		"createdInstance-1",
		"updateInstanceData-important"
	]);
	
	var firstItems = [ {id: 0, type: "important"}, {id: 1, type: "important"} ];
	var secondItems = [ {id: 2, due: "today"}, {id: 3, due: "today"} ];
	
	var callbackBehavior = function(base){
		return {
			createdInstance: function(){
				state.check("createdInstance-1");
				return base.createdInstance.apply(this, arguments);
			},
			updatedInstance: function(){
				console.log("updated instance!");
			},
			destroyedInstance: function(){
				//debugger;
			},
			updatedList: function(list, updated){
				return base.updatedList.apply(this, arguments);
			}
		};
	};
	var dataBehavior = function(){
		return {
			getListData: function(){
				// nothing here first time
				if(state.get() === "getListData-important") {
					state.next();
					return asyncResolve({data: firstItems.slice(0) });
				} else {
					state.check("getListData-today");
					return asyncResolve({data: secondItems.slice(0) });
				}
			},
			createInstanceData: function(props){
				
				if( state.get() === "createInstanceData-today+important" ) {
					state.next();
					// todo change to all props
					return asyncResolve({id: 10});
				} 
				
				
			},
			updateInstanceData: function(props){
				
				if( state.get() === "updateInstanceData-important" ) {
					state.next();
					// todo change to all props
					return asyncResolve(can.simpleExtend({},props));
				} 
				
				
			}
		};
	};

	var connection = connect([ dataBehavior, "real-time","constructor","constructor-store","data-callbacks", callbackBehavior],{
		
	});
	
	var importantList,
		todayList;
	can.when(connection.findAll({type: "important"}), connection.findAll({due: "today"})).then(function(important, dueToday){
		importantList = important;
		todayList = dueToday;
		
		connection.addListReference(importantList);
		connection.addListReference(todayList);
		
		setTimeout(createImportantToday,1);
		
	}, logErrorAndStart);
	
	function createImportantToday() {
		connection.save({
			type: "important",
			due: "today",
			createId: 1
		}).then( function(task){
			connection.addInstanceReference(task);
			setTimeout(checkLists, 1);
		}, logErrorAndStart);
	}
	
	var created;
	function checkLists() {
		created = connection.instanceStore.get(10);
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
		setTimeout(updateCreated, 1);
	}
	
	function updateCreated() {
		delete created.due;
		connection.save(created).then(later(checkLists2), logErrorAndStart);
	}
	function checkLists2() {
		ok( importantList.indexOf(created) >= 0, "in important");
		equal( todayList.indexOf(created) , -1, "in today");
		start();
	};
	
});
