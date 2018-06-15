var QUnit = require("steal-qunit");
var workerBehavior = require("./worker");
var connect = require("can-connect");

var logErrorAndStart = function(e){
	ok(false,"Error "+e);
	start();
};

if(typeof Worker !== "undefined" && !System.isEnv('production')) {
	QUnit.module("can-connect/data-worker");

	QUnit.test("getListData", function(){
		var connection = connect([workerBehavior],{
			name: "todos",
			worker: new Worker(System.stealURL + "?main=can-connect/data/worker/worker-main_test")
		});

		stop();
		connection.getListData({foo: "bar"})
			.then(function(listData){
				deepEqual(listData,{data: [{id: 1},{id: 2}]}, "got back data");
				start();
			}, logErrorAndStart);
	});
}
