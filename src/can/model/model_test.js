var QUnit = require("steal-qunit");
var can = require("can/util/util");
var fixture = require("can-fixture");
var canFixture = require("can/util/fixture/");
require("can-connect/can/model/");

var logErrorAndStart = function(e){
	debugger;
	ok(false,"Error "+e);
	start();
};


(function () {
	QUnit.module('can/model', {
		setup: function () {}
	});
	var isDojo = typeof dojo !== 'undefined';
	test('shadowed id', function () {
		var MyModel = can.Model.extend({
			id: 'foo'
		}, {
			foo: function () {
				return this.attr('foo');
			}
		});
		var newModel = new MyModel({});
		ok(newModel.isNew(), 'new model is isNew');

		var oldModel = new MyModel({
			foo: 'bar'
		});

		ok(!oldModel.isNew(), 'old model is not new');
		equal(oldModel.foo(), 'bar', 'method can coexist with attribute');
	});

	test('findAll deferred', function () {

		fixture('model/test/people.json', function(){
			return [{
			 "id" : 5,
			 "name" : "Justin"
			}];
		});

		var Person = can.Model.extend({
			findAll: function (params) {
				return can.ajax({
					url: 'model/test/people.json',
					data: params,
					dataType: 'json'
				});
			}
		}, {});
		stop();

		var people = Person.findAll({});

		people.then(function (people) {
			equal(people.length, 1, 'we got a person back');
			equal(people[0].name, 'Justin', 'Got a name back');
			ok(people[0] instanceof Person, 'Person got a class back');
			start();
		});
	});

	test('findAll rejects non-array (#384)', function () {
		var Person = can.Model.extend({
			findAll: function (params, success, error) {
				return new Promise(function(resolve){
					setTimeout(function () {
						resolve({
							stuff: {}
						});
					}, 10);
				});
			}
		}, {});
		stop();
		Person.findAll({})
			.then(function () {
				ok(false, 'This should not succeed');
				start();
			}, function (err) {
				ok(err instanceof Error, 'Got an error');
				equal(err.message, 'Could not get any raw data while converting using .parseListData');
				start();
			});
	});

	asyncTest('findAll deferred reject', function () {
		// This test is automatically paused
		function rejectDeferred(df) {
			setTimeout(function () {
				df.reject();
			}, 1);
		}

		function resolveDeferred(df) {
			setTimeout(function () {
				df.resolve([]);
			}, 1);
		}
		var Person = can.Model({
			findAll: function (params, success, error) {
				var df = can.Deferred();
				if (params.resolve) {
					resolveDeferred(df);
				} else {
					rejectDeferred(df);
				}
				return df;
			}
		}, {});
		var people_reject = Person.findAll({
			resolve: false
		});
		var people_resolve = Person.findAll({
			resolve: true
		});


		people_reject.done(function () {
			ok(false, 'This deferred should be rejected');
		});
		people_reject.fail(function () {
			ok(true, 'The deferred is rejected');
		});
		people_resolve.done(function () {
			ok(true, 'This deferred is resolved');
		});

		people_resolve.fail(function () {
			ok(false, 'The deferred should be resolved');
		});

		setTimeout(function () {
			// continue the test
			start();
		}, 20);
	});



	/*if (window.jQuery) {
		asyncTest('findAll abort', function () {
			expect(4);
			var df;
			can.Model('Person', {
				findAll: function (params, success, error) {
					df = can.Deferred();
					df.then(function () {
						ok(!params.abort, 'not aborted');
					}, function () {
						ok(params.abort, 'aborted');
					});
					return df.promise({
						abort: function () {
							df.reject();
						}
					});
				}
			}, {});

			Person.findAll({
				abort: false
			}).done(function () {
				ok(true, 'resolved');
			});

			var resolveDf = df;
			var abortPromise = Person.findAll({
				abort: true
			})
				.fail(function () {
					ok(true, 'failed');
				});
			setTimeout(function () {
				resolveDf.resolve([]);
				abortPromise.abort();
				// continue the test
				start();
			}, 200);
		});
	}*/


	test('findOne deferred', function () {

		fixture('model/test/person.json', function(){
			return {name: "Justin"}
		});

		var Person = can.Model({
			findOne: 'model/test/person.json'
		}, {});

		stop();
		var person = Person.findOne({});
		person.then(function (person) {
			equal(person.name, 'Justin', 'Got a name back');
			ok(person instanceof Person, 'Person got a class back');
			start();
		},logErrorAndStart);
	});

	test('save deferred', function () {
		can.Model('Person', {
			create: function (attrs, success, error) {
				return new can.Deferred().resolve({
					id: 5
				});
			}
		}, {});
		var person = new Person({
			name: 'Justin'
		}),
			personD = person.save();

		stop();
		personD.then(function (person) {
			start();
			equal(person.id, 5, 'we got an id');
		});
	});


	test('update deferred', function () {
		var Person = can.Model({
			update: function (id, attrs, success, error) {
				return new can.Deferred().resolve({
					thing: 'er'
				});
			}
		}, {});

		var person = new Person({
			name: 'Justin',
			id: 5
		}),
			personD = person.save();
		stop();
		personD.then(function (person) {
			start();
			equal(person.thing, 'er', 'we got updated');
		});
	});

	test('destroy deferred', function () {
		var Person = can.Model( {
			destroy: function (id, success, error) {
				return new can.Deferred().resolve({
					thing: 'er'
				});
			}
		}, {});
		var person = new Person({
			name: 'Justin',
			id: 5
		}),
			personD = person.destroy();
		stop();
		personD.then(function (person) {
			start();
			equal(person.thing, 'er', 'we got destroyed');
		});
	});



	test('models', function () {
		var Person = can.Model({
			prettyName: function () {
				return 'Mr. ' + this.name;
			}
		});
		var people = Person.models([{
			id: 1,
			name: 'Justin'
		}]);
		equal(people[0].prettyName(), 'Mr. Justin', 'wraps wrapping works');
	});
	test('.models with custom id', function () {

		var CustomId = can.Model({
			id: '_id'
		}, {
		});
		var results = CustomId.models([{
			'_id': 1,
			'name': 'Justin'
		}, {
			'_id': 2,
			'name': 'Brian'
		}]);

		equal(results.length, 2, 'Got two items back');
		equal(results[0].name, 'Justin', 'First name right');
		equal(results[1].name, 'Brian', 'Second name right');
	});

	test('binding', 2, function () {
		var Person = can.Model({},{});

		var inst = new Person({
			foo: 'bar'
		});
		inst.bind('foo', function (ev, val) {
			ok(true, 'updated');
			equal(val, 'baz', 'values match');
		});
		inst.attr('foo', 'baz');

	});

	/*test('auto methods', function () {
		//turn off fixtures
		can.fixture.on = false;
		var School = can.Model.extend('Jquery.Model.Models.School', {
			findAll: can.test.path('model/test/{type}.json'),
			findOne: can.test.path('model/test/{id}.json'),
			create: 'GET ' + can.test.path('model/test/create.json'),
			update: 'GET ' + can.test.path('model/test/update{id}.json')
		}, {});

		stop();
		School.findAll({
			type: 'schools'
		}, function (schools) {
			ok(schools, 'findAll Got some data back');
			equal(schools[0].constructor.shortName, 'School', 'there are schools');
			School.findOne({
				id: '4'
			}, function (school) {
				ok(school, 'findOne Got some data back');
				equal(school.constructor.shortName, 'School', 'a single school');
				new School({
					name: 'Highland'
				})
					.save(function (school) {
						equal(school.name, 'Highland', 'create gets the right name');
						school.attr({
							name: 'LHS'
						})
							.save(function () {
								start();
								equal(school.name, 'LHS', 'create gets the right name');
								can.fixture.on = true;
							});
					});
			});
		});
	});*/


	test('isNew', function () {
		var Person = can.Model({},{});

		var p = new Person();
		ok(p.isNew(), 'nothing provided is new');
		var p2 = new Person({
			id: null
		});
		ok(p2.isNew(), 'null id is new');
		var p3 = new Person({
			id: 0
		});
		ok(!p3.isNew(), '0 is not new');
	});

	/*test('findAll string', function () {
		can.fixture.on = false;
		can.Model('Test.Thing', {
			findAll: can.test.path('model/test/findAll.json') + ''
		}, {});
		stop();
		Test.Thing.findAll({}, function (things) {
			equal(things.length, 1, 'got an array');
			equal(things[0].id, 1, 'an array of things');
			start();
			can.fixture.on = true;
		});
	});*/

	test('Model events', function () {
		expect(12);
		var order = 0;
		var Event =  can.Model({
			create: function () {
				var def = isDojo ? new dojo.Deferred() : new can.Deferred();
				def.resolve({
					id: 1
				});
				return def;
			},
			update: function (attrs) {
				var def = isDojo ? new dojo.Deferred() : new can.Deferred();
				def.resolve(attrs);
				return def;
			},
			destroy: function () {
				var def = isDojo ? new dojo.Deferred() : new can.Deferred();
				def.resolve({});
				return def;
			}
		}, {});
		stop();

		Event.bind('created', function (ev, passedItem) {
			ok(this === Event, 'got model');
			ok(passedItem === item, 'got instance');
			equal(++order, 1, 'order created');
			passedItem.save();
		})
			.bind('updated', function (ev, passedItem) {
				equal(++order, 2, 'order updated');
				ok(this === Event, 'got model');
				ok(passedItem === item, 'got instance');
				passedItem.destroy();
			})
			.bind('destroyed', function (ev, passedItem) {
				equal(++order, 3, 'order destroyed');
				ok(this === Event, 'got model');
				ok(passedItem === item, 'got instance');
				start();
			});
		var item = new Event();
		item.bind('created', function () {
			ok(true, 'created');
		})
			.bind('updated', function () {
				ok(true, 'updated');
			})
			.bind('destroyed', function () {
				ok(true, 'destroyed');
			});
		item.save().then(undefined, logErrorAndStart);
	});

	test('removeAttr test', function () {
		var Person = can.Model({},{});
		var person = new Person({
			foo: 'bar'
		});
		equal(person.foo, 'bar', 'property set');
		person.removeAttr('foo');
		equal(person.foo, undefined, 'property removed');
		var attrs = person.attr();
		equal(attrs.foo, undefined, 'attrs removed');
	});
	test('save error args', function () {
		var Foo = can.Model.extend({
			create: '/testinmodelsfoos.json'
		}, {});
		var st = '{type: "unauthorized"}';
		fixture('/testinmodelsfoos.json', function (request, response) {
			response(401, st);
		});
		stop();
		new Foo({})
			.save(function () {
				ok(false, 'success should not be called');
				start();
			}, function (jQXHR) {
				ok(true, 'error called');
				ok(jQXHR.getResponseHeader, 'jQXHR object');
				start();
			});
	});
	test('object definitions', function () {
		var ObjectDef = can.Model.extend({
			findAll: {
				url: '/test/place',
				dataType: 'json'
			},
			findOne: {
				url: '/objectdef/{id}',
				timeout: 1000
			},
			create: {},
			update: {},
			destroy: {}
		}, {});

		canFixture('GET /objectdef/{id}', function (original) {
			equal(original.timeout, 1000, 'timeout set');
			return {
				yes: true
			};
		});
		canFixture('GET /test/place', function (original) {
			return [original.data];
		});

		stop();
		ObjectDef.findOne({
			id: 5
		}, function () {
			start();
		}, function(){
			ok(false,"rejected")
			start();
		});

		/*
		stop();
		// Do find all, pass some attrs
		ObjectDef.findAll({
			start: 0,
			count: 10,
			myflag: 1
		}, function (data) {
			start();
			equal(data[0].myflag, 1, 'my flag set');
		});
		stop();
		// Do find all with slightly different attrs than before,
		// and notice when leaving one out the other is still there
		ObjectDef.findAll({
			start: 0,
			count: 10
		}, function (data) {
			start();
			equal(data[0].myflag, undefined, 'my flag is undefined');
		});*/
	});
	/*test('aborting create update and destroy', function () {
		stop();
		var delay = can.fixture.delay;
		can.fixture.delay = 1000;
		can.fixture('POST /abort', function () {
			ok(false, 'we should not be calling the fixture');
			return {};
		});
		var Abortion = can.Model.extend({
			create: 'POST /abort',
			update: 'POST /abort',
			destroy: 'POST /abort'
		}, {});

		var a = new Abortion({
			name: 'foo'
		});

		var deferred =
			a.save(function () {
				ok(false, 'success create');
				start();
			}, function () {
				ok(true, 'create error called');
				deferred = new Abortion({
					name: 'foo',
					id: 5
				})
					.save(function () {
						ok(false, 'save called');
						start();
					}, function () {
						ok(true, 'error called in update');
						deferred = new Abortion({
							name: 'foo',
							id: 5
						})
							.destroy(function () {}, function () {
								ok(true, 'destroy error called');
								can.fixture.delay = delay;
								start();
							});
						setTimeout(function () {
							deferred.abort();
						}, 10);
					});
				setTimeout(function () {
					deferred.abort();
				}, 10);
			});
		setTimeout(function () {
			deferred.abort();
		}, 10);
	});*/
	test('store binding', function () {
		var Storage = can.Model.extend({},{});

		var s = new Storage({
			id: 1,
			thing: {
				foo: 'bar'
			}
		});

		ok(!Storage.store[1], 'not stored');

		var func = function () {};
		s.bind('foo', func);
		ok(Storage.store.has(1), 'stored');
		s.unbind('foo', func);
		ok(!Storage.store.has(1), 'not stored');
		var s2 = new Storage({});
		s2.bind('foo', func);
		s2.attr('id', 5);
		ok(Storage.store.has(5), 'stored');
		s2.unbind('foo', func);
		ok(!Storage.store.has(5), 'not stored');
	});
	test('store ajax binding', function () {
		var Guy = can.Model.extend({
			findAll: '/guys',
			findOne: '/guy/{id}'
		}, {});
		fixture('GET /guys', function () {
			return [{
				id: 1
			}];
		});
		fixture('GET /guy/{id}', function () {
			return {
				id: 1
			};
		});
		stop();
		Promise.all([Guy.findOne({
			id: 1
		}), Guy.findAll()])
			.then(function (result) {
				var guyRes = result[0], guysRes2 = result[1];
				equal(guyRes.id, 1, 'got a guy id 1 back');
				equal(guysRes2[0].id, 1, 'got guys w/ id 1 back');
				ok(guyRes === guysRes2[0], 'guys are the same');
				// check the store is empty
				setTimeout(function () {
					var id;
					start();
					for (id in Guy.store.set) {
						ok(false, 'there should be nothing in the store');
					}
				}, 1);
			});
	});

	test('store instance updates', function () {
		var Guy, updateCount;
		Guy = can.Model.extend({
			findAll: 'GET /guys'
		}, {});
		updateCount = 0;
		canFixture('GET /guys', function () {
			var guys = [{
				id: 1,
				updateCount: updateCount,
				nested: {
					count: updateCount
				}
			}];
			updateCount++;
			console.log(updateCount);
			return guys;
		});
		stop();
		Guy.findAll({}, function (guys) {
			start();
			guys[0].bind('updated', function () {});
			ok(Guy.store.has(1), 'instance stored');
			equal(Guy.store.get(1).updateCount, 0, 'updateCount is 0');
			equal(Guy.store.get(1).nested.count, 0, 'nested.count is 0');
		},function(){
			ok(false, "error")
		});

		Guy.findAll({}, function (guys) {
			equal(Guy.store.get(1).updateCount, 1, 'updateCount is 1');
			equal(Guy.store.get(1).nested.count, 1, 'nested.count is 1');
		}, function(){
			ok(false, "error")
		});
	});

	/*
	 test("store instance update removed fields", function(){
	var Guy, updateCount, remove;

	Guy = can.Model.extend({
		findAll : 'GET /guys'
	},{});
	remove = false;

	can.fixture("GET /guys", function(){
		var guys = [{id: 1, name: 'mikey', age: 35, likes: ['soccer', 'fantasy baseball', 'js', 'zelda'], dislikes: ['backbone', 'errors']}];
		if(remove) {
			delete guys[0].name;
			guys[0].likes = [];
			delete guys[0].dislikes;
		}
		remove = true;
		return guys;
	});
	stop();
	Guy.findAll({}, function(guys){
		start();
		guys[0].bind('updated', function(){});
		ok(Guy.store[1], 'instance stored');
		equal(Guy.store[1].name, 'mikey', 'name is mikey')
		equal(Guy.store[1].likes.length, 4, 'mikey has 4 likes')
		equal(Guy.store[1].dislikes.length, 2, 'mikey has 2 dislikes')
	})
	Guy.findAll({}, function(guys){
		equal(Guy.store[1].name, undefined, 'name is undefined')
		equal(Guy.store[1].likes.length, 0, 'no likes')
		equal(Guy.store[1].dislikes, undefined, 'dislikes removed')
	})

})
	 */
	test('templated destroy that inherits id', function () {
		var MyModel = can.Model.extend({
			destroy: '/destroyplace/{id}'
		}, {});
		fixture('/destroyplace/{id}', function (original) {
			ok(true, 'fixture called');
			equal(original.url, '/destroyplace/5', 'urls match');
			return {};
		});
		stop();
		new MyModel({
			id: 5
		})
			.destroy(function () {
				start();
			});

		fixture('/product/{id}', function (original) {
			equal(original.data.id, 9001, 'Changed ID is correctly set.');
			return {};
		});

		Base = can.Model.extend({
			id: '_id'
		}, {});

		Product = Base.extend({
			destroy: 'DELETE /product/{_id}'
		}, {});

		var p = new Product({
			_id: 9001
		});
		p.destroy().then(function(){
				start()
			}, function(e){
				ok(false,"error"+e);
				start();
			});

		stop();
	});
	test('extended templated destroy', function () {
		var MyModel = can.Model({
			destroy: '/destroyplace/{attr1}/{attr2}/{id}'
		}, {});
		fixture('/destroyplace/{attr1}/{attr2}/{id}', function (original) {
			ok(true, 'fixture called');
			equal(original.url, '/destroyplace/foo/bar/5', 'urls match');
			return {};
		});
		stop();
		new MyModel({
			id: 5,
			attr1: 'foo',
			attr2: 'bar'
		})
			.destroy(function () {
				start();
			});
		fixture('/product/{attr3}/{id}', function (original) {
			equal(original.data.id, 9001, 'Changed ID is correctly set.');
			start();
			return {};
		});
		Base = can.Model({
			id: '_id'
		}, {});
		Product = Base({
			destroy: 'DELETE /product/{attr3}/{_id}'
		}, {});
		new Product({
			_id: 9001,
			attr3: 'great'
		})
			.destroy();
		stop();
	});

	/*test('overwrite makeFindAll', function () {
		var store = {};
		var LocalModel = can.Model.extend({
			makeFindOne: function (findOne) {
				return function (params, success, error) {
					var def = new can.Deferred(),
						data = store[params.id];
					def.then(success, error);
					// make the ajax request right away
					var findOneDeferred = findOne(params);
					if (data) {
						var instance = this.model(data);
						findOneDeferred.then(function (data) {
							instance.updated(data);
						}, function () {
							can.trigger(instance, 'error', data);
						});
						def.resolve(instance);
					} else {
						findOneDeferred.then(can.proxy(function (data) {
							var instance = this.model(data);
							store[instance[this.id]] = data;
							def.resolve(instance);
						}, this), function (data) {
							def.reject(data);
						});
					}
					return def;
				};
			}
		}, {
			updated: function (attrs) {
				can.Model.prototype.updated.apply(this, arguments);
				store[this[this.constructor.id]] = this.serialize();
			}
		});
		can.fixture('/food/{id}', function (settings) {
			return count === 0 ? {
				id: settings.data.id,
				name: 'hot dog'
			} : {
				id: settings.data.id,
				name: 'ice water'
			};
		});
		var Food = LocalModel({
			findOne: '/food/{id}'
		}, {});
		stop();
		var count = 0;
		Food.findOne({
			id: 1
		}, function (food) {
			count = 1;
			ok(true, 'empty findOne called back');
			food.bind('name', function () {
				ok(true, 'name changed');
				equal(count, 2, 'after last find one');
				equal(this.name, 'ice water');
				start();
			});
			Food.findOne({
				id: 1
			}, function (food2) {
				count = 2;
				ok(food2 === food, 'same instances');
				equal(food2.name, 'hot dog');
			});
		});
	});*/

	test('model list attr', function () {
		var Person = can.Model({}, {});
		var list1 = new Person.List(),
			list2 = new Person.List([
				new Person({
					id: 1
				}),
				new Person({
					id: 2
				})
			]);
		equal(list1.length, 0, 'Initial empty list has length of 0');
		list1.attr(list2);
		equal(list1.length, 2, 'Merging using attr yields length of 2');
	});
	test('destroying a model impact the right list', function () {
		var Person = can.Model.extend({
			destroy: function (id, success) {
				var def = isDojo ? new dojo.Deferred() : new can.Deferred();
				def.resolve({});
				return def;
			}
		}, {});
		var Organisation = can.Model.extend({
			destroy: function (id, success) {
				var def = isDojo ? new dojo.Deferred() : new can.Deferred();
				def.resolve({});
				return def;
			}
		}, {});
		var people = new Person.List([
			new Person({
				id: 1
			}),
			new Person({
				id: 2
			})
		]),
			orgs = new Organisation.List([
				new Organisation({
					id: 1
				}),
				new Organisation({
					id: 2
				})
			]);

		// you must be bound to the list to get this
		people.bind('length', function () {});
		orgs.bind('length', function () {});
		// set each person to have an organization
		people[0].attr('organisation', orgs[0]);
		people[1].attr('organisation', orgs[1]);
		equal(people.length, 2, 'Initial Person.List has length of 2');
		equal(orgs.length, 2, 'Initial Organisation.List has length of 2');
		orgs[0].destroy();
		equal(people.length, 2, 'After destroying orgs[0] Person.List has length of 2');
		equal(orgs.length, 1, 'After destroying orgs[0] Organisation.List has length of 1');
	});
	test('uses attr with isNew', function () {
		// TODO this does not seem to be consistent expect(2);
		var old = can.__observe;
		can.__observe = function (object, attribute) {
			if (attribute === 'id') {
				ok(true, 'used attr');
			}
		};
		var M = can.Model.extend({},{});
		var m = new M({
			id: 4
		});
		m.isNew();
		can.__observe = old;
	});

	test('extends defaults by calling base method', function () {
		var M1 = can.Model.extend({
			defaults: {
				foo: 'bar'
			}
		}, {});
		var M2 = M1({});
		equal(M2.defaults.foo, 'bar');
	});
	test('.models updates existing list if passed', 4, function () {
		var Model = can.Model.extend({},{});

		var list = Model.models([{
			id: 1,
			name: 'first'
		}, {
			id: 2,
			name: 'second'
		}]);

		list.bind('add', function (ev, newData) {
			equal(newData.length, 3, 'Got all new items at once');
		});

		var newList = Model.models([{
			id: 3,
			name: 'third'
		}, {
			id: 4,
			name: 'fourth'
		}, {
			id: 5,
			name: 'fifth'
		}], list);

		equal(list, newList, 'Lists are the same');
		equal(newList.attr('length'), 3, 'List has new items');
		equal(list[0].name, 'third', 'New item is the first one');
	});

	test('calling destroy with unsaved model triggers destroyed event (#181)', function () {
		var MyModel = can.Model.extend({}, {}),
			newModel = new MyModel(),
			list = new MyModel.List(),
			deferred;
		// you must bind to a list for this feature
		list.bind('length', function () {});
		list.push(newModel);
		equal(list.attr('length'), 1, 'List length as expected');
		deferred = newModel.destroy();
		ok(deferred, '.destroy returned a Deferred');
		equal(list.attr('length'), 0, 'Unsaved model removed from list');
		deferred.done(function (data) {
			ok(data === newModel, 'Resolved with destroyed model as described in docs');
		});
	});
	test('model removeAttr (#245)', function () {
		var MyModel = can.Model.extend({}),
			model;

		// pretend it is live bound
		model = MyModel.model({
			id: 0,
			index: 2,
			name: 'test'
		});
		MyModel.connection.addInstanceReference(model);

		model = MyModel.model({
			id: 0,
			name: 'text updated'
		});
		equal(model.attr('name'), 'text updated', 'attribute updated');
		equal(model.attr('index'), 2, 'Index attribute still remains');
		MyModel = can.Model.extend({
			removeAttr: true
		}, {});

		// pretend it is live bound
		model = MyModel.model({
			id: 0,
			index: 2,
			name: 'test'
		});
		MyModel.connection.addInstanceReference(model);
		model = MyModel.model({
			id: 0,
			name: 'text updated'
		});
		equal(model.attr('name'), 'text updated', 'attribute updated');
		deepEqual(model.attr(), {
			id: 0,
			name: 'text updated'
		}, 'Index attribute got removed');
	});
	test('.parseModel on create and update (#301)', function () {
		var MyModel = can.Model.extend({
			create: 'POST /todo',
			update: 'PUT /todo',
			parseModel: function (data) {
				return data.item;
			}
		}, {}),
			id = 0,
			updateTime;

		fixture('POST /todo', function (original, respondWith, settings) {
			id++;
			return {
				item: can.extend(original.data, {
					id: id
				})
			};
		});

		fixture('PUT /todo', function (original, respondWith, settings) {
			updateTime = new Date()
				.getTime();
			return {
				item: {
					updatedAt: updateTime
				}
			};
		});
		stop();

		MyModel.bind('created', function (ev, created) {
			start();
			deepEqual(created.attr(), {
				id: 1,
				name: 'Dishes'
			}, '.model works for create');
		})
			.bind('updated', function (ev, updated) {
				start();
				deepEqual(updated.attr(), {
					id: 1,
					name: 'Laundry',
					updatedAt: updateTime
				}, '.model works for update');
			});

		var instance = new MyModel({
			name: 'Dishes'
		}),
			saveD = instance.save();
		stop();
		saveD.then(function () {
			instance.attr('name', 'Laundry')
				.save(undefined, logErrorAndStart);
		}, logErrorAndStart);

	});


	test('List params uses findAll', function () {
		stop();
		fixture('/things', function (request) {
			equal(request.data.param, 'value', 'params passed');
			return [{
				id: 1,
				name: 'Thing One'
			}];
		});
		var Model = can.Model.extend({
			findAll: '/things'
		}, {});

		var items = new Model.List({
			param: 'value'
		});
		items.bind('add', function (ev, items, index) {
			equal(items[0].name, 'Thing One', 'items added');
			start();
		});
	});

	test('destroy not calling callback for new instances (#403)', function () {
		var Recipe = can.Model.extend({}, {});
		expect(1);
		stop();
		new Recipe({
			name: 'mow grass'
		})
			.destroy(function (recipe) {
				ok(true, 'Destroy called');
				start();
			});
	});

	test('.model should always serialize Observes (#444)', function () {
		var ConceptualDuck = can.Model.extend({
			defaults: {
				sayeth: 'Abstractly \'quack\''
			}
		}, {});
		var ObserveableDuck = can.Map({}, {});
		equal('quack', ConceptualDuck.model(new ObserveableDuck({
				sayeth: 'quack'
			}))
			.sayeth);
	});

	test('string configurable model and models functions (#128)', function () {
		var StrangeProp = can.Model.extend({
			parseModel: 'foo',
			parseModels: 'bar'
		}, {});

		var strangers = StrangeProp.models({
			bar: [{
				foo: {
					id: 1,
					name: 'one'
				}
			}, {
				foo: {
					id: 2,
					name: 'two'
				}
			}]
		});
		deepEqual(strangers.attr(), [{
			id: 1,
			name: 'one'
		}, {
			id: 2,
			name: 'two'
		}]);
	});

	test('create deferred does not resolve to the same instance', function () {
		var Todo = can.Model.extend({
			create: function () {
				var def = new can.Deferred();
				def.resolve({
					id: 5
				});
				return def;
			}
		}, {});
		var handler = function () {};
		var t = new Todo({
			name: 'Justin'
		});
		t.bind('name', handler);

		var def = t.save();
		stop();
		def.then(function (todo) {
			ok(todo === t, 'same instance');
			start();
			ok(Todo.store.get(5) === t, 'instance put in store');
			t.unbind('name', handler);
		});
	});

	test("Model#save should not replace attributes with their default values (#560)", function () {

		fixture("POST /person.json", function (request, response) {

			return {
				createdAt: "now"
			};
		});

		var Person = can.Model.extend({
			update: 'POST /person.json'
		}, {
			name: 'Example name'
		});

		var person = new Person({
			id: 5,
			name: 'Justin'
		}),
			personD = person.save();

		stop();

		personD.then(function (person) {
			start();
			equal(person.name, "Justin", "Model name attribute value is preserved after save");

		});
	});

	test(".parseModel as function on create and update (#560)", function () {
		var MyModel = can.Model.extend({
			create: 'POST /todo',
			update: 'PUT /todo',
			parseModel: function (data) {
				return data.item;
			}
		}, {
			aDefault: "foo"
		}),
			id = 0,
			updateTime;

		fixture('POST /todo', function (original, respondWith, settings) {
			id++;
			return {
				item: can.extend(original.data, {
					id: id
				})
			};
		});
		fixture('PUT /todo', function (original, respondWith, settings) {
			updateTime = new Date()
				.getTime();
			return {
				item: {
					updatedAt: updateTime
				}
			};
		});

		stop();
		MyModel.bind('created', function (ev, created) {
			start();
			deepEqual(created.attr(), {
				id: 1,
				name: 'Dishes',
				aDefault: "bar"
			}, '.model works for create');
		})
			.bind('updated', function (ev, updated) {
				start();
				deepEqual(updated.attr(), {
					id: 1,
					name: 'Laundry',
					updatedAt: updateTime
				}, '.model works for update');
			});

		var instance = new MyModel({
			name: 'Dishes',
			aDefault: "bar"
		}),
			saveD = instance.save();

		stop();
		saveD.then(function () {
			instance.attr('name', 'Laundry');
			instance.removeAttr("aDefault");
			instance.save();
		});

	});

	test(".parseModel as string on create and update (#560)", function () {
		var MyModel = can.Model.extend({
			create: 'POST /todo',
			update: 'PUT /todo',
			parseModel: "item"
		}, {
			aDefault: "foo"
		}),
			id = 0,
			updateTime;

		fixture('POST /todo', function (original, respondWith, settings) {
			id++;
			return {
				item: can.extend(original.data, {
					id: id
				})
			};
		});
		fixture('PUT /todo', function (original, respondWith, settings) {
			updateTime = new Date()
				.getTime();
			return {
				item: {
					updatedAt: updateTime
				}
			};
		});

		stop();
		MyModel.bind('created', function (ev, created) {
			start();
			deepEqual(created.attr(), {
				id: 1,
				name: 'Dishes',
				aDefault: "bar"
			}, '.model works for create');
		})
			.bind('updated', function (ev, updated) {
				start();
				deepEqual(updated.attr(), {
					id: 1,
					name: 'Laundry',
					updatedAt: updateTime
				}, '.model works for update');
			});

		var instance = new MyModel({
			name: 'Dishes',
			aDefault: "bar"
		}),
			saveD = instance.save();

		stop();
		saveD.then(function () {
			instance.attr('name', 'Laundry');
			instance.removeAttr("aDefault");
			instance.save();
		});

	});

	test("parseModels and findAll", function () {

		var array = [{
			id: 1,
			name: "first"
		}];

		canFixture("/mymodels", function () {
			return array;
		});

		var MyModel = can.Model.extend({
			findAll: "/mymodels",
			parseModels: function (raw, xhr) {
				// only check this if jQuery because its deferreds can resolve with multiple args

				equal(array, raw, "got passed raw data");
				return {
					data: raw,
					count: 1000
				};
			}
		}, {});

		stop();

		MyModel.findAll({}, function (models) {
			equal(models.count, 1000);
			start();
		});

	});

	test("parseModels and parseModel and findAll", function () {

		fixture("/mymodels", function () {
			return {
				myModels: [{
					myModel: {
						id: 1,
						name: "first"
					}
				}]
			};
		});

		var MyModel = can.Model.extend({
			findAll: "/mymodels",
			parseModels: "myModels",
			parseModel: "myModel"
		}, {});

		stop();

		MyModel.findAll({}, function (models) {
			deepEqual(models.attr(), [{
				id: 1,
				name: "first"
			}], "correct models returned");
			start();
		});

	});

	test("Nested lists", function(){
		var Teacher = can.Model.extend({});
		var teacher = new Teacher();
		teacher.attr("locations", [{id: 1, name: "Chicago"}, {id: 2, name: "LA"}]);
		ok(!(teacher.attr('locations') instanceof Teacher.List), 'nested list is not an instance of Teacher.List');
		ok(!(teacher.attr('locations')[0] instanceof Teacher), 'nested map is not an instance of Teacher');
	});

	test("#501 - resource definition - create", function() {
		fixture("/foods", function() {
			return [];
		});

		var FoodModel = can.Model.extend({
			resource: "/foods"
		}, {});

		stop();
		var steak = new FoodModel({name: "steak"});
		steak.save(function(food) {
			equal(food.name, "steak", "create created the correct model");
			start();
		});
	});

	test("#501 - resource definition - findAll", function() {
		fixture("/drinks", function() {
			return [{
				id: 1,
				name: "coke"
			}];
		});

		var DrinkModel = can.Model.extend({
			resource: "/drinks"
		}, {});

		stop();
		DrinkModel.findAll({}, function(drinks) {
			deepEqual(drinks.attr(), [{
				id: 1,
				name: "coke"
			}], "findAll returned the correct models");
			start();
		});
	});

	test("#501 - resource definition - findOne", function() {
		fixture("GET /clothes/{id}", function() {
			return [{
				id: 1,
				name: "pants"
			}];
		});

		var ClothingModel = can.Model.extend({
			resource: "/clothes"
		}, {});

		stop();
		ClothingModel.findOne({id: 1}, function(item) {
			equal(item[0].name, "pants", "findOne returned the correct model");
			start();
		}, logErrorAndStart);
	});

	test("#501 - resource definition - remove trailing slash(es)", function() {
		fixture("POST /foods", function() {
			return [];
		});

		var FoodModel = can.Model.extend({
			resource: "/foods//////"
		}, {});

		stop();
		var steak = new FoodModel({name: "steak"});
		steak.save(function(food) {
			equal(food.name, "steak", "removed trailing '/' and created the correct model");
			start();
		});
	});

	test("model list destroy after calling replace", function(){
		expect(2);
		var MyModel = can.Model.extend({},{});
		var map = new MyModel({name: "map1"});
		var map2 = new MyModel({name: "map2"});
		var list = new MyModel.List([map, map2]);

		list.bind('destroyed', function(ev){
			ok(true, 'trigger destroyed');
		});
		can.trigger(map, 'destroyed');
		list.replace([map2]);
		can.trigger(map2, 'destroyed');
	});

	test("a model defined with a fullName has findAll working (#1034)", function(){
		var List = can.List.extend();

		can.Model.extend("My.Model",{
			List: List
		},{});

		equal(List.Map, My.Model, "list's Map points to My.Model");

	});

	test("providing parseModels works", function(){
		var MyModel = can.Model.extend({
			parseModel: "modelData"
		},{});

		var data = MyModel.parseModel({modelData: {id: 1}});
		equal(data.id,1, "correctly used parseModel");
	});

	test('#1089 - resource definition - inheritance', function() {
		fixture('GET /things/{id}', function() {
			return { id: 0, name: 'foo' };
		});

		var Base = can.Model.extend();
		var Thing = Base.extend({
			resource: '/things'
		}, {});

		stop();
		Thing.findOne({ id: 0 }, function(thing) {
			equal(thing.name, 'foo', 'found model in inherited model');
			start();
		}, function(e, msg) {
			ok(false, msg);
			start();
		});
	});

	test('#1089 - resource definition - CRUD overrides', function() {
		canFixture('GET /foos/{id}', function() {
			return { id: 0, name: 'foo' };
		});

		canFixture('POST /foos', function() {
			return { id: 1 };
		});

		canFixture('PUT /foos/{id}', function() {
			return { id: 1, updated: true };
		});

		canFixture('GET /bars', function() {
			return [{}];
		});

		var Thing = can.Model.extend({
			resource: '/foos',
			findAll: 'GET /bars',
			update: {
				url: '/foos/{id}',
				type: 'PUT'
			},
			create: function() {
				return can.ajax({
					url: '/foos',
					type: 'POST'
				});
			}
		}, {});

		var alldfd = Thing.findAll();
		var onedfd = Thing.findOne({ id: 0 });
		var postdfd = new Thing().save();

		stop();
		Promise.all([alldfd, onedfd, postdfd])
		.then(function(result) {

			var things = result[0], thing= result[1], newthing= result[2];

			equal(things.length, 1, 'findAll override called');
			equal(thing.name, 'foo', 'resource findOne called');
			equal(newthing.id, 1, 'post override called with function');

			newthing.save(function(res) {
				ok(res.updated, 'put override called with object');
				start();
			});
		},logErrorAndStart)
		["catch"](function() {
			ok(false, 'override request failed');
			start();
		});
	});

	test("findAll not called if List constructor argument is deferred (#1074)", function() {
		var count = 0;
		var Foo = can.Model.extend({
			findAll: function() {
				count++;
				return can.Deferred();
			}
		}, {});
		new Foo.List(Foo.findAll());
		equal(count, 1, "findAll called only once.");
	});

	test("static methods do not get overwritten with resource property set (#1309)", function() {
		var Base = can.Model.extend({
			resource: '/path',
			findOne: function() {
				var dfd = can.Deferred();
				dfd.resolve({
					text: 'Base findAll'
				});
				return dfd;
			}
		}, {});

		stop();

		Base.findOne({}).then(function(model) {
			ok(model instanceof Base);
			deepEqual(model.attr(), {
				text: 'Base findAll'
			});
			start();
		}, function() {
			ok(false, 'Failed handler should not be called.');
		});
	});

	test("parseModels does not get overwritten if already implemented in base class (#1246, #1272)", 5, function() {
		var Base = can.Model.extend({
			findOne: function() {
				var dfd = can.Deferred();
				dfd.resolve({
					text: 'Base findOne'
				});
				return dfd;
			},
			parseModel: function(attributes) {
				deepEqual(attributes, {
					text: 'Base findOne'
				}, 'parseModel called');
				attributes.parsed = true;
				return attributes;
			}
		}, {});
		var Extended = Base.extend({}, {});

		stop();

		Extended.findOne({}).then(function(model) {
			ok(model instanceof Base);
			ok(model instanceof Extended);
			deepEqual(model.attr(), {
				text: 'Base findOne',
				parsed: true
			});
			start();
		}, function() {
			ok(false, 'Failed handler should not be called.');
		});

		var Third = Extended.extend({
			findOne: function() {
				var dfd = can.Deferred();
				dfd.resolve({
					nested: {
						text: 'Third findOne'
					}
				});
				return dfd;
			},

			parseModel: 'nested'
		}, {});

		Third.findOne({}).then(function(model) {
			equal(model.attr('text'), 'Third findOne', 'correct findOne used');
		});
	});

	test("Models with no id (undefined or null) are not placed in store (#1358)", function(){
		var MyStandardModel = can.Model.extend({});
		var MyCustomModel = can.Model.extend({id:"ID"}, {});

		var myID = null;
		var instanceNull = new MyStandardModel ({id:myID});
		var instanceUndefined = new MyStandardModel ({});
		var instanceCustom = new MyCustomModel({ID:myID});


		instanceNull.bind('change', function(){});
		instanceUndefined.bind('change', function(){});
		instanceCustom.bind('change', function(){});


		ok(typeof MyStandardModel.store[instanceNull.id] === "undefined", "Model should not be added to store when id is null");
		ok(typeof MyStandardModel.store[instanceUndefined.id] === "undefined", "Model should not be added to store when id is undefined");
		ok(typeof MyCustomModel.store[instanceCustom[instanceCustom.constructor.id]] === "undefined", "Model should not be added to store when id is null");

	});

	test("Models should be removed from store when instance.removeAttr('id') is called", function(){
		var Task = can.Model.extend({},{});
		var t1 = new Task({id: 1, name: "MyTask"});

		t1.bind('change', function(){});
		ok(Task.store.get(t1.id).name === "MyTask", "Model should be in store");

		t1.removeAttr("id");
		ok(typeof Task.store.get(t1.id) === "undefined", "Model should be removed from store when `id` is removed");

	});

})();

