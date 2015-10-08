var QUnit = require("steal-qunit");
var dataLocalStorage = require("can-connect/data/localstorage-cache/");
var connect = require("can-connect");
require("when/es6-shim/Promise");

var logErrorAndStart = function(e){
	debugger;
	ok(false,"Error "+e);
	start();
};

var items = [{id: 1, foo:"bar"},{id: 2, foo:"bar"},{id: 3, foo:"bar"}];
var aItems = [{id: 10, name: "A"},{id: 11, name: "A"},{id: 12, name: "A"}];

QUnit.module("can-connect/data-localstorage-cache",{
	setup: function(){
		this.connection = connect([dataLocalStorage],{
			name: "todos"
		});
		this.connection.clear();
	}
});

QUnit.test("updateListData", function(){
	var items = [{id: 1, foo:"bar"},{id: 2, foo:"bar"},{id: 3, foo:"bar"}];

	var connection = this.connection;

	stop();
	connection.getListData({foo: "bar"})
		.then(function(){
			ok(false, "should have rejected, nothing there");
			start();
		}, function(){
			connection.updateListData({ data: items.slice(0) }, {foo: "bar"})
				.then(function(){

					connection.getListData({foo: "bar"}).then(function(listData){

						deepEqual(listData.data, items);

						start();

					},logErrorAndStart);

				}, logErrorAndStart);

		});

});



QUnit.test("updateData", function(){

	var connection = this.connection;

	stop();


	var a1 = connection.updateListData({ data: items.slice(0) }, {foo: "bar"});

	var a2 = connection.updateListData({ data: aItems.slice(0) }, {name: "A"});

	Promise.all([a1, a2]).then(updateItem,logErrorAndStart );
	function updateItem(){
		connection.updateData({id: 4, foo:"bar"}).then(checkItems, logErrorAndStart);
	}
	function checkItems() {
		connection.getListData({foo: "bar"}).then(function(listData){

			deepEqual(listData.data, items.concat({id: 4, foo:"bar"}), "updateData added item 4");

			updateItem2();

		},logErrorAndStart);
	}
	function updateItem2(){
		connection.updateData({id: 4, name:"A"}).then(checkItems2, logErrorAndStart);
	}
	function checkItems2() {
		connection.getListData({foo: "bar"}).then(function(listData){

			deepEqual(listData.data, items,"item 4 no longer in foo");

			checkItems3();

		},logErrorAndStart);
	}
	function checkItems3() {
		connection.getListData({name: "A"}).then(function(listData){

			deepEqual(listData.data, aItems.concat([{id: 4, name:"A"}]), "id 4 should now have name A");

			start();

		},logErrorAndStart);
	}
});

QUnit.test("createData", function(){

	var connection = this.connection;

	stop();


	var a1 = connection.updateListData({ data: items.slice(0) }, {foo: "bar"});

	var a2 = connection.updateListData( { data: aItems.slice(0) }, {name: "A"});

	Promise.all([a1, a2]).then(createItem,logErrorAndStart );
	function createItem(){
		connection.createData({id: 4, foo:"bar"}).then(checkItems, logErrorAndStart);
	}
	function checkItems() {
		connection.getListData({foo: "bar"}).then(function(listData){

			deepEqual(listData.data, items.concat({id: 4, foo:"bar"}), "updateData added item 4");

			createItem2();

		},logErrorAndStart);
	}
	function createItem2(){
		connection.updateData({id: 5, name:"A"}).then(checkItems2, logErrorAndStart);
	}
	function checkItems2() {
		connection.getListData({foo: "bar"}).then(function(listData){

			deepEqual(listData.data, items.concat({id: 4, foo:"bar"}),"item 4 sill in foo");

			checkItems3();

		},logErrorAndStart);
	}
	function checkItems3() {
		connection.getListData({name: "A"}).then(function(listData){

			deepEqual(listData.data, aItems.concat([{id: 5, name:"A"}]));

			start();

		},logErrorAndStart);
	}
});

QUnit.test("destroyData", function(){

	var connection = this.connection;

	stop();


	var a1 = connection.updateListData({ data: items.slice(0) }, {foo: "bar"});

	var a2 = connection.updateListData({ data: aItems.slice(0) }, {name: "A"});

	Promise.all([a1, a2]).then(destroyItem,logErrorAndStart );
	function destroyItem(){
		connection.destroyData({id: 1, foo:"bar"}).then(checkItems, logErrorAndStart);
	}
	function checkItems() {
		connection.getListData({foo: "bar"}).then(function(listData){

			deepEqual(listData.data, items.slice(1), "updateData removed 1st item");

			destroyItem2();

		},logErrorAndStart);
	}
	function destroyItem2(){
		connection.destroyData({id: 10, name: "A"}).then(checkItems2, logErrorAndStart);
	}
	function checkItems2() {
		connection.getListData({foo: "bar"}).then(function(listData){

			deepEqual(listData.data, items.slice(1),"item 4 sill in foo");

			checkItems3();

		},logErrorAndStart);
	}
	function checkItems3() {
		connection.getListData({name: "A"}).then(function(listData){

			deepEqual(listData.data, aItems.slice(1) );

			start();

		},logErrorAndStart);
	}
});

QUnit.test("getData can pull from updateListData", function(){
	var items = [{id: 1, foo:"bar"},{id: 2, foo:"bar"},{id: 3, foo:"bar"}];

	var connection = this.connection;

	stop();
	connection.getData({id: 1})
		.then(function(){
			ok(false, "should have rejected, nothing there");
			start();
		}, updateListData);

	function updateListData(){
		connection.updateListData({ data: items.slice(0) }, {foo: "bar"})
			.then(function(){
				connection.getData({id: 1}).then(function(instanceData){

					deepEqual(instanceData, items[0]);

					updateData();

				},logErrorAndStart);

			}, logErrorAndStart);
	}

	function updateData(){
		connection.updateData({id: 1, foo:"BAR"}).then(function(){

			connection.getData({id: 1}).then(function(instanceData){

				deepEqual(instanceData, {id: 1, foo:"BAR"});

				setTimeout(destroyData, 1);

			},logErrorAndStart);

		}, logErrorAndStart);
	}

	function destroyData(){
		connection.destroyData({id: 1, foo:"BAR"}).then(function(){

			connection.getData({id: 1}).then(logErrorAndStart,function(){
				ok(true, "nothing there!");
				start();
			});

		}, logErrorAndStart);
	}

});

QUnit.test("clearing localStorage clears set info", function(){
	var connection = this.connection;

	QUnit.stop();

	connection.updateListData({ data: items.slice(0) }, {foo: "bar"}).then(function(){
		connection.getListData({foo: "bar"}).then(function(){

			localStorage.clear();

			connection.getSets().then(function(sets){
				QUnit.deepEqual(sets, []);
				QUnit.start();

			});

		});
	});
});

