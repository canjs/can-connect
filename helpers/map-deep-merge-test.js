var DefineMap = require('can-define/map/map');
var DefineList = require('can-define/list/list');
var set = require('can-set');
var fixture = require('can-fixture');
var canEvent = require("can-event");
var canLog = require("can-util/js/log/log");

var connect = require('can-connect');
var canMap = require('can-connect/can/map/map');
var dataUrl = require('can-connect/data/url/url');
var constructor = require('can-connect/constructor/constructor');
var constructorStore = require('can-connect/constructor/store/store');

var smartMerge = require('./map-deep-merge');
var applyPatch = require('./map-deep-merge').applyPatch;
var applyPatchPure = smartMerge.applyPatchPure;
var mergeInstance = smartMerge.mergeInstance;
var mergeList = smartMerge.mergeList;
var idFromType = smartMerge.idFromType;

var QUnit = require('steal-qunit');
QUnit.noop = function(){};

//  Orig data:
//	var origData = {
//		id: 1,
//		month: 'Feb',
//		osProjects: [ { id: 1, title: 'canjs' }, {id: 2, title: 'jQuery++'} ],
//		author: {id: 5, name: 'ilya'}
//	};
//
//  Updated data:
//	var updatedData = {
//		id: 1,
//		month: 'February',
//		osProjects: [ { id: 1, title: 'CanJS' }, {id: 3, title: 'StealJS'}, {id: 2, title: 'jQuery++'} ],
//		author: {id: 6, name: 'ilya'}
//	};
//
// List of changes that should be applied on update:
//	contributionMonth.name = 'February'; // 1
//	contributionMonth.osProjects[0].name = 'CanJS'; // 2
//	contributionMonth.osProjects.splice(1,0, new OSProject({id: 3, name: 'StealJS'}) ) // 3
//	contributionMonth.author = hydrateInstance( {id: 6, name: 'ilya'} ) // 4

var OSProject, Author, ContributionMonth, origEventDispatch, events;

// Setup:
Author = DefineMap.extend({
	id: {type: 'number'},
	name: {type: 'string'}
});
Author.algebra = new set.Algebra( set.props.id('id') );

OSProject = DefineMap.extend({
	id: {type: 'number'},
	title: {type: 'string'}
});
OSProject.List = DefineList.extend({ '#' : OSProject });
OSProject.algebra = new set.Algebra( set.props.id('id') );

ContributionMonth = DefineMap.extend({
	author: Author,
	osProjects: OSProject.List
});

QUnit.module('helpers map-deep-merge', {
	setup: function(){
		events = [];
		origEventDispatch = canEvent.dispatch;
		canEvent.dispatch = function(ev){
			//canLog.log('!!! canEvent.dispatch !!! ' + JSON.stringify(ev), arguments);
			var eventInfo = {
				type: ev.type || ev,
				target: ev.target && ev.target.serialize()
			};
			events.push(eventInfo);
			return origEventDispatch.apply(this, arguments);
		};
	},
	teardown: function(){
		canEvent.dispatch = origEventDispatch;
	}
});

QUnit.test('smartMerge simple object', function(assert) {
	var item = new ContributionMonth({
		id: 1,
		month: 'feb'
	});
	var data = {
		id: 1,
		month: 'February'
	};

	events = [];
	smartMerge(item, data);

	assert.deepEqual(item.serialize(), data, 'updated data should be correct');
	assert.equal(events.length, 1, 'should dispatch only one event');
	assert.deepEqual(events[0].type, 'month', 'should dispatch only "month" event: ' + JSON.stringify(events));
});

QUnit.test('smartMerge nested objects', function(assert) {
	var item = new ContributionMonth({
		id: 1,
		author: {id: 6, name: 'ily'}
	});
	var data1 = {
		id: 1,
		author: {id: 6, name: 'Ilya'}
	};
	var data2 = {
		id: 1,
		author: {id: 7, name: 'Peter'}
	};

	events = [];
	smartMerge(item, data1);
	assert.deepEqual(item.serialize(), data1, 'nested object MERGE');
	assert.deepEqual(events.map( prop('type') ), ['name'], 'should dispatch only "name" event');

	events = [];
	smartMerge(item, data2);
	assert.deepEqual(item.serialize(), data2, 'nested object REPLACE');
	assert.deepEqual(events.map( prop('type') ), ['author'], 'should dispatch 1 event: author: ' + JSON.stringify(events));

	canLog.log('events::', events);
});

QUnit.test('smartMerge list of maps', function(assert) {
	var item = new ContributionMonth({
		osProjects: [ { id: 1, title: 'can' }, {id: 2, title: 'jQuery++'} ]
	});
	var data = {
		osProjects: [ { id: 1, title: 'CanJS' }, {id: 2, title: 'jQuery++'} ]
	};

	events = [];
	smartMerge(item, data);
	assert.deepEqual(item.serialize(), data, 'updated data should be correct for the UPDATE');
	assert.deepEqual(events.map( prop('type') ), ['title'], 'should dispatch only "title" event');

	item = new ContributionMonth({
		osProjects: [ { id: 1, title: 'can' }, {id: 2, title: 'jQuery++'} ]
	});
	data = {
		osProjects: [ { id: 1, title: 'can' }, {id: 3, title: 'StealJS'}, {id: 2, title: 'jQuery++'} ]
	};
	events = [];
	smartMerge(item, data);
	canLog.log('events after smartMerge: ', events);
	assert.deepEqual(item.serialize(), data, 'updated data should be correct for the INSERT');
	assert.deepEqual(events.map( prop('type') ), ['add','length'], 'should dispatch correct events: add, length (for insertion)');
});

QUnit.test('smartMerge can-connect behavior', function(assert) {
	var done = assert.async();

	// Fixtures for connection
	fixture('PUT /contribution-month/{id}', function(){
		canLog.log('fixture here');
		return updatedData;
	});

	// Behaviour that uses the smartMerge
	var canMapMergeBehaviour = {
		updatedInstance: function(instance, props){
			smartMerge( instance, props );
			canMap.callbackInstanceEvents('updated', instance);
		}
	};

	// Orig data:
	var origData = {
		id: 1,
		name: 'Feb',
		osProjects: [ { id: 1, name: 'canjs' }, {id: 2, name: 'jQuery++'} ],
		author: {id: 5, name: 'ilya'}
	};

	// Updated data:
	var updatedData = {
		id: 1,
		name: 'February',
		osProjects: [ { id: 1, name: 'CanJS' }, {id: 3, name: 'StealJS'}, {id: 2, name: 'jQuery++'} ],
		author: {id: 6, name: 'ilya'}
	};

	connect([dataUrl, constructor, constructorStore, canMap, canMapMergeBehaviour], {
		Map: ContributionMonth,
		url: 'localhost:8080/contribution-month'
	});

	var item = new ContributionMonth(origData);

	events = [];

	item.save().then(function(updated){
		assert.deepEqual(updated.serialize(), updatedData, 'updated data should be correct');
		var eventTypes = events.map(prop('type')).filter(notEq('_saving')).filter(notEq('updated')).sort();
		assert.equal(eventTypes.length, 5, 'Should dispatch 5 events');
		assert.deepEqual(
			eventTypes,
			['name','author', 'name', 'add','length'].sort(),
			'should dispatch the correct events: ' +
				'name, author (month update); ' +
				'name (project update); ' +
				'add, length (projects) ' +
				JSON.stringify(eventTypes));
		done();
	}).catch(function(e){
		canLog.log('Error: ', e);
		assert.ok(false, 'should not throw an exception');
		done();
	});
});

QUnit.test('smartMerge a list of items which type has a connection', function(assert){
	var Car = DefineMap.extend({
		vin: 'number',
		brand: 'string'
	});
	Car.algebra = new set.Algebra( set.props.id('vin') );
	Car.List = DefineList.extend( {'#': Car} );
	Car.connection = connect([constructor, constructorStore, canMap]);
	var list = new Car.List([
		{id: 100, name: 'Feb'},
		{id: 200, name: 'March'},
	]);
	var data = [
		{id: 100, name: 'February'},
		{id: 200, name: 'March'},
	];
	smartMerge(list, data);
	assert.deepEqual(list.serialize(), data, 'List with a connection should be merged');
});

QUnit.test('applyPatch', function(assert) {
	assert.deepEqual( applyPatch(
		[1,2,3],
		{index: 1, deleteCount: 0, insert: [4]}
	), [1,4,2,3], 'Patch insert' );

	assert.deepEqual( applyPatch(
		[1,2,3],
		{index: 1, deleteCount: 2, insert: [4]}
	), [1,4], 'Patch delete/insert');

	assert.deepEqual( applyPatch(
		[1,2,3],
		{index: 1, deleteCount: 0, insert: [4]},
		function(a) { return a * 10; }
	), [1,40,2,3], 'Patch with makeInstance');
});
QUnit.test('applyPatchPure', function(assert) {
	var list = [1,2,3];
	var patch = {index: 1, deleteCount: 2, insert: [4]};
	var patchedList = applyPatchPure( list, patch );

	assert.deepEqual( patchedList, [1,4], 'Patched correctly' );
	assert.notEqual( list, patchedList, 'Patched list does not reference orig list' );
	// make sure the original array was not mutated:
	assert.deepEqual( list, [1,2,3], 'Original list was not mutated' );
});

function notEq(a){
	return function(b){
		return a !== b;
	};
}
function prop(prop){
	return function(o){
		return o[prop];
	};
}

QUnit.test("mergeInstance when properties are removed and added", function(){
	var map = new DefineMap({a:"A"});
	mergeInstance(map, {b: "B"});

	QUnit.deepEqual(map.get(), {b: "B"});
});

QUnit.test("Merging non-defined, but object, types", function(){
	var first = new Date();
	var last = new Date();
	var map = new DefineMap({a: first});
	mergeInstance(map, {a: last});

	QUnit.equal(map.a, last);
});

QUnit.test("idFromType", function(assert){
	var Car = DefineMap.extend({
		vin: {type: 'string'},
		color: {type: 'string'}
	});
	Car.algebra = new set.Algebra( set.props.id('vin') );
	var id = idFromType(Car);
	var myCar = new Car({vin: "1", color: "black"});

	assert.equal(id(myCar), "1", "id is retrieved from algebra with a custom id prop");
});

QUnit.test("custom id prop for instance store", function(assert){

	var Car = DefineMap.extend({
		vin: {type: "string"},
		color: {type: "string"}
	});
	Car.algebra = new set.Algebra( set.props.id("vin") );
	Car.List = DefineList.extend({ "#" : Car });

	var id = idFromType(Car);
	var items = new Car.List([
		{ vin: "1", color: "black" },
		{ vin: "2", color: "blue" },
	]);
	var toStore = function(map, item){ map[item.vin] = item; return map;};
	var instanceStore = [].reduce.call(items, toStore, {});
	var data = [
		{ vin: "2", color: "blue" },
		{ vin: "1", color: "red" },
	];

	assert.ok(items[0].vin === "1", "The 1st item is with id 1");
	assert.deepEqual(instanceStore["1"].serialize(), { vin: "1", color: "black" }, "The item with id=1 is what we want it to be");

	smartMerge(items, data);

	assert.deepEqual(instanceStore["1"].serialize(), { vin: "1", color: "red" }, "The item with id=1 was updated correctly");
	assert.ok(items[0].vin === "2", "items were swapped in the list which is what we expected");
});

/*
QUnit.test("use .type for hydrator", function(){
	var Person = DefineMap.extend({first: "string", last:"string"});
	var makePerson = function(data) {
		return new Person(data);
	};
	var People = DefineList.extend({
		"#": {type: makePerson}
	});

	var people = new People();
	mergeList(people,[{first: "R", last: "Wheale"},{first: "J", last: "Meyer"}]);

	QUnit.ok(people[0] instanceof Person);
});*/
