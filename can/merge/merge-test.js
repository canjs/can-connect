var DefineMap = require('can-define/map/map');
var DefineList = require('can-define/list/list');
var set = require('can-set');

var connect = require('can-connect');
var canMap = require('can-connect/can/map/map');
var constructorBehavior = require('can-connect/constructor/constructor');
var constructorStore = require('can-connect/constructor/store/store');
var canMapMerge = require('can-connect/can/merge/merge');

var QUnit = require('steal-qunit');

QUnit.test("basics", function(){
	// must have algebra connection and use #

	var Author = DefineMap.extend({
		id: 'number',
		name: 'string'
	});
	Author.algebra = new set.Algebra( set.props.id('id') );

	var OSProject = DefineMap.extend({
		id: 'number',
		title: 'string'
	});
	OSProject.List = DefineList.extend({ '#' : OSProject });
	OSProject.algebra = new set.Algebra( set.props.id('id') );

	var ContributionMonth = DefineMap.extend({
		id: "string",
		author: Author,
		osProjects: OSProject.List
	});

	var dataBehavior = {
		createData: function(){
			return Promise.resolve({
				id: "abc",
				author: {id: 1, name: "Justin"},
				osProjects: [{id: 200, name: "canjs"}, {id: 201, name: "donejs"}]
			});
		},
		updateData: function(){
			return Promise.resolve({
				id: "abc",
				author: {id: 1, name: "justin meyer"},
				osProjects: [{id: 201, name: "DoneJS"}, {id: 202, name: "StealJS"}, {id: 200, name: "CanJS"}]
			});
		}
	};

	ContributionMonth.connection = connect([dataBehavior, constructorBehavior, constructorStore, canMap, canMapMerge], {
		Map: ContributionMonth
	});

	var cm = new ContributionMonth({
		author: {id: 1, name: "Justin"},
		osProjects: [{id: 200, name: "CanJS"}, {id: 201, name: "DoneJS"}]
	});

	var canjs = cm.osProjects[0];
	var donejs = cm.osProjects[1];

	QUnit.stop();
	var promise = cm.save().then(function(cm){
		QUnit.deepEqual(cm.id, "abc", "updated id");
		QUnit.deepEqual(
			cm.osProjects.get(), [{id: 200, name: "canjs"}, {id: 201, name: "donejs"}], "updated by save");


		cm.author.name = "Justin Meyer";
		var canJSProject = cm.osProjects.shift();
		QUnit.equal(canjs, canJSProject, "same canjs project");

		cm.osProjects.push({id: 202, name: "stealjs"}, canJSProject);
		return cm.save();
	});

	promise.then(function(cm){
		QUnit.equal(cm.osProjects[0], donejs, "same donejs" );
		QUnit.equal(cm.osProjects[2], canjs, "still canjs" );

		QUnit.deepEqual(cm.get(), {
			id: "abc",
			author: {id: 1, name: "justin meyer"},
			osProjects: [{id: 201, name: "DoneJS"}, {id: 202, name: "StealJS"}, {id: 200, name: "CanJS"}]
		}, "values look right");

		QUnit.start();
	});

});
