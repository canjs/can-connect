var connect = require("can-connect/can-connect");
var QUnit = require("steal-qunit");
var realTime = require("can-connect/real-time/");
var constructor = require("can-connect/constructor/");
var constructorStore = require("can-connect/constructor/store/");
var canMap = require("can-connect/can/map/");
var dataCallbacks = require("can-connect/data/callbacks/");
var callbacksOnce = require("can-connect/constructor/callbacks-once/");
var DefineMap = require('can-define/map/');

QUnit.module("can-connect/callbacks-once");

QUnit.test('createInstance triggers a "created" event', function(assert){
	var done = assert.async();

	var Session = DefineMap.extend({
		id: 'any',
		email: 'string'
	});

	var connection = connect([
		constructor,
		canMap,
		constructorStore,
		dataCallbacks,
		realTime,
		callbacksOnce
	], {
		Map: Session
	});

	Session.on('created', function (event) {
		assert.ok(event, 'createInstance triggered the "created" event');
		done();
	});

	connection.createInstance({
		id: 5,
		email: 'marshall@bitovi.com'
	});
});
