var QUnit = require("steal-qunit");
var canSet = require("can-set");
var fixture = require("can/util/fixture/fixture");
var persist = require("../data-url");

var constructor = require("../constructor");
var instanceStore = require("../constructor-store");
var connect = require("../can-connect");

var logErrorAndStart = function(e){
	debugger;
	ok(false,"Error "+e);
	start();
};
var asyncResolve = function(data) {
	var def = new can.Deferred();
	setTimeout(function(){
		def.resolve(data);
	},1);
	return def;
};
var asyncReject = function(data) {
	var def = new can.Deferred();
	setTimeout(function(){
		def.reject(data);
	},1);
	return def;
};

// connects the "raw" data to a a constructor function
// creates ways to CRUD the instances
QUnit.module("can-connect/constructor-store",{
	setup: function(){
		this.persistConnection = persist(connect.base({},{}),{
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


QUnit.test("instance reference is updated and then discarded after reference is deleted", function(){
	
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
			return new PersonList(arr.data);
		},
		updatedList: function(list, updatedList, set){
			list.splice(0, list.length, updatedList.data);
		}
	}) );
	
	var person = new Person({id: 1, name: "Justin"});
	
	peopleConnection.addInstanceReference(person);
	
	stop();
	peopleConnection.findAll({}).then(function(people){
		equal(people[0], person, "same instances");
		equal(person.age, 32, "age property added");
		
		// allows the request to finish
		setTimeout(function(){
			peopleConnection.deleteInstanceReference(person);
		
			peopleConnection.findAll({}).then(function(people){
				ok(people[0] != person, "not the same instances");
				equal(people[0].age, 32, "age property from data");
				ok(!people[0].name, "does not have name");
				start();
			}, logErrorAndStart);
		},1);
	}, logErrorAndStart);
	
});

QUnit.test("list store is kept and re-used and possibly discarded", function(){
	var Person = function(values){
		canSet.helpers.extend(this, values);
	};
	PersonList = function(people, sets){
		var listed = people.slice(0);
		listed.isList = true;
		listed.__set = sets;
		return listed;
	};
	
	var connection = connect([function(){
		var calls = 0;
		return {
			getListData: function(){
				// nothing here first time
				calls++;
				if(calls === 1) {
					return asyncResolve({data: [{id: 0}, {id: 1}] });
				} else if(calls === 2){
					return asyncResolve({data: [{id: 1}, {id: 2}] });
				} else {
					return asyncResolve({data: [] });
				}
			},
			updatedList: function(list, updatedList, set){
				list.splice.apply(list, [0, list.length].concat( updatedList.data ) );
			}
		};
	},"constructor-store","constructor"],{
		instance: function(values){
			return new Person(values);
		}, 
		list: function(arr, sets){
			return new PersonList(arr.data, sets);
		}
	});
	
	var resolvedList;
	connection.findAll({}).then(function(list){
		resolvedList =  list;
		// put in store
		connection.addListReference(list);
		setTimeout(checkStore,1);
	}, logErrorAndStart);
	
	stop();
	
	function checkStore(){
		connection.findAll({}).then(function(list){
			equal(list, resolvedList);
			equal(list.length, 2);
			equal(list[0].id, 1);
			equal(list[1].id, 2);
			connection.deleteListReference(list);
			setTimeout(checkEmpty,1);
		}, logErrorAndStart);
	}

	function checkEmpty() {
		connection.findAll({}).then(function(list){
			
			ok(list !== resolvedList);
			start();
		}, logErrorAndStart);
		
	}
	
});