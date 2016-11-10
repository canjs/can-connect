var QUnit = require("steal-qunit");
var connect = require("can-connect");
var map = [].map;
var testHelpers = require("can-connect/test-helpers");

var constructor = require("can-connect/constructor/constructor");
var fallThroughCache = require("can-connect/fall-through-cache/fall-through-cache");
var constructorStore = require("can-connect/constructor/store/store");
var dataCallbacks = require("can-connect/data/callbacks/");

var getId = function(d){
	return d.id;
};

QUnit.module("can-connect/fall-through-cache");

QUnit.test("basics", function(){
	stop();
	var firstItems = [ {id: 0, foo: "bar"}, {id: 1, foo: "bar"} ];
	var secondItems = [ {id: 1, foo: "BAZ"}, {id: 2, foo: "bar"} ];

	var state = testHelpers.makeStateChecker(QUnit,["cache-getListData-empty",
		"base-getListData",
		"cache-updateListData",
		"connection-foundAll",


		"connection-getList-2",
		"cache-getListData-items",
		"connection-foundAll-2",
		"base-getListData-2",
		"cache-updateListData-2",
		"updatedList"] );


	var cacheConnection = connect([function(){
		return {
			getListData: function(){
				// nothing here first time
				if(state.get() === "cache-getListData-empty") {
					state.next();
					return testHelpers.asyncReject();
				} else {
					state.check("cache-getListData-items");
					return testHelpers.asyncResolve({data: firstItems.slice(0) });
				}
			},
			updateListData: function(data, set) {
				if(state.get() === "cache-updateListData") {
					state.next();
					deepEqual(set,{},"got the right set");
					deepEqual(data.data,firstItems, "updateListData items are right");
					return testHelpers.asyncResolve();
				} else {
					deepEqual(data.data,secondItems, "updateListData 2 items are right");
					state.check("cache-updateListData-2");
					return testHelpers.asyncResolve();
				}
			}
		};
	}],{});

	var base = function(base, options){
		return {
			getListData: function(){
				if(state.get() === "base-getListData") {
					state.next();
					return testHelpers.asyncResolve({data: firstItems.slice(0) });
				} else {
					state.check("base-getListData-2");
					return testHelpers.asyncResolve({data: secondItems.slice(0) });
				}
			}
		};
	};
	var updater = function(){
		return {
			updatedList: function(list, updated){
				state.check("updatedList");
				deepEqual( map.call(updated.data, getId), map.call(secondItems, getId) );
				start();
			}
		};
	};

	var connection = connect([base, constructor,fallThroughCache,constructorStore, dataCallbacks,updater],{
		cacheConnection: cacheConnection
	});

	// first time, it takes the whole time
	connection.getList({}).then(function( list ){
		state.check("connection-foundAll");
		deepEqual( map.call(list, getId), map.call(firstItems, getId) );
		setTimeout(secondCall, 1);
	}, testHelpers.logErrorAndStart);

	function secondCall() {
		state.check("connection-getList-2");
		connection.getList({}).then(function(list){
			state.check("connection-foundAll-2");
			deepEqual( map.call(list, getId), map.call(firstItems, getId) );
		}, testHelpers.logErrorAndStart);
	}



	// second time, it should return the original list from localStorage

	// but then update the list as the request goes out

});


QUnit.test("getInstance and getData", function(){
	stop();
	var firstData =  {id: 0, foo: "bar"};
	var secondData = {id: 0, foo: "BAR"};

	var state = testHelpers.makeStateChecker(QUnit,["cache-getData-empty",
		"base-getData",
		"cache-updateData",
		"connection-foundOne",
		"connection-getInstance-2",
		"cache-getData-item",

		"connection-foundOne-2",
		"base-getData-2",
		"cache-updateData-2",
		"updatedInstance"] );


	var cacheConnection = connect([function(){
		return {
			getData: function(){
				// nothing here first time
				if(state.get() === "cache-getData-empty") {
					state.next();
					return testHelpers.asyncReject();
				} else {
					state.check("cache-getData-item");
					return testHelpers.asyncResolve(firstData);
				}
			},
			updateData: function(data) {
				if(state.get() === "cache-updateData") {
					state.next();
					deepEqual(data,firstData, "updateData items are right");
					return testHelpers.asyncResolve();
				} else {
					//debugger;
					deepEqual(data,secondData, "updateData 2 items are right");
					state.check("cache-updateData-2");
					return testHelpers.asyncResolve();
				}
			}
		};
	}],{});

	var base = function(base, options){
		return {
			getData: function(){
				if(state.get() === "base-getData") {
					state.next();
					return testHelpers.asyncResolve({id: 0, foo: "bar"});
				} else {
					//debugger;
					state.check("base-getData-2");
					return testHelpers.asyncResolve({id: 0, foo: "BAR"});
				}
			}
		};
	};
	var updater = function(){
		return {
			updatedInstance: function(instance, data){
				state.check("updatedInstance");
				deepEqual( data,secondData );
				start();
			}
		};
	};

	var connection = connect([base, constructor,fallThroughCache,constructorStore, dataCallbacks, updater],{
		cacheConnection: cacheConnection
	});

	// first time, it takes the whole time
	connection.get({id: 0}).then(function( instance ){
		state.check("connection-foundOne");
		deepEqual( instance, {id: 0, foo: "bar"} );
		setTimeout(secondCall, 1);
	}, testHelpers.logErrorAndStart);

	function secondCall() {
		state.check("connection-getInstance-2");
		connection.get({id: 0}).then(function(instance){
			state.check("connection-foundOne-2");
			deepEqual( instance, {id: 0, foo: "bar"}  );
		}, testHelpers.logErrorAndStart);
	}

});

asyncTest("metadata transfered through fall through cache (#125)", function(){
	var getDataBehaviorDataPromise;
	var cacheConnection = {
		getListData: function(){
			return testHelpers.asyncResolve({data: [{id: 1}]});
		},
		updateListData: function(){}
	};

	var getDataBehavior = function(base, options){
		return {
			getListData: function(){
				getDataBehaviorDataPromise = testHelpers.asyncResolve({data: [{id: 1}], count: 5});
				return getDataBehaviorDataPromise;
			}
		};
	};

	var connection = connect([getDataBehavior, constructor,fallThroughCache,constructorStore, dataCallbacks],{
		cacheConnection: cacheConnection
	});

	connection.getList({}).then(function(list){
		setTimeout(function(){
			getDataBehaviorDataPromise.then(function() {
				QUnit.equal(list.count, 5, "expando added");
				QUnit.start();
			});
		}, 50);
	});

});
