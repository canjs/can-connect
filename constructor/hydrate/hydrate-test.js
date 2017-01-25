var QUnit = require('steal-qunit');

var DefineMap = require('can-define/map/map');
var DefineList = require('can-define/list/list');
var connect = require('can-connect');
var constructorBehavior = require('can-connect/constructor/constructor');
var constructorStore = require('can-connect/constructor/store/store');
var mapBehavior = require('can-connect/can/map/map');
var hydrateBehavior = require('can-connect/constructor/hydrate/hydrate');

console.log("can-connect/constructor/hydrate");
QUnit.module("can-connect/constructor/hydrate");

QUnit.test("basics", function(){
	var Hub = DefineMap.extend({});
	Hub.List = DefineList.extend({
		'#': { Type: Hub }
	});
	var HubConnection = connect([
		constructorBehavior,
		constructorStore,
		mapBehavior,
		hydrateBehavior,
	], { Map: Hub, List: Hub.List });
	var myPage = new (DefineMap.extend({
		hub: { Type: Hub }
	}));

	myPage.hub = {id: 1};
	HubConnection.addInstanceReference(myPage.hub);
	QUnit.equal(myPage.hub._cid, HubConnection.instanceStore.get(1)._cid, 'CID should match');

	myPage.hub = {id: 1};
	QUnit.equal(myPage.hub._cid, HubConnection.instanceStore.get(1)._cid, 'CID should match again');
});
