var connect = require("can-connect/can-connect");
var set = require("can-set");
var realTime = require("can-connect/real-time/");
var constructor = require("can-connect/constructor/");
var constructorStore = require("can-connect/constructor/store/");
var dataCallbacks = require("can-connect/data/callbacks/");
var callbacksOnce = require("can-connect/constructor/callbacks-once/");
var testHelpers = require("can-connect/test-helpers");
var QUnit = require("steal-qunit");
var assign = require("can-util/js/assign/assign");
var canDev = require('can-util/js/dev/dev');


QUnit.module("can-connect/real-time",{});

var later = function(fn){
	return function(){
		setTimeout(fn, 1);
	};
};

var logErrorAndStart = function(e){
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
		"createData-today+important",
		"createdInstance-1",
		"updateData-important",
		"updateData-today",
		"destroyData-important-1"
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
					return testHelpers.asyncResolve({data: firstItems.slice(0) });
				} else {
					state.check("getListData-today");
					return testHelpers.asyncResolve({data: secondItems.slice(0) });
				}
			},
			createData: function(props){
				if( state.get() === "createData-today+important" ) {
					state.next();
					// todo change to all props
					return testHelpers.asyncResolve({id: 10});
				} else {
					ok(false, "bad state!");
					start();
				}


			},
			updateData: function(props){

				if( state.get() === "updateData-important" || state.get() === "updateData-today" ) {
					state.next();
					// todo change to all props
					return testHelpers.asyncResolve(assign({},props));
				} else {
					ok(false, "bad state!");
					start();
				}
			},
			destroyData: function(props){
				if(state.get() === "destroyData-important-1") {
					state.next();
					// todo change to all props
					return testHelpers.asyncResolve(assign({destroyed:  1},props));
				}
			}
		};
	};

	var connection = connect([
		dataBehavior,
		realTime,
		constructor,
		constructorStore,
		dataCallbacks,
		callbackBehavior,
		callbacksOnce
		],{});

	var importantList,
		todayList;
	Promise.all([connection.getList({type: "important"}), connection.getList({due: "today"})]).then(function(result){

		importantList = result[0];
		todayList = result[1];

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
		ok( todayList.indexOf( created) >= 0, "in today");
		setTimeout(serverSideDuplicateCreate, 1);

	}

	function serverSideDuplicateCreate(){
		connection.createInstance({id: 10, due: "today", type: "important"}).then(function(createdInstance){
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
	}

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

QUnit.test("sorting by id works", function(){
	var algebra = new set.Algebra(set.props.id("id"), set.props.sort("sortBy"));

	var items = [{id: 1, name:"g"}, {id: 3, name:"j"}, {id: 4, name:"m"}, {id: 5, name:"s"}];
	var dataBehavior = function(){
		return {
			getListData: function(){
				// nothing here first time
				return testHelpers.asyncResolve({data: items.slice(0) });
			}
		};
	};

	var connection = connect([dataBehavior,realTime,constructor,constructorStore],{
			algebra: algebra
	});

	stop();
	var listItems;
	connection.getList({}).then(function(list){
		listItems = list;
		connection.addListReference(list);
		setTimeout(createInstance,1);

	});

	function createInstance(){
		connection.createInstance({id: 2, name: "a"}).then(function(){
			setTimeout(checkList,1);
		});
	}
	function checkList(){
		var itemsCopy = items.slice(0);
		itemsCopy.splice(1, 0, {id: 2, name: "a"});
		deepEqual(listItems, itemsCopy);
		start();
	}
});


QUnit.test("sorting by sort clause works with updates", function(){
	var algebra = new set.Algebra(set.props.id("id"), set.props.sort("sortBy"));

	var items = [{id: 1, name:"d"}, {id: 3, name:"j"}, {id: 4, name:"m"}, {id: 5, name:"s"}];
	var dataBehavior = function(){
		return {
			getListData: function(){
				// nothing here first time
				return testHelpers.asyncResolve({data: items.slice(0) });
			}
		};
	};

	var connection = connect([dataBehavior,realTime,constructor,constructorStore],{
			algebra: algebra
	});

	stop();
	var listItems;
	connection.getList({sortBy: "name"}).then(function(list){
		listItems = list;
		connection.addListReference(list);
		list.forEach(function(instance){
			connection.addInstanceReference(instance);
		});
		setTimeout(updateInstance,1);

	});

	function updateInstance(){
		connection.updateInstance({id: 3, name: "p"}).then(function(){
			setTimeout(checkList,1);
		});
	}
	function checkList(){
		deepEqual(listItems, [{id: 1, name:"d"}, {id: 4, name:"m"}, {id: 3, name:"p"}, {id: 5, name:"s"}]);
		start();
	}
});

QUnit.test("destroyInstance calls destroyedInstance", function (assert) {
	var destructionForeman = function(){
		return {
			destroyedInstance: function (instance, props) {
				assert.ok(instance, "destroyedInstance was called.");
				return testHelpers.asyncResolve({});
			}
		};
	};
	var connection = connect([
		realTime,
		constructor,
		constructorStore,
		destructionForeman
	],{});
	connection.destroyInstance({id: 1});
});

//!steal-remove-start
if (canDev) {
	test("dev mode warning when listSet algebra doesn't match an item", function () {
		var algebra = new set.Algebra(set.props.id("id"));
		var items = [{id: 1, name:"d"}, {id: 3, name:"j", foo: {bar: 5678}}];
		var dataBehavior = function(){
			return {
				getListData: function(){
					return testHelpers.asyncResolve({ data: items.slice(0) });
				},
				createData: function(props){},
				updateData: function(props){},
				destroyData: function(props){}
			};
		};

		var connection = connect([dataBehavior,realTime,constructor,constructorStore,
			dataCallbacks, callbacksOnce],{
				algebra: algebra
		});

		var oldlog = canDev.warn;
		canDev.warn = function () {
			clearTimeout(failSafeTimer);
			ok(true, 'warns about item not being in list');
			canDev.warn = oldlog;
			start();
		};

		stop();
		var failSafeTimer = setTimeout(function () {
			notOk(true, 'canDev.warn was never called!');
		}, 500);
		connection.getList({ "fooBar": true, foo: { bar: 1234 }});
	});

	test("listSet algebra warning includes any `undefined` values", function() {
		var algebra = new set.Algebra(set.props.id("id"));
		var items = [{id: 1, name:"d", foo: undefined }, {id: 3, name:"j", foo: {bar: 5678}}];
		var dataBehavior = function(){
			return {
				getListData: function(){
					return testHelpers.asyncResolve({ data: items.slice(0) });
				},
				createData: function(props){},
				updateData: function(props){},
				destroyData: function(props){}
			};
		};

		var connection = connect([ dataBehavior, realTime,constructor,constructorStore,
			dataCallbacks, callbacksOnce],{
				algebra: algebra
		});

		var oldlog = canDev.warn;
		canDev.warn = function (message) {
			clearTimeout(failSafeTimer);
			ok(true, 'warns about item not being in list');
			ok(/"nope": undefined/.test(message), 'undefined value in set');
			ok(/"foo": undefined/.test(message), 'undefined value in item');
			canDev.warn = oldlog;
			start();
		};

		stop();
		var failSafeTimer = setTimeout(function () {
			notOk(true, 'canDev.warn was never called!');
		}, 500);
		connection.getList({ "fooBar": true, foo: { bar: 1234 }, nope: undefined });
	});
}
//!steal-remove-end

/**
 * This test covers a situation where there is a mix of AJAX (data)
 * and sockets (real-time). A save() happens, an AJAX POST is made
 * to the server, the socket 'created' event is emitted before
 * the AJAX request is done, and finally the AJAX response resolves.
 */
QUnit.test("handling if createInstance happens before createdData", 4, function (assert) {
	QUnit.stop();
	var createdPromiseResolve;

	var dataBehavior = function(){
		return {
			createData: function (props, cid) {
				return new Promise(function(resolve){
					createdPromiseResolve = resolve;
				});
			},
			getListData: function(props){},
			updateData: function(props){},
			destroyData: function(props){}
		};
	};
	var connection = connect([
		dataBehavior,
		constructor,
		constructorStore,
		realTime,
		dataCallbacks,
		callbacksOnce
	],{});

	var data = {name: "Ryan"};

	var savePromise = connection.save(data).then(function(dataAgain){
		connection.addInstanceReference(data);
		QUnit.equal(data, dataAgain, "same instance in memory .save()")
		QUnit.equal(data.id, 1, ".save() has the id");
	});

	setTimeout(function(){
		connection.createInstance({name: "Ryan", id: 1}).then(function(instance){
			QUnit.equal(data, instance, ".createInstance() same instance in memory");
			QUnit.equal(data.id, 1, ".createInstance() has the id");
		}).then(function(){
			return savePromise;
		}).then(function(){
			QUnit.start();
		});

		createdPromiseResolve({name: "Ryan", id: 1});
	}, 10);
});

/**
 * This tests to make sure that the `Promise.all` call inside
 * of createInstance always gets an array of resolved promises.
 * The createData method will swallow any failures before adding
 * the promise onto the promise stack used by createInstance.
 */
QUnit.test("createInstance doesn't fail if createData fails", 3, function (assert) {
	QUnit.stop();
	var createdPromiseReject;

	var dataBehavior = function(){
		return {
			createData: function (props, cid) {
				return new Promise(function(resolve, reject){
					createdPromiseReject = reject;
				});
			},
			getListData: function(props){},
			updateData: function(props){},
			destroyData: function(props){}
		};
	};
	var connection = connect([
		dataBehavior,
		constructor,
		constructorStore,
		realTime,
		dataCallbacks,
		callbacksOnce
	],{});

	var data = {name: "Ryan"};

	var savePromise = connection.save(data).then(function(dataAgain){
		QUnit.notOk(true, "save() should not have succeeded");
	}).catch(function(){
		QUnit.ok(true, "save() caused an error.");
		return '';
	});

	setTimeout(function(){
		connection.createInstance({name: "Ryan", id: 1}).then(function(instance){
			QUnit.notEqual(data, instance, ".createInstance() should create a new instance b/c save() failed");
			QUnit.ok(!data.id, 'data should not have an id');
		}).then(function(){
			return savePromise;
		}).then(function(){
			QUnit.start();
		});

		createdPromiseReject('Simulated AJAX error');
	}, 10);
});

