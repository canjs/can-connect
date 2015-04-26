var QUnit = require("steal-qunit");
var canSet = require("can-set");
var fixture = require("can/util/fixture/fixture");
var persist = require("../persist");

var constructor = require("../constructor");

// connects the "raw" data to a a constructor function
// creates ways to CRUD the instances
QUnit.module("can-connect/constructor",{
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
				return [{id: 1}];
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

QUnit.test("basics", function(){
	
	var Person = function(values){
		canSet.helpers.extend(this, values);
	};
	PersonList = function(people){
		var listed = people.slice(0);
		listed.isList = true;
		return listed;
	};
	
	var peopleConnection = constructor( this.persistConnection, { 
		instance: function(values){
			return new Person(values);
		}, 
		list: function(arr){
			return new PersonList(arr);
		} 
	});
	
	stop();
	peopleConnection.findAll({}).then(function(people){
		ok(people.isList, "is a list");
		equal(people.length, 1, "got a list");
		ok(people[0] instanceof Person);
		start();
	}); //-> instances
	
	stop();
	peopleConnection.findOne({id: 5}).then(function(person){
		equal(person.id, 5, "got a list");
		ok(person instanceof Person);
		start();
	});
	
	var p = new Person({name: "justin"});
	stop();
	peopleConnection.save(p).then(function(updatedP){
		equal(p, updatedP, "same instances");
		equal(p.id, 3);
		start();
	});
	
	var p2 = new Person({name: "justin", id: 3});
	stop();
	peopleConnection.save(p2).then(function(updatedP){
		equal(p2, updatedP, "same instances");
		equal(p2.update, true);
		start();
	});
	
	var p3 = new Person({name: "justin", id: 3});
	stop();
	peopleConnection.destroy(p3).then(function(updatedP){
		equal(p3, updatedP, "same instances");
		equal(p3.destroy, true);
		start();
	});
	
});
