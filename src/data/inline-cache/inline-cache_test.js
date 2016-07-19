var QUnit = require("steal-qunit");
var connect = require("can-connect");
var testHelpers = require("can-connect/test-helpers");

var constructor = require("can-connect/constructor/"),
	fallThroughCache = require("can-connect/fall-through-cache/"),
	inlineCache = require("can-connect/data/inline-cache/"),
	constructorStore = require("can-connect/constructor/store/"),
	dataCallbacks = require("can-connect/data/callbacks/");


var map = [].map;

var getId = function(d){
	return d.id;
};

QUnit.module("can-connect/data-inline-cache");

QUnit.test("basics", function(){

	var firstItems = [ {id: 0, foo: "bar"}, {id: 1, foo: "bar"} ];
	var secondItems = [ {id: 1, foo: "BAZ"}, {id: 2, foo: "bar"} ];

	INLINE_CACHE = {
		items: {
			"{}": {data: firstItems.slice(0)}
		}
	};

	stop();


	var state = testHelpers.makeStateChecker(QUnit,[
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
				state.check("base-getListData-2");
				return testHelpers.asyncResolve({data: secondItems.slice(0) });

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

	var connection = connect([base, constructor, fallThroughCache, inlineCache, constructorStore, dataCallbacks,updater],{
		cacheConnection: cacheConnection,
		name: "items"
	});

	// first time, it takes the whole time
	connection.getList().then(function( list ){
		state.check("connection-foundAll");
		deepEqual( map.call(list, getId), map.call(firstItems, getId) );
		setTimeout(secondCall, 1);
	}, testHelpers.logErrorAndStart);

	function secondCall() {
		state.check("connection-getList-2");
		connection.getList().then(function(list){
			state.check("connection-foundAll-2");
			deepEqual( map.call(list, getId), map.call(firstItems, getId) );
		}, testHelpers.logErrorAndStart);
	}



	// second time, it should return the original list from localStorage

	// but then update the list as the request goes out

});
