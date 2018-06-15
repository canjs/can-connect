var QUnit = require("steal-qunit");
var fixture = require("can-fixture");
var Map = require("can-map");
var baseMap = require("./base-map");
var GLOBAL = require("can-globals/global/global");
var stealClone = require("steal-clone");
var QueryLogic = require("can-query-logic");

QUnit.module("can-connect/can/base-map");

QUnit.test("uses idProp", function(){

	var Restaurant = Map.extend({});

	var connection = baseMap({
		url: "/api/restaurants",
		queryLogic: new QueryLogic({
			identity: ["id"]
		}),
		Map: Restaurant,
		List: Restaurant.List,
		name: "restaurant"
	});

	fixture({
		"GET /api/restaurants/{_id}": function(request){
			return {id: 5};
		}
	});

	stop();
	connection.getData({_id: 5}).then(function(data){
		deepEqual(data, {id: 5}, "findOne");
		start();
	});


});


QUnit.skip("creates map if none is provided (#8)", function(){

	var connection = baseMap({
		url: "/api/restaurants",
		idProp: '_id',
		name: "restaurant"
	});

	fixture({
		"GET /api/restaurants/{_id}": function(request){
			return {id: 5};
		}
	});

	stop();
	connection.getData({_id: 5}).then(function(data){
		deepEqual(data, {id: 5}, "findOne");
		start();
	});

});

QUnit.test("uses jQuery if loaded", 2, function() {
	stop();
	var old$ = GLOBAL().$;
	var fake$ = {
		ajax: function() {}
	};
	GLOBAL().$ = fake$;
	stealClone({}).import("can-connect/can/base-map/base-map").then(function(baseMap) {
		var connection = baseMap({
			Map: function() {},
			List: function() {},
			url: "/fake"
		});
		QUnit.equal(connection.ajax, fake$.ajax, "ajax is set from existing $");
	}).then(function() {
		GLOBAL().$ = undefined;
		return stealClone({}).import("can-connect/can/base-map/base-map");
	}).then(function(baseMap) {
		var connection = baseMap({
			Map: function() {},
			List: function() {},
			url: ''
		});
		QUnit.equal(connection.ajax, undefined, "ajax is not set when no $");
		GLOBAL().$ = old$;
		start();
	});
});
