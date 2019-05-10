var QUnit = require("steal-qunit");
var fixture = require("can-fixture");
var connect = require("../../can-connect");
var dataUrl = require("../../data/url/url"),
	dataParse = require("../../data/parse/parse");

QUnit.module("can-connect/data-parse",{
	beforeEach: function(assert) {
		fixture.delay = 1;
	}
});
var logErrorAndStart = function(e){
	assert.ok(false,"Error "+e);
	done();
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
			assert.equal(request.data.id, 3, "update id");
			return {datas: {update: true}};
		},
		"GET /delete/{id}": function(request){
			assert.equal(request.data.id, 3, "update id");
			return {datas: {destroy: true}};
		}
	});

	var done = assert.async();
	connection.getListData({foo: "bar"}).then(function(items){
		assert.deepEqual(items, {data: [{id: 1}]}, "getList");
		done();
	}, logErrorAndStart);

	var done = assert.async();
	connection.getData({foo: "bar"}).then(function(data){
		assert.deepEqual(data, {id: 2}, "getInstance");
		done();
	},logErrorAndStart);

	var done = assert.async();
	connection.createData({foo: "bar"}).then(function(data){
		assert.deepEqual(data, {id: 3}, "create");
		done();
	},logErrorAndStart);

	var done = assert.async();
	connection.destroyData({foo: "bar", id: 3}).then(function(data){
		assert.deepEqual(data, {destroy: true}, "update");
		done();
	},logErrorAndStart);

});

QUnit.test("parseListData and parseInstanceData don't use options correctly (#27)", function(assert) {

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
			assert.equal(request.data.id, 3, "update id");
			return {datas: {update: true}};
		},
		"GET /delete/{id}": function(request){
			assert.equal(request.data.id, 3, "update id");
			return {datas: {destroy: true}};
		}
	});

	var done = assert.async();
	connection.getListData({foo: "bar"}).then(function(items){
		assert.deepEqual(items, {data: [{id: 1}]}, "getList");
		done();
	}, logErrorAndStart);

	var done = assert.async();
	connection.getData({foo: "bar"}).then(function(data){
		assert.deepEqual(data, {id: 2}, "getInstance");
		done();
	},logErrorAndStart);

});
