var QUnit = require("steal-qunit");
var fixture = require("can-fixture");
var persist = require("../../data/url/url");

var constructor = require("../../constructor/constructor");
var instanceStore = require("./store");
var connect = require("../../can-connect");
var testHelpers = require("../../test-helpers");
var assign = require("can-reflect").assignMap;
var QueryLogic = require("can-query-logic");

instanceStore.requestCleanupDelay = 1;

// connects the "raw" data to a a constructor function
// creates ways to CRUD the instances
QUnit.module("can-connect/constructor/store",{
	setup: function(){

	}
});


QUnit.test("instance reference is updated and then discarded after reference is deleted", function(){
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

	var Person = function(values){
		assign(this, values);
	};
	var PersonList = function(people){
		var listed = people.slice(0);
		listed.isList = true;
		return listed;
	};
	var peopleConnection = connect( [persist, constructor, instanceStore], {
		url: {
			getListData: "/constructor/people",
			getData: "/constructor/people/{id}",
			createData: "/constructor/people",
			updateData: "/constructor/people/{id}",
			destroyData: "/constructor/people/{id}"
		},
		instance: function(values){
			return new Person(values);
		},
		list: function(arr){
			return new PersonList(arr.data);
		},
		updatedList: function(list, updatedList, set){
			list.splice(0, list.length, updatedList.data);
		},
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
	});

	var person = new Person({id: 1, name: "Justin"});

	peopleConnection.addInstanceReference(person);

	stop();
	peopleConnection.getList({}).then(function(people){
		equal(people[0], person, "same instances");

		equal(person.age, 32, "age property added");

		// allows the request to finish
		setTimeout(function(){
			peopleConnection.deleteInstanceReference(person);

			peopleConnection.getList({}).then(function(people){
				ok(people[0] !== person, "not the same instances");
				equal(people[0].age, 32, "age property from data");
				ok(!people[0].name, "does not have name");
				start();
			}, testHelpers.logErrorAndStart);
		},1);
	}, testHelpers.logErrorAndStart);

});

QUnit.test("list store is kept and re-used and possibly discarded", function(){
	var Person = function(values){
		assign(this, values);
	};
	var connection;
	var PersonList = function(people, sets){
		var listed = people.slice(0);
		listed.isList = true;
		listed[connection.listQueryProp] = sets;
		return listed;
	};

	connection = connect([function(){
		var calls = 0;
		return {
			getListData: function(){
				// nothing here first time
				calls++;
				if(calls === 1) {
					return testHelpers.asyncResolve({data: [{id: 0}, {id: 1}] });
				} else if(calls === 2){
					return testHelpers.asyncResolve({data: [{id: 1}, {id: 2}] });
				} else {
					return testHelpers.asyncResolve({data: [] });
				}
			},
			updatedList: function(list, updatedList, set){
				list.splice.apply(list, [0, list.length].concat( updatedList.data ) );
			}
		};
	},instanceStore,constructor],{
		instance: function(values){
			return new Person(values);
		},
		list: function(arr, sets){
			return new PersonList(arr.data, sets);
		},
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
	});

	var resolvedList;
	connection.getList({}).then(function(list){
		resolvedList =  list;
		// put in store
		connection.addListReference(list);
		setTimeout(checkStore,1);
	}, testHelpers.logErrorAndStart);

	stop();

	function checkStore(){
		connection.getList({}).then(function(list){
			equal(list, resolvedList);
			equal(list.length, 2);
			equal(list[0].id, 1);
			equal(list[1].id, 2);
			connection.deleteListReference(list);
			setTimeout(checkEmpty,1);
		}, testHelpers.logErrorAndStart);
	}

	function checkEmpty() {
		connection.getList({}).then(function(list){

			ok(list !== resolvedList);
			start();
		}, testHelpers.logErrorAndStart);

	}

});

QUnit.test("list's without a listQuery are not added to the store", function(){
	var Person = function(values){
		assign(this, values);
	},
		connection;
	var PersonList = function(people, sets){
		var listed = people.slice(0);
		listed.isList = true;
		listed[connection.listQueryProp] = sets;
		return listed;
	};

	connection = connect([function(){
		var calls = 0;
		return {
			getListData: function(){
				// nothing here first time
				calls++;
				if(calls === 1) {
					return testHelpers.asyncResolve({data: [{id: 0}, {id: 1}] });
				} else if(calls === 2){
					return testHelpers.asyncResolve({data: [{id: 1}, {id: 2}] });
				} else {
					return testHelpers.asyncResolve({data: [] });
				}
			},
			updatedList: function(list, updatedList, set){
				list.splice.apply(list, [0, list.length].concat( updatedList.data ) );
			}
		};
	},instanceStore,constructor],{
		instance: function(values){
			return new Person(values);
		},
		list: function(arr, sets){
			return new PersonList(arr.data, sets);
		},
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
	});

	connection.addListReference([]);
	connection.listStore.forEach(function(){
		ok(false);
	});
	QUnit.expect(0);


});

QUnit.test("pending requests should be shared by all connections (#115)", function(){
	var Address = function(values){
		assign(this, values);
	};
	var addressConnection = connect( [persist, constructor, instanceStore], {
		url: '/test/',
		instance: function(values){
			return new Address(values);
		},
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
	});

	var Person = function(values){
		values.address = addressConnection.hydrateInstance(values.address);
		assign(this, values);
	};

	var peopleConnection = connect( [persist, constructor, instanceStore], {
		url: {
			getListData: function(){
				return Promise.resolve({
					data: [
						{
							id: 1,
							name: "Justin Meyer",
							address: {
								id: 5,
								street: "2060 stave"
							}
						},
						{
							id: 2,
							name: "Ramiya Meyer",
							address: {
								id: 5,
								street: "2060 stave"
							}
						}
					]
				});
			}
		},
		instance: function(values){
			return new Person(values);
		},
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
	});

	QUnit.stop();
	peopleConnection.getList({}).then(function(people){
		QUnit.ok(people[0].address === people[1].address);
		QUnit.start();
	});

});


QUnit.asyncTest("instances bound before create are moved to instance store (#296)", function(){

	var connection = connect([
		function(){
			var calls = 0;
			return {
				getData: function(){
					return Promise.resolve({name: "test store", id: "abc"});
				},
				createData: function(){
					return Promise.resolve({name: "test store", id: "abc"});
				}
			};
		},
		constructor,
		instanceStore],
		{
			queryLogic: new QueryLogic({
				identity: ["id"]
			})
		});

	var todo = {name: "test store"};
	connection.addInstanceReference(todo);

	connection.save(todo).then(function(savedTodo){

		connection.get({id: savedTodo.id}).then(function(t){
			QUnit.ok(t === todo, "instances the same");
			QUnit.start();
		});
	});


});

QUnit.asyncTest("instanceStore adds instance references for list membership.", function() {
	var connection = connect([
		function(){
			return {
				getListData: function(){
					return Promise.resolve([{name: "test store", id: "abc"}]);
				}
			};
		},
		constructor,
		instanceStore],
	{
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
	});

	connection.getList({}).then(function(list) {
		var instanceRef = connection.instanceStore.get("abc");
		QUnit.ok(instanceRef, "instance reference exists in store");
		QUnit.equal(connection.instanceStore.referenceCount("abc"), 2, "reference count reflects that instance is being loaded");
		connection.addListReference(list);
		QUnit.equal(connection.instanceStore.referenceCount("abc"), 3, "reference count reflects that instance is in reffed list");

		return new Promise(function(resolve) {
			setTimeout(function() {
				QUnit.equal(connection.instanceStore.referenceCount("abc"), 1, "finished requests reduce instance counts to 1");
				connection.deleteListReference(list);
				QUnit.ok(!connection.instanceStore.has("abc"), "instance removed from store after last list ref removed");
				resolve()
			}, 1);
		});
	}).then(QUnit.start.bind(QUnit, null), QUnit.start.bind(QUnit, null));
});

QUnit.asyncTest("instanceStore adds/removes instances based on list updates.", function() {
	var connection = connect([
		function(){
			var calls = 0;
			return {
				getListData: function(){
					if(calls) {
						return Promise.resolve([{name: "test store", id: "def"}]);
					} else {
						calls++;
						return Promise.resolve([{name: "test store", id: "abc"}]);
					}
				}
			};
		},
		constructor,
		instanceStore],
	{
		queryLogic: new QueryLogic({
			identity: ["id"]
		})
	});

	connection.getList({}).then(function(list) {
		connection.addListReference(list);
		return new Promise(function(resolve) {
			setTimeout(function() {
				QUnit.ok(connection.instanceStore.get("abc"), "first item is in instance store");
				resolve(connection.getList({}));
			}, 1);
		});
	}).then(function(list) {
		return new Promise(function(resolve) {
			setTimeout(function() {
				QUnit.ok(!connection.instanceStore.get("abc"), "first item is not in instance store");
				QUnit.ok(connection.instanceStore.get("def"), "second item is in instance store");
				resolve();
			}, 10);
		});
	}).then(QUnit.start.bind(QUnit, null), QUnit.start.bind(QUnit, null));
});
