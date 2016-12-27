var DefineMap = require('can-define/map/map');
var DefineList = require('can-define/list/list');
var set = require('can-set');

var connect = require('can-connect');
var canMap = require('can-connect/can/map/map');
var dataUrl = require('can-connect/data/url/url');
var canConstructor = require('can-connect/constructor/constructor');

var smartMerge = require('./map-deep-merge').smartMerge;
var mergeInstance = require('./map-deep-merge').mergeInstance;
var mergeList = require('./map-deep-merge').mergeList;

var QUnit = require("steal-qunit");

//{
//	id: 1,
//	name: "Feb",
//	osProjects: [ { id: 1, name: "canjs" }, {id: 2, name: "jQuery++"} ],
//	author: {id: 5, name: "ilya"}
//}

//{
//	id: 1,
//	name: "February",
//	osProjects: [ { id: 1, name: "CanJS" }, {id: 3, name: "StealJS"}, {id: 2, name: "jQuery++"} ],
//	author: {id: 6, name: "ilya"}
//}

//contributionMonth.name = "February"; // 1
//contributionMonth.osProjects[0].name = "CanJS"; // 2
//contributionMonth.osProjects.splice(1,0, new OSProject({id: 3, name: "StealJS"}) ) // 3
//contributionMonth.author = hydrateInstance( {id: 6, name: "ilya"} ) // 4

var OSProject, ContributionMonth;

var canMapMerge = {
	updatedInstance: function(instance, data){
		console.log('canMapMerge !!!');
		smartMerge( instance, data );
		canMap.callbackInstanceEvents(instance);
	}
};

QUnit.module("helpers map-deep-merge", {
	setup: function(){
		console.log('setup!');
		OSProject = DefineMap.extend({

		});
		OSProject.List = DefineList.extend({ "#" : OSProject });

		OSProject.algebra = new set.Algebra( set.props.id("id") );

		ContributionMonth = DefineMap.extend({
			osProjects: OSProject.List
		});

		connect([canConstructor, canMap, dataUrl, canMapMerge], {
			Map: ContributionMonth,
			url: "/contribution-month"
		});
	}
});

QUnit.test("smartMerge", function() {
	ok(false);
});
QUnit.test("mergeInstance", function() {
	ok(false);
});
QUnit.test("mergeList", function() {
	ok(false);
});