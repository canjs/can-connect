var QUnit = require("steal-qunit");
var connect = require("./can-connect");
var set = require("can-set-legacy");


QUnit.module("can-connect/core test",{
	setup: function(){

	}
});


QUnit.test("Determine .id() from queryLogic (#82)", function(){
	var queryLogic = new set.Algebra(
		set.comparators.id("_id")
	);
	var connection = connect([],{
		queryLogic: queryLogic
	});
	QUnit.equal( connection.id({_id: "foo"}), "foo", "got id from queryLogic");
	QUnit.equal( connection.id({_id: 1}), 1, "got id from queryLogic");
});

QUnit.test("Everything available at can-connect/all", function(){
	var all = require("./all");
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
		'baseMap',
	];
	expectedBehaviors.forEach(function(behaviorName){
		QUnit.ok(all[behaviorName], 'behavior in place: ' + behaviorName);
	});
});

QUnit.test("queryLogic falls", function(){
    var algebra = {};

    var connection = connect([{
        methodThatChecksAlgebra: function(){
            QUnit.equal(this.queryLogic, algebra);
        }
    }],
    {
        algebra: algebra
    });

    connection.methodThatChecksAlgebra();

	connection = connect([{
        methodThatChecksAlgebra: function(){
            QUnit.equal(this.queryLogic, algebra);
        }
    }],
    {
        queryLogic: algebra
    });

	connection.methodThatChecksAlgebra();

    /*
    var connection = connect([
        ,
        base],
    );*/
});
