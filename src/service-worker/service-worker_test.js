var QUnit = require("steal-qunit");
var serviceWorkerCache = require("can-connect/service-worker/");
var connect = require("can-connect");

if(typeof Worker === "undefined") {
	return;
}

var logErrorAndStart = function(e){
	debugger;
	ok(false,"Error "+e);
	start();
};

var items = [{id: 1, foo:"bar"},{id: 2, foo:"bar"},{id: 3, foo:"bar"}];
var aItems = [{id: 10, name: "A"},{id: 11, name: "A"},{id: 12, name: "A"}];

QUnit.module("can-connect/service-worker",{
	setup: function(){
		this.connection = connect([serviceWorkerCache],{
			name: "todos",
			workerURL: System.stealURL+"?main=src/service-worker/service-worker-main_test"
		});
	}
});

QUnit.test("updateListData", function(){
	var items = [{id: 1, foo:"bar"},{id: 2, foo:"bar"},{id: 3, foo:"bar"}];

	var connection = this.connection;

	stop();
	connection.getListData({foo: "bar"})
		.then(function(listData){
			deepEqual(listData, {data: [{id: 1}, {id: 2}]}, "got back data");
			start();
		}, logErrorAndStart);

});


