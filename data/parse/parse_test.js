var QUnit = require("steal-qunit");
var fixture = require("can-fixture");
var connect = require("../../can-connect");
var dataUrl = require("../../data/url/url"),
	dataParse = require("../../data/parse/parse");

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

	var connection = connect([dataUrl,dataParse],{
		url: {
			getListData: "POST /getList",
			getData: "DELETE /getInstance",
			createData: "GET /create",
			updateData: "GET /update/{id}",
			destroyData: "GET /delete/{id}"
		},
		parseListProp: "items",
		parseInstanceProp: "datas"
	});

	fixture({
		"POST /getList": function(){
			return {items: [{id: 1}]};
		},
		"DELETE /getInstance": function(){
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
		deepEqual(items, {data: [{id: 1}]}, "getList");
		start();
	}, logErrorAndStart);

	stop();
	connection.getData({foo: "bar"}).then(function(data){
		deepEqual(data, {id: 2}, "getInstance");
		start();
	},logErrorAndStart);

	stop();
	connection.createData({foo: "bar"}).then(function(data){
		deepEqual(data, {id: 3}, "create");
		start();
	},logErrorAndStart);

	stop();
	connection.destroyData({foo: "bar", id: 3}).then(function(data){
		deepEqual(data, {destroy: true}, "update");
		start();
	},logErrorAndStart);

});

test("parseListData and parseInstanceData don't use options correctly (#27)", function(){

	var connection = connect([dataUrl,dataParse],{
		url: {
			getListData: "POST /getList",
			getData: "DELETE /getInstance",
			createData: "GET /create",
			updateData: "GET /update/{id}",
			destroyData: "GET /delete/{id}"
		},
		parseListData: function(responseData){
			return responseData.items;
		},
		parseInstanceData: function(responseData){
			return responseData.datas;
		}
	});

	fixture({
		"POST /getList": function(){
			return {items: [{id: 1}]};
		},
		"DELETE /getInstance": function(){
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
		deepEqual(items, {data: [{id: 1}]}, "getList");
		start();
	}, logErrorAndStart);

	stop();
	connection.getData({foo: "bar"}).then(function(data){
		deepEqual(data, {id: 2}, "getInstance");
		start();
	},logErrorAndStart);

});
