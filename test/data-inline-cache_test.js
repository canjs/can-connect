var QUnit = require("steal-qunit");
var fallThroughCache = require("../fall-through-cache");
var dataInlineCache = require("../data-inline-cache");
var constructor = require("../constructor");
var store = require("../constructor-store");
var connect = require("can-connect");
var canSet = require("can-set");
var helpers = require("./test-helpers");
require("../data-callbacks");

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
	
	
	var state = helpers.makeStateChecker(QUnit,[
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
				state.check("base-getListData-2");
				return asyncResolve({data: secondItems.slice(0) });
				
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
	
	var connection = connect([base, "constructor","fall-through-cache","data-inline-cache","constructor-store", "data-callbacks",updater],{
		cacheConnection: cacheConnection,
		name: "items"
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


