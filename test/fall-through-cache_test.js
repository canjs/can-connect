var QUnit = require("steal-qunit");
var fallThroughCache = require("../fall-through-cache");
var constructor = require("../constructor");
var store = require("../constructor-store");
var connect = require("can-connect");
var canSet = require("can-set");

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

QUnit.test("basics", function(){
	stop();
	var firstItems = [ {id: 0, foo: "bar"}, {id: 1, foo: "bar"} ];
	var secondItems = [ {id: 1, foo: "BAZ"}, {id: 2, foo: "bar"} ];
	
	var names = ["cache-getListData-empty",
		"base-getListData",
		"cache-updateListData",
		"connection-foundAll",
		
		
		"connection-findAll-2",
		"cache-getListData-items",
		"connection-foundAll-2",
		"base-getListData-2",
		"cache-updateListData-2",
		"updatedList"];
		
	var checkState = function(value){
		var state = names.shift();
		equal( state, value, "state check "+state );
		if(state !== value) {
			start();
		}
		return state;
	};
	var state = function(){
		return names[0];
	};
	var nextState = function(){
		return names.shift();
	};
	var cacheConnection = connect([function(){
		var calls = 0;
		return {
			getListData: function(){
				// nothing here first time
				if(state() === "cache-getListData-empty") {
					nextState();
					return asyncReject();
				} else {
					checkState("cache-getListData-items");
					return asyncResolve({data: firstItems.slice(0) });
				}
			},
			updateListData: function(set, data) {
				if(state() === "cache-updateListData") {
					nextState();
					deepEqual(set,{},"got the right set");
					deepEqual(data.data,firstItems, "updateListData items are right");
					return asyncResolve();
				} else {
					deepEqual(data.data,secondItems, "updateListData 2 items are right");
					checkState("cache-updateListData-2");
					return asyncResolve();
				}
			}
		};
	}],{});
	
	var base = function(base, options){
		var calls = 0;
		return {
			getListData: function(){
				if(state() === "base-getListData") {
					nextState();
					return asyncResolve({data: firstItems.slice(0) });
				} else {
					checkState("base-getListData-2");
					return asyncResolve({data: secondItems.slice(0) });
				}
			}
		};
	};
	var updater = function(){
		return {
			updatedList: function(list, updated){
				checkState("updatedList");
				deepEqual( updated.map(getId), secondItems.map(getId) );
				start();
			}
		};
	};
	
	var Person = function(values){
		canSet.helpers.extend(this, values);
	};
	
	var connection = connect([base, "constructor","fall-through-cache","constructor-store", updater],{
		instance: function(values){
			return new Person(values);
		},
		cacheConnection: cacheConnection
	});
	
	// first time, it takes the whole time
	connection.findAll({}).then(function( list ){
		checkState("connection-foundAll");
		deepEqual( list.map(getId), firstItems.map(getId) );
		setTimeout(secondCall, 1);
	});
	
	function secondCall() {
		checkState("connection-findAll-2");
		connection.findAll({}).then(function(list){
			checkState("connection-foundAll-2");
			deepEqual( list.map(getId), firstItems.map(getId) );
		});
	}
	
	// second time, it should return the original list from localStorage
	
	// but then update the list as the request goes out
	
});
