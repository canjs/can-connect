var QUnit = require("steal-qunit");
var connect = require("can-connect");
var set = require("can-set");


QUnit.module("can-connect/core test",{
	setup: function(){

	}
});


QUnit.test("Determine .id() from algebra (#82)", function(){
	var algebra = new set.Algebra(
		set.comparators.id("_id")
	);
	var connection = connect([],{
		algebra: algebra
	});
	QUnit.equal( connection.id({_id: "foo"}), "foo", "got id from algebra");
	QUnit.equal( connection.id({_id: 1}), 1, "got id from algebra");
});

QUnit.test("Everything available at can-connect/all", function(){
	var all = require("can-connect/all");
	var expectedBehaviors = [
		'cacheRequests',
		'constructor',
		'constructorCallbacksOnce',
		'constructorStore',
		'dataCallbacks',
		'dataCallbacksCache',
		'dataCombineRequests',
		'dataLocalStorageCache',
		'dataMemoryCache',
		'dataParse',
		'dataUrl',
		'fallThroughCache',
		'realTime',
		'superMap',
		'tag',
		'baseMap',
	];
	expectedBehaviors.forEach(function(behaviorName){
		QUnit.ok(all[behaviorName], 'behavior in place: ' + behaviorName);
	});
});
