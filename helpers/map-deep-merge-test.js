var DefineMap = require('can-define/map/map');
var DefineList = require('can-define/list/list');
var set = require('can-set');
var fixture = require('can-fixture');
var event = require("can-event");

var connect = require('can-connect');
var canMap = require('can-connect/can/map/map');
var dataUrl = require('can-connect/data/url/url');
var constructor = require('can-connect/constructor/constructor');
var constructorStore = require('can-connect/constructor/store/store');

var smartMerge = require('./map-deep-merge').smartMerge;
var mergeInstance = require('./map-deep-merge').mergeInstance;
var mergeList = require('./map-deep-merge').mergeList;

var QUnit = require('steal-qunit');

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

// List of changes that should be applied on update:
//contributionMonth.name = 'February'; // 1
//contributionMonth.osProjects[0].name = 'CanJS'; // 2
//contributionMonth.osProjects.splice(1,0, new OSProject({id: 3, name: 'StealJS'}) ) // 3
//contributionMonth.author = hydrateInstance( {id: 6, name: 'ilya'} ) // 4

var OSProject, ContributionMonth, origEventDispatch;

fixture('PUT /contribution-month/{id}', function(){
	console.log('fixture here');
	return updatedData;
});

var canMapMerge = {
	updatedInstance: function(instance, data){
		console.log('canMapMerge !!!');
		smartMerge( instance, data );
		canMap.callbackInstanceEvents(instance);
	}
};

QUnit.module('helpers map-deep-merge', {
	setup: function(){
		console.log('setup!');

		OSProject = DefineMap.extend({
			id: {type: 'number'},
			name: {type: 'string'}
		});
		OSProject.List = DefineList.extend({ '#' : OSProject });

		OSProject.algebra = new set.Algebra( set.props.id('id') );

		ContributionMonth = DefineMap.extend({
			osProjects: OSProject.List
		});

		connect([dataUrl, constructor, constructorStore, canMap], {
			Map: ContributionMonth,
			url: 'http://localhost:8080/contribution-month'
		});
	},
	teardown: function(){
	}
});


QUnit.test('smartMerge', function(assert) {
	var done = assert.async();

	var item = new ContributionMonth(origData);

	var events = [];

	var origEventDispatch = event.dispatch;
	event.dispatch = function(ev){
		console.log('!!! event.dispatch !!! ' + JSON.stringify(ev), arguments);
		events.push(JSON.stringify(ev));
		return origEventDispatch.apply(this, arguments);
	};

	//item.set(origData);

	item.save().then(function(a){
		console.log('saved!', a);
		event.dispatch = origEventDispatch;

		assert.equal(events.length, 4);
		console.log('events::', events);
		done();
	});
});
//QUnit.test('mergeInstance', function(assert) {
//	var done = assert.async();
//	assert.ok(false);
//	done();
//});
//QUnit.test('mergeList', function(assert) {
//	var done = assert.async();
//	assert.ok(false);
//	done();
//});