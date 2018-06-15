var QUnit = require("steal-qunit");
var callbacksCache = require("./callbacks-cache");



QUnit.module("can-connect/data/callbacks-cache",{
	setup: function(){
	}
});


/*
QUnit.test("basics", function(){
	var cacheConnection = {
		createData: function(data){
			QUnit.deepEqual(data, {id: 1});
		},
		updateData: function(data){
			QUnit.deepEqual(data, {createdAt:3, id: 2});
		},
		destroyData: function(){
			QUnit.deepEqual(data, {createdAt:4, id: 3});
		}
	};

	var connection = callbacksCache({
		cacheConnection: cacheConnection,
		createdData: function(){},
		updatedData: function(){},
		destroyedData: function(){}
	});
	connection.createdData({id: 1}, {foo: "bar"});
	connection.updatedData({createdAt:3, id: 2}, {foo: "bar", id: 1, createdAt: 2});
	connection.destroyedData({createdAt:4, id: 3}, {foo: "bar", id: 1, createdAt: 3});

});*/


QUnit.test("if the server responds with success, the callbacks still get passed the original object", function(){
	var cacheConnection = {
		createData: function(data){
			QUnit.deepEqual(data, {id: 1, foo: "bar"});
		},
		updateData: function(data){
			QUnit.deepEqual(data, {foo: "bar", id: 1, createdAt: 3});
		},
		destroyData: function(data){
			QUnit.deepEqual(data, {foo: "bar", id: 1, createdAt: 4});
		}
	};

	var connection = callbacksCache({
		cacheConnection: cacheConnection,
		keepMissingProperties: true
	});
	connection.createdData({id: 1}, {foo: "bar"});
	connection.updatedData({createdAt:3}, {foo: "bar", id: 1, createdAt: 2});
	connection.destroyedData({createdAt:4}, {foo: "bar", id: 1, createdAt: 3});

});
