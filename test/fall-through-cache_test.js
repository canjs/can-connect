var QUnit = require("steal-qunit");
var fallThroughCache = require("can-connect/fall-through-cache");
var constructor = require("can-connect/constructor");
var store = require("can-connect/constructor-store");
var connect = require("can-connect");
var canSet = require("can-set");
var helpers = require("./test-helpers");
require("can-connect/data-callbacks");

var getId = function(d){ return d.id};

var asyncResolve = function(data) {
	var def = new can.Deferred();
	setTimeout(function(){
		def.resolve(data);
	},1);
	return def;
};
var asyncReject = function(data) {
	var def = new can.Deferred();
	setTimeout(function(){
		def.reject(data);
	},1);
	return def;
};

QUnit.module("can-connect/fall-through-cache");

QUnit.test("basics", function(){
	stop();
	var firstItems = [ {id: 0, foo: "bar"}, {id: 1, foo: "bar"} ];
	var secondItems = [ {id: 1, foo: "BAZ"}, {id: 2, foo: "bar"} ];
	
	var state = helpers.makeStateChecker(QUnit,["cache-getListData-empty",
		"base-getListData",
		"cache-updateListData",
		"connection-foundAll",
		
		
		"connection-findAll-2",
		"cache-getListData-items",
		"connection-foundAll-2",
		"base-getListData-2",
		"cache-updateListData-2",
		"updatedList"] );
		

	var cacheConnection = connect([function(){
		var calls = 0;
		return {
			getListData: function(){
				// nothing here first time
				if(state.get() === "cache-getListData-empty") {
					state.next();
					return asyncReject();
				} else {
					state.check("cache-getListData-items");
					return asyncResolve({data: firstItems.slice(0) });
				}
			},
			updateListData: function(data, set) {
				if(state.get() === "cache-updateListData") {
					state.next();
					deepEqual(set,{},"got the right set");
					deepEqual(data.data,firstItems, "updateListData items are right");
					return asyncResolve();
				} else {
					deepEqual(data.data,secondItems, "updateListData 2 items are right");
					state.check("cache-updateListData-2");
					return asyncResolve();
				}
			}
		};
	}],{});
	
	var base = function(base, options){
		var calls = 0;
		return {
			getListData: function(){
				if(state.get() === "base-getListData") {
					state.next();
					return asyncResolve({data: firstItems.slice(0) });
				} else {
					state.check("base-getListData-2");
					return asyncResolve({data: secondItems.slice(0) });
				}
			}
		};
	};
	var updater = function(){
		return {
			updatedList: function(list, updated){
				state.check("updatedList");
				deepEqual( updated.data.map(getId), secondItems.map(getId) );
				start();
			}
		};
	};
	
	var connection = connect([base, "constructor","fall-through-cache","constructor-store", "data-callbacks",updater],{
		cacheConnection: cacheConnection
	});
	
	// first time, it takes the whole time
	connection.findAll({}).then(function( list ){
		state.check("connection-foundAll");
		deepEqual( list.map(getId), firstItems.map(getId) );
		setTimeout(secondCall, 1);
	}, helpers.logErrorAndStart);
	
	function secondCall() {
		state.check("connection-findAll-2");
		connection.findAll({}).then(function(list){
			state.check("connection-foundAll-2");
			deepEqual( list.map(getId), firstItems.map(getId) );
		}, helpers.logErrorAndStart);
	}
	
	
	
	// second time, it should return the original list from localStorage
	
	// but then update the list as the request goes out
	
});


QUnit.test("findOne and getInstanceData", function(){
	stop();
	var firstData =  {id: 0, foo: "bar"};
	var secondData = {id: 0, foo: "BAR"};
	
	var state = helpers.makeStateChecker(QUnit,["cache-getInstanceData-empty",
		"base-getInstanceData",
		"cache-updateInstanceData",
		"connection-foundOne",
		"connection-findOne-2",
		"cache-getInstanceData-item",
		
		"connection-foundOne-2",
		"base-getInstanceData-2",
		"cache-updateInstanceData-2",
		"updatedInstance"] );
		

	var cacheConnection = connect([function(){
		var calls = 0;
		return {
			getInstanceData: function(){
				// nothing here first time
				if(state.get() === "cache-getInstanceData-empty") {
					state.next();
					return asyncReject();
				} else {
					state.check("cache-getInstanceData-item");
					return asyncResolve(firstData);
				}
			},
			updateInstanceData: function(data) {
				if(state.get() === "cache-updateInstanceData") {
					state.next();
					deepEqual(data,firstData, "updateInstanceData items are right");
					return asyncResolve();
				} else {
					//debugger;
					deepEqual(data,secondData, "updateInstanceData 2 items are right");
					state.check("cache-updateInstanceData-2");
					return asyncResolve();
				}
			}
		};
	}],{});
	
	var base = function(base, options){
		var calls = 0;
		return {
			getInstanceData: function(){
				if(state.get() === "base-getInstanceData") {
					state.next();
					return asyncResolve({id: 0, foo: "bar"});
				} else {
					//debugger;
					state.check("base-getInstanceData-2");
					return asyncResolve({id: 0, foo: "BAR"});
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
	
	var connection = connect([base, "constructor","fall-through-cache","constructor-store", "data-callbacks",updater],{
		cacheConnection: cacheConnection
	});
	
	// first time, it takes the whole time
	connection.findOne({id: 0}).then(function( instance ){
		state.check("connection-foundOne");
		deepEqual( instance, {id: 0, foo: "bar"} );
		setTimeout(secondCall, 1);
	}, helpers.logErrorAndStart);
	
	function secondCall() {
		state.check("connection-findOne-2");
		connection.findOne({id: 0}).then(function(instance){
			state.check("connection-foundOne-2");
			deepEqual( instance, {id: 0, foo: "bar"}  );
		}, helpers.logErrorAndStart);
	}
	
});
