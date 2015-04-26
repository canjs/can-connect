var QUnit = require("steal-qunit");
var canSet = require("can-set");
var fixture = require("can/util/fixture/fixture");
var persist = require("../persist");

var constructor = require("../constructor");
var instanceStore = require("../instance-store");

// connects the "raw" data to a a constructor function
// creates ways to CRUD the instances
QUnit.module("can-connect/instance-store",{
	setup: function(){
		this.persistConnection = persist({},{
			findAll: "/constructor/people",
			findOne: "/constructor/people/{id}",
			create: "/constructor/people",
			update: "/constructor/people/{id}",
			destroy: "/constructor/people/{id}"
		});
		fixture({
			"GET /constructor/people": function(){
				return [{id: 1, age: 32}];
			},
			"GET /constructor/people/{id}": function(request){
				return {id: +request.data.id };
			},
			"POST /constructor/people": function(){
				return {id: 3};
			},
			"PUT /constructor/people/{id}": function(request){
				equal(request.data.id, 3, "update id!");
				return {update: true};
			},
			"DELETE /constructor/people/{id}": function(request){
				equal(request.data.id, 3, "update id");
				return {destroy: true};
			}
		});
		fixture.delay = 1;
	}
});


QUnit.test("observed is matched and then discarded after unobserved", function(){
	
	var Person = function(values){
		canSet.helpers.extend(this, values);
	};
	PersonList = function(people){
		var listed = people.slice(0);
		listed.isList = true;
		return listed;
	};
	
	var peopleConnection = instanceStore( constructor( this.persistConnection, { 
		instance: function(values){
			return new Person(values);
		}, 
		list: function(arr){
			return new PersonList(arr);
		} 
	}) );
	
	var person = new Person({id: 1, name: "Justin"});
	
	peopleConnection.observedInstance(person);
	
	stop();
	peopleConnection.findAll({}).then(function(people){
		equal(people[0], person, "same instances");
		equal(person.age, 32, "age property added");
		
		// allows the request to finish
		setTimeout(function(){
			peopleConnection.unobservedInstance(person);
		
			peopleConnection.findAll({}).then(function(people){
				ok(people[0] != person, "not the same instances");
				equal(people[0].age, 32, "age property from data");
				ok(!people[0].name, "does not have name");
				start();
			});
		},1);
	});
	
});