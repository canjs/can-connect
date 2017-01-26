var QUnit = require('steal-qunit');

var DefineMap = require('can-define/map/map');
var DefineList = require('can-define/list/list');
var connect = require('can-connect');
var constructorBehavior = require('can-connect/constructor/constructor');
var constructorStore = require('can-connect/constructor/store/store');
var mapBehavior = require('can-connect/can/map/map');
var hydrateBehavior = require('can-connect/can/constructor-hydrate/constructor-hydrate');

QUnit.module("can-connect/can/constructor-hydrate");

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
		hub: { Type: Hub },
		hub2: { Type: Hub },
	}));

	myPage.hub = {id: 1, name: 'One'};
	HubConnection.addInstanceReference(myPage.hub);
	QUnit.equal(myPage.hub._cid, HubConnection.instanceStore.get(1)._cid, 'CID should match');

	myPage.hub2 = {id: 1, name: 'OnePlus'};
	QUnit.equal(myPage.hub2._cid, HubConnection.instanceStore.get(1)._cid, 'CID of the 2nd property should match');
	QUnit.equal(myPage.hub, myPage.hub2, 'Both properties refer to the same instance');
	QUnit.equal(myPage.hub.name, 'OnePlus', 'The name of the 1st property should be changed since its the same instance now');
});
