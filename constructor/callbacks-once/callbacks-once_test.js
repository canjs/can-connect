var connect = require("can-connect/can-connect");
var QUnit = require("steal-qunit");
var realTime = require("can-connect/real-time/");
var constructor = require("can-connect/constructor/");
var constructorStore = require("can-connect/constructor/store/");
var canMap = require("can-connect/can/map/");
var dataCallbacks = require("can-connect/data/callbacks/");
var callbacksOnce = require("can-connect/constructor/callbacks-once/");
var dataUrl = require("can-connect/data/url/url");
var DefineMap = require('can-define/map/');
require('can-define/list/list');

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

QUnit.test("different methods should not refer to the same item", function(assert){
	var done = assert.async();

	var Session = DefineMap.extend({
		email: 'string'
	});
	Session.connection = connect([
		constructor,
		canMap,
		constructorStore,
		dataCallbacks,
		realTime,
		callbacksOnce,
		function(baseConnection){
			return {
				createdInstance: function(instance, props){
					// Keep instance in instanceStore:
					this.addInstanceReference(instance);
					baseConnection.createdInstance.apply(this, arguments);
				},
				// simulate a connection like dataUrl:
				destroyData: function(data){
					return Promise.resolve(data);
				}
			}
		}
	], {
		Map: Session
	});

	var createdCalled = 0;
	Session.on("created", function(){
		createdCalled++;
	});

	var destroyedCalled = 0;
	Session.on("destroyed", function(){
		destroyedCalled++;
	});

	Session.connection.createInstance({
		id: 100,
		email: 'ilya@bitovi.com'
	}).then(function(instance){
		QUnit.equal(createdCalled, 1, "created event should be called");
		return instance.destroy().then(function(){
			QUnit.equal(destroyedCalled, 1, "destroyed event should be called");
			Session.connection;
			done();
		}).catch(function(err){
			QUnit.ok(false, 'should not be any errors');
			done();
		});
	});
});