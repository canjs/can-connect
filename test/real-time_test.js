var connect = require("../can-connect");
require("../real-time");
require("../constructor");
require("../constructor-store");
require("../data-callbacks");
var can = require("can/util/util");
var testHelpers = require("./test-helpers");
var QUnit = require("steal-qunit");





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
		"updateInstanceData-important",
		"updateInstanceData-today",
		"destroyInstanceData-important-1"
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
				return base.updatedInstance.apply(this, arguments);
			},
			destroyedInstance: function(){
				console.log("destroyInstance")
				return base.destroyedInstance.apply(this, arguments);
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
				
				if( state.get() === "updateInstanceData-important" || state.get() === "updateInstanceData-today" ) {
					state.next();
					// todo change to all props
					return asyncResolve(can.simpleExtend({},props));
				} else {
					ok(false, "bad state!");
					debugger;
					start();
				}
			},
			destroyInstanceData: function(props){
				if(state.get() === "destroyInstanceData-important-1") {
					state.next();
					// todo change to all props
					return asyncResolve(can.simpleExtend({destroyed:  1},props));
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
		connection.createInstance({id: 10, due: "today", id: 10, type: "important"}).then(function(createdInstance){
			equal(createdInstance, created);
		
			ok( importantList.indexOf(created) >= 0, "in important");
			ok( todayList.indexOf(created) >= 0, "in today");
			
			equal(importantList.length, 3, "items stays the same");
			setTimeout(update1, 1);
		});
	}
	
	function update1() {
		delete created.due;
		connection.save(created).then(later(checkLists2), logErrorAndStart);
	}
	function checkLists2() {
		ok( importantList.indexOf(created) >= 0, "still in important");
		equal( todayList.indexOf(created) , -1, "removed from today");
		update2();
	};
	
	function update2() {
		delete created.type;
		created.due = "today";
		connection.save(created).then(later(checkLists3), logErrorAndStart);
	}
	function checkLists3() {
		equal( importantList.indexOf(created),  -1, "removed from important");
		ok( todayList.indexOf(created) >= 1, "added to today");
		serverSideUpdate();
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
			destroyItem();
		});
		
	}
	var firstImportant;
	function destroyItem(){
		firstImportant = importantList[0];
		connection.addInstanceReference( firstImportant );
		
		connection.destroy(firstImportant)
			.then(later(checkLists4),logErrorAndStart);
	}
	
	function checkLists4(){
		equal( importantList.indexOf(firstImportant), -1, "in important");
		serverSideDestroy();
	}
	
	function serverSideDestroy(){
		connection.destroyInstance({
			type: "important",
			due: "today",
			createId: 1,
			id: 10
		}).then(function(instance){
			equal( importantList.indexOf(created), -1, "still in important");
			equal( todayList.indexOf(created) , -1, "removed from today");
			start();
		});
		
	}
	
	
});
