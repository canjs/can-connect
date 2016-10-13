var QUnit = require("steal-qunit");
var serviceWorkerCache = require("can-connect/service-worker/");
var connect = require("can-connect");

if(typeof Worker === "undefined") {
	return;
}

var logErrorAndStart = function(e){
	ok(false,"Error "+e);
	start();
};

QUnit.module("can-connect/service-worker",{
	setup: function(){
		var workerMainURL = 'can-connect/service-worker/service-worker-main_test';

		this.connection = connect([serviceWorkerCache],{
			name: "todos",
			workerURL: System.stealURL + "?main=" + workerMainURL
		});
	}
});

QUnit.test("updateListData", function(){
	var connection = this.connection;

	stop();
	connection.getListData({foo: "bar"})
		.then(function(listData){
			deepEqual(listData, {data: [{id: 1}, {id: 2}]}, "got back data");
			start();
		}, logErrorAndStart);

});
