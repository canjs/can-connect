var QUnit = require("steal-qunit");
var fixture = require("can/util/fixture/fixture");
var Map = require("can/map/map");
var superMap = require("can-connect/can/super-map/");

QUnit.test("uses idProp", function(){

	var Restaurant = Map.extend({});

	var connection = superMap({
		url: "/api/restaurants",
		idProp: '_id',
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
