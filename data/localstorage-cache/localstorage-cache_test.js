var QUnit = require("steal-qunit");
var dataLocalStorage = require("./localstorage-cache");
var connect = require("../../can-connect");
var canSet = require("can-set-legacy");

var logErrorAndStart = function(e){
	ok(false,"Error "+e);
	start();
};

var items = [{id: 1, foo:"bar"},{id: 2, foo:"bar"},{id: 3, foo:"bar"}];
var aItems = [{id: 10, name: "A"},{id: 11, name: "A"},{id: 12, name: "A"}];

QUnit.module("can-connect/data-localstorage-cache",{
	setup: function(){
		this.connection = connect([dataLocalStorage],{
			name: "todos",
			queryLogic: new canSet.Algebra()
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

			deepEqual(listData.data, items.concat([{id: 4, foo:"bar"}]), "updateData added item 4");

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

			deepEqual(listData.data, [{id: 4, name:"A"}].concat(aItems), "id 4 should now have name A");

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

			deepEqual(listData.data, [{id: 5, name:"A"}].concat(aItems));

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

QUnit.test("using queryLogic (#72)", function(){
	var connection = this.connection;

	connection.queryLogic = new canSet.Algebra(new canSet.Translate("where","$where"));
	QUnit.stop();
	connection.updateListData(
		{ data: [{id: 1, placeId: 2, name: "J"}] },
		{$where: {placeId: 2}}
		).then(function(){
		connection.updateData({id: 1, placeId: 2, name: "B"}).then(function(){
			connection.getListData({$where: {placeId: 2}}).then(function(items){
				QUnit.equal(items.data.length, 1, "still have the item");
				QUnit.start();
			});
		});
	});
});


QUnit.test("subset data (#96)", function(){
	var connection = this.connection;
	QUnit.stop();

	connection.updateListData({ data: [{id: 1, completed: true}, {id: 2, completed: false}] }, {}).then(function(){
		connection.getListData({completed: true}).then(function(items){
			QUnit.equal(items.data.length, 1, "should get completed items from cache");
			QUnit.start();
		}, function(){
			ok(false, "should have gotten completed items from cache");
			QUnit.start();
		});
	});
});


QUnit.asyncTest("pagination loses the bigger set (#126)", function(){
	var todosAlgebra = new canSet.Algebra(
		canSet.props.offsetLimit("offset","limit")
	);

	var connection = connect([dataLocalStorage],{
		name: "todos",
		queryLogic: todosAlgebra
	});

	connection.updateListData(
		{ data: [{id: 0},{id: 1}] },
		{ offset: 0, limit: 2}).then(function(){

		return connection.updateListData(
			{ data: [{id: 2},{id: 3}] },
			{ offset: 2, limit: 2});
	}).then(function(){
		connection.getListData({ offset: 0, limit: 2}).then(function(listData){
			QUnit.deepEqual(listData, { data: [{id: 0},{id: 1}], count: 4 });
			QUnit.start();
		}, function(){
			QUnit.ok(false, "no data");
			QUnit.start();
		});
	}).catch(function(e){
		console.log(e);
		QUnit.ok(false, "something broke");
		QUnit.start();
	});


});
