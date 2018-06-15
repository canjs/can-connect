var QUnit = require("steal-qunit");
var serviceWorkerCache = require("./service-worker");
var connect = require("../can-connect");

var logErrorAndStart = function(e){
	ok(false,"Error "+e);
	start();
};

if(typeof Worker !== "undefined" && !System.isEnv('production')) {
	QUnit.module("can-connect/service-worker",{
		setup: function(){
			this.connection = connect([serviceWorkerCache],{
				name: "todos",
				workerURL: System.stealURL + "?main=can-connect/service-worker/service-worker-main_test"
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
}
