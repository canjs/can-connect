var QUnit = require("steal-qunit");
var canSet = require("can/util/util");
var fixture = require("can/util/fixture/fixture");
var persist = require("can-connect/data-url");
var parseData = require("can-connect/data-parse");
var connect = require("can-connect");

QUnit.module("can-connect/data-parse",{
	setup: function(){
		fixture.delay = 1;
	}
});
var logErrorAndStart = function(e){
	ok(false,"Error "+e);
	start();
};

QUnit.test("basics", function(assert){
	
	
	var connection = connect(["data-url","data-parse"],{
		findAllURL: "POST /findAll",
		findOneURL: "DELETE /findOne",
		createURL: "GET /create",
		updateURL: "GET /update/{id}",
		destroyURL: "GET /delete/{id}",
		parseListProp: "items",
		parseInstanceProp: "datas"
	});
	
	fixture({
		"POST /findAll": function(){
			return {items: [{id: 1}]};
		},
		"DELETE /findOne": function(){
			return {datas: {id: 2}};
		},
		"GET /create": function(){
			return {datas: {id: 3}};
		},
		"GET /update/{id}": function(request){
			equal(request.data.id, 3, "update id");
			return {datas: {update: true}};
		},
		"GET /delete/{id}": function(request){
			equal(request.data.id, 3, "update id");
			return {datas: {destroy: true}};
		}
	});
	
	stop();
	connection.getListData({foo: "bar"}).then(function(items){
		deepEqual(items, {data: [{id: 1}]}, "findAll");
		start();
	}, logErrorAndStart);
	
	stop();
	connection.getInstanceData({foo: "bar"}).then(function(data){
		deepEqual(data, {id: 2}, "findOne");
		start();
	},logErrorAndStart);
	
	stop();
	connection.createInstanceData({foo: "bar"}).then(function(data){
		deepEqual(data, {id: 3}, "create");
		start();
	},logErrorAndStart);
	
	stop();
	connection.destroyInstanceData({foo: "bar", id: 3}).then(function(data){
		deepEqual(data, {destroy: true}, "update");
		start();
	},logErrorAndStart);
	
});
