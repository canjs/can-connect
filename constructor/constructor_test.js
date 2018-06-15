var QUnit = require("steal-qunit");
var fixture = require("can-fixture");
var persist = require("../data/url/url");
var connect = require("../can-connect");
var constructor = require("./constructor");
var assign = require("can-reflect").assignMap;
var QueryLogic = require("can-query-logic");

var logErrorAndStart = function(e){
	ok(false,"Error "+e);
	start();
};

var makeIframe = function(src){
	var iframe = document.createElement('iframe');
	window.removeMyself = function(){
		delete window.removeMyself;
		document.body.removeChild(iframe);
		QUnit.start();
	};
	document.body.appendChild(iframe);
	iframe.src = src;
};

// connects the "raw" data to a a constructor function
// creates ways to CRUD the instances
QUnit.module("can-connect/constructor",{
	setup: function(){
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
		assign(this, values);
	};
	var PersonList = function(people){
		var listed = people.slice(0);
		listed.isList = true;
		return listed;
	};

	var peopleConnection = constructor( persist( connect.base({
		instance: function(values){
			return new Person(values);
		},
		list: function(arr){
			return new PersonList(arr.data);
		},
		url: "/constructor/people",
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
	}) ));

	stop();
	peopleConnection.getList().then(function(people){
		ok(people.isList, "is a list");
		equal(people.length, 1, "got a list");
		ok(people[0] instanceof Person);
		start();
	}, logErrorAndStart); //-> instances

	stop();
	peopleConnection.get({id: 5}).then(function(person){
		equal(person.id, 5, "got a list");
		ok(person instanceof Person);
		start();
	}, logErrorAndStart);

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
	}, logErrorAndStart);

	var p3 = new Person({name: "justin", id: 3});
	stop();
	peopleConnection.destroy(p3).then(function(updatedP){
		equal(p3, updatedP, "same instances");
		equal(p3.destroy, true);
		start();
	}, logErrorAndStart);

});
