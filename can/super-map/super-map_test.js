var QUnit = require("steal-qunit");
var fixture = require("can-fixture");
var Map = require("can-map");
var DefineMap = require("can-define/map/map");
var DefineList = require("can-define/list/list");
var superMap = require("./super-map");
var set = require("can-set-legacy");
var GLOBAL = require("can-globals/global/global");
var stealClone = require("steal-clone");
var QueryLogic = require("can-query-logic");

QUnit.module("can-connect/can/super-map",{
	setup: function(){
		localStorage.clear();
	}
});

QUnit.test("uses idProp", function(){

	var Restaurant = Map.extend({});

	var connection = superMap({
		url: "/api/restaurants",
		idProp: '_id',
		Map: Restaurant,
		queryLogic: new QueryLogic({
			identity: ["id"]
		}),
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

	var connection = superMap({
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

QUnit.test("allow other caches (#59)", function(){

	var cacheConnection = {
		getData: function(){
			ok(true, "called this cacheConnection");
			return Promise.resolve({id: 5});
		}
	};
	var Restaurant = DefineMap.extend({seal:false},{});
	Restaurant.List = DefineList.extend({"#": Restaurant});

	var connection = superMap({
		url: "/api/restaurants",
		name: "restaurant",
		cacheConnection: cacheConnection,
		Map: Restaurant
	});

	fixture({
		"GET /api/restaurants/{_id}": function(request){
			return {id: 5};
		}
	});

	stop();
	connection.getData({_id: 5}).then(function(data){
		start();
	});
});

QUnit.test("uses idProp from queryLogic (#255)", function(){

	var Restaurant = Map.extend({});

	var connection = superMap({
		url: "/api/restaurants",
		Map: Restaurant,
		List: Restaurant.List,
		name: "restaurant",
		queryLogic: new set.Algebra(
		   set.props.id("_id")
		)
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
	stealClone({}).import("can-connect/can/super-map/super-map").then(function(superMap) {
		var connection = superMap({
			Map: function() {},
			List: function() {},
			url: ''
		});
		QUnit.equal(connection.ajax, fake$.ajax, "ajax is set from existing $");
	}).then(function() {
		GLOBAL().$ = undefined;
		return stealClone({}).import("can-connect/can/super-map/super-map");
	}).then(function(superMap) {
		var connection = superMap({
			Map: function() {},
			List: function() {},
			url: ''
		});
		QUnit.equal(connection.ajax, undefined, "ajax is not set when no $");
		GLOBAL().$ = old$;
		start();
	});
});
