var Qunit = require('steal-qunit');
var fixture = require("can-connect/fixture/");
var Model = require("can-connect/can/model/");
var set = require("can-set");

	
	QUnit.module('can/util/fixture');
	test('static fixtures', function () {
		

		stop();
		fixture('GET something', __dirname+'/fixtures/test.json');
		fixture('POST something', __dirname+'/fixtures/test.json');
		
		$.ajax({
			url: 'something',
			dataType: 'json'
		})
			.done(function (data) {
				equal(data.sweet, 'ness', 'can.get works');
				$.ajax({
					url: 'something',
					method: 'POST',
					dataType: 'json'
				})
					.done(function (data) {
						equal(data.sweet, 'ness', 'can.post works');
						start();
					});
			});
	});
	test('templated static fixtures', function () {
		stop();
		fixture('GET some/{id}', __dirname+'/fixtures/stuff.{id}.json');
		$.ajax({
			url: 'some/3',
			dataType: 'json'
		})
			.done(function (data) {
				equal(data.id, 3, 'Got data with proper id');
				start();
			});
	});
	test('dynamic fixtures', function () {
		stop();
		fixture.delay = 10;
		fixture('something', function () {
			return [{
				sweet: 'ness'
			}];
		});
		$.ajax({
			url: 'something',
			dataType: 'json'
		})
			.done(function (data) {
				equal(data.sweet, 'ness', 'can.get works');
				start();
			});
	});
	test('fixture function', 3, function () {
		stop();
		var url = __dirname+'/fixtures/foo.json';
		fixture(url, __dirname+'/fixtures/foobar.json');
		$.ajax({
			url: url,
			dataType: 'json'
		})
			.done(function (data) {
				equal(data.sweet, 'ner', 'url passed works');
				fixture(url, __dirname+'/fixtures/test.json');
				$.ajax({
					url: url,
					dataType: 'json'
				})
					.done(function (data) {
						equal(data.sweet, 'ness', 'replaced');
						fixture(url, null);
						$.ajax({
							url: url,
							dataType: 'json'
						})
							.done(function (data) {
								equal(data.a, 'b', 'removed');
								start();
							});
					});
			});
	});
	

	test('fixture.store fixtures', function () {
		stop();
		var store = fixture.store('thing', 1000, function (i) {
			return {
				id: i,
				name: 'thing ' + i
			};
		}, function (item, settings) {
			if (settings.data.searchText) {
				var regex = new RegExp('^' + settings.data.searchText);
				return regex.test(item.name);
			}
		});
		fixture('things', store.findAll);
		
		$.ajax({
			url: 'things',
			dataType: 'json',
			data: {
				offset: 100,
				limit: 200,
				order: ['name ASC'],
				searchText: 'thing 2'
			},
			success: function (things) {
				equal(things.data[0].name, 'thing 29', 'first item is correct');
				equal(things.data.length, 11, 'there are 11 items');
				start();
			}
		});
	});

	test('simulating an error', function () {
		var st = '{type: "unauthorized"}';
		fixture('/foo', function (request, response) {
			return response(401, st);
		});
		stop();
		$.ajax({
			url: '/foo',
			dataType: 'json'
		})
			.done(function () {
				ok(false, 'success called');
				start();
			})
			.fail(function (original, type) {
				ok(true, 'error called');
				equal(original.responseText, st, 'Original text passed');
				start();
			});
	});

	test('rand', function () {
		var rand = fixture.rand;
		var num = rand(5);
		equal(typeof num, 'number');
		ok(num >= 0 && num < 5, 'gets a number');
		stop();
		var zero, three, between, next = function () {
				start();
			};
		// make sure rand can be everything we need
		setTimeout(function timer() {
			var res = rand([1, 2, 3]);

			if (res.length === 0) {
				zero = true;
			} else if (res.length === 3) {
				three = true;
			} else {
				between = true;
			}
			if (zero && three && between) {
				ok(true, 'got zero, three, between');
				next();
			} else {
				setTimeout(timer, 10);
			}
		}, 10);
	});

	test('_getData', function () {
		var data = fixture._getData('/thingers/{id}', '/thingers/5');
		equal(data.id, 5, 'gets data');
		data = fixture._getData('/thingers/5?hi.there', '/thingers/5?hi.there');
		deepEqual(data, {}, 'gets data');
	});

	test('_getData with double character value', function () {
		var data = fixture._getData('/days/{id}/time_slots.json', '/days/17/time_slots.json');
		equal(data.id, 17, 'gets data');
	});

	test('_compare', function () {
		var same = set.equal({
			url: '/thingers/5'
		}, {
			url: '/thingers/{id}'
		}, fixture._compare);
		ok(same, 'they are similar');
		same = set.equal({
			url: '/thingers/5'
		}, {
			url: '/thingers'
		}, fixture._compare);
		ok(!same, 'they are not the same');
	});

	test('_similar', function () {
		var same = fixture._similar({
			url: '/thingers/5'
		}, {
			url: '/thingers/{id}'
		});
		ok(same, 'similar');
		same = fixture._similar({
			url: '/thingers/5',
			type: 'get'
		}, {
			url: '/thingers/{id}'
		});
		ok(same, 'similar with extra pops on settings');
		var exact = fixture._similar({
			url: '/thingers/5',
			type: 'get'
		}, {
			url: '/thingers/{id}'
		}, true);
		ok(!exact, 'not exact');
		exact = fixture._similar({
			url: '/thingers/5'
		}, {
			url: '/thingers/5'
		}, true);
		ok(exact, 'exact');
	});

	test('fixture function gets id', function () {
		fixture('/thingers/{id}', function (settings) {
			return {
				id: settings.data.id,
				name: 'justin'
			};
		});
		stop();
		$.ajax({
			url: '/thingers/5',
			dataType: 'json',
			data: {
				id: 5
			}
		})
			.done(function (data) {
				ok(data.id);
				start();
			});
	});

	test('replacing and removing a fixture', function () {
		var url = __dirname+'/fixtures/remove.json';
		fixture('GET ' + url, function () {
			return {
				weird: 'ness!'
			};
		});
		stop();
		$.ajax({
			url: url,
			dataType: 'json'
		})
			.done(function (json) {
				equal(json.weird, 'ness!', 'fixture set right');
				fixture('GET ' + url, function () {
					return {
						weird: 'ness?'
					};
				});
				$.ajax({
					url: url,
					dataType: 'json'
				})
					.done(function (json) {
						equal(json.weird, 'ness?', 'fixture set right');
						fixture('GET ' + url, null);
						$.ajax({
							url: url,
							dataType: 'json'
						})
							.done(function (json) {
								equal(json.weird, 'ness', 'fixture set right');
								start();
							});
					});
			});
	});
	
	test('fixture.store with can.Model', function () {
		var store = fixture.store(100, function (i) {
			return {
				id: i,
				name: 'Object ' + i
			};
		}),
			Model = can.Model.extend({
				findAll: 'GET /models',
				findOne: 'GET /models/{id}',
				create: 'POST /models',
				update: 'PUT /models/{id}',
				destroy: 'DELETE /models/{id}'
			}, {});
		fixture('GET /models', store.findAll);
		fixture('GET /models/{id}', store.findOne);
		fixture('POST /models', store.create);
		fixture('PUT /models/{id}', store.update);
		fixture('DELETE /models/{id}', store.destroy);
		stop();
		function errorAndStart(e){
			ok(false, "borked"+e);
			debugger;
			start();
		}
		Model.findAll()
			.then(function (models) {
				equal(models.length, 100, 'Got 100 models for findAll with no parameters');
				equal(models[95].name, 'Object 95', 'All models generated properly');
				return Model.findOne({
					id: 51
				})
					.then(function (data) {
						equal(data.id, 51, 'Got correct object id');
						equal('Object 51', data.name, 'Object name generated correctly');
						return new Model({
							name: 'My test object'
						})
							.save()
							.then(function (newmodel) {
								equal(newmodel.id, 100, 'Id got incremented');
								equal(newmodel.name, 'My test object');
								// Tests creating, deleting, updating
								return Model.findOne({
									id: 100
								})
									.then(function (model) {
										equal(model.id, 100, 'Loaded new object');
										model.attr('name', 'Updated test object');
										return model.save()
											.then(function (model) {
												equal(model.name, 'Updated test object', 'Successfully updated object');
												return model.destroy()
													.then(function (deleted) {
														start();
													},errorAndStart);
											},errorAndStart);
									},errorAndStart);
							},errorAndStart);
					},errorAndStart);
			}, errorAndStart);
	});

	test('fixture.store returns 404 on findOne with bad id (#803)', function () {
		var store = fixture.store(2, function (i) {
			return {
				id: i,
				name: 'Object ' + i
			};
		}),
			Model = can.Model.extend({
				findOne: 'GET /models/{id}'
			}, {});

		fixture('GET /models/{id}', store.findOne);
		stop();

		Model.findOne({ id: 3 })
					.then(function(){},function (data) {
						
						equal(data.statusText, 'error', 'Got an error');
						equal(data.responseText, 'Requested resource not found', 'Got correct status message');
						start();
					});
	});
	
	test('fixture.store returns 404 on update with a bad id (#803)', function () {
		var store = fixture.store(5, function (i) {
			return {
				id: i,
				name: 'Object ' + i
			};
		}),
			MyModel = Model.extend({
				update: 'POST /models/{id}'
			}, {});

		stop();
		
		fixture('POST /models/{id}', store.update);
		new MyModel({id: 6, 'jedan': 'dva'}).save()
					.then(function(){},function (data) {
						equal(data.statusText, 'error', 'Got an error');
						equal(data.responseText, 'Requested resource not found', 'Got correct status message');
						start();
					});
	});
	
	test('fixture.store returns 404 on destroy with a bad id (#803)', function () {
		var store = fixture.store(2, function (i) {
			return {
				id: i,
				name: 'Object ' + i
			};
		}),
			MyModel = Model.extend({
				destroy: 'DELETE /models/{id}'
			}, {});

		stop();
		
		fixture('DELETE /models/{id}', store.destroy);

		new MyModel({id: 6}).destroy()
					.then(function(){},function (data) {
						equal(data.statusText, 'error', 'Got an error');
						equal(data.responseText, 'Requested resource not found', 'Got correct status message');
						start();
					});
	});

	test('fixture.store can use id of different type (#742)', function () {
		var store = fixture.store(100, function (i) {
				return {
					id: i,
					parentId: i * 2,
					name: 'Object ' + i
				};
			}),
			Model = can.Model.extend({
				findAll: 'GET /models'
			}, {});
		fixture('GET /models', store.findAll);
		stop();
		Model.findAll({ parentId: '4' })
			.then(function (models) {
				equal(models.length, 1, 'Got one model');
				deepEqual(models[0].attr(), { id: 2, parentId: 4, name: 'Object 2' });
				start();
			});
	});

	test('fixture with response callback', 4, function () {
		fixture.delay = 10;
		fixture('responseCb', function (orig, response) {
			response({
				sweet: 'ness'
			});
		});
		fixture('responseErrorCb', function (orig, response) {
			response(404, 'This is an error from callback');
		});
		stop();
		$.ajax({
			url: 'responseCb',
			dataType: 'json'
		})
			.done(function (data) {
				equal(data.sweet, 'ness', 'can.get works');
				start();
			});
		stop();
		$.ajax({
			url: 'responseErrorCb',
			dataType: 'json'
		})
			.fail(function (orig, error, text) {
				equal(error, 'error', 'Got error status');
				equal(orig.responseText, 'This is an error from callback', 'Got error text');
				start();
			});
		stop();
		fixture('cbWithTimeout', function (orig, response) {
			setTimeout(function () {
				response([{
					epic: 'ness'
				}]);
			}, 10);
		});
		$.ajax({
			url: 'cbWithTimeout',
			dataType: 'json'
		})
			.done(function (data) {
				equal(data[0].epic, 'ness', 'Got responsen with timeout');
				start();
			});
	});

	test('store create works with an empty array of items', function () {
		var store = fixture.store(0, function () {
			return {};
		});
		store.create({
			data: {}
		}, function (responseData, responseHeaders) {
			equal(responseData.id, 0, 'the first id is 0');
		});
	});

	test('store creates sequential ids', function () {
		var store = fixture.store(0, function () {
			return {};
		});
		store.create({
			data: {}
		}, function (responseData, responseHeaders) {
			equal(responseData.id, 0, 'the first id is 0');
		});
		store.create({
			data: {}
		}, function (responseData, responseHeaders) {
			equal(responseData.id, 1, 'the second id is 1');
		});
		store.destroy({
			data: {
				id: 0
			}
		});
		store.create({
			data: {}
		}, function (responseData, responseHeaders) {
			equal(responseData.id, 2, 'the third id is 2');
		});
	});

	test('fixture updates request.data with id', function() {
		expect(1);
		stop();


		fixture('foo/{id}', function(request) {
			equal(request.data.id, 5);
			start();
		});

		$.ajax({
			url: 'foo/5'
		});
	});
	
	test("create a store with array and comparison object",function(){
		
		var store = fixture.store([
			{id: 1, modelId: 1, year: 2013, name: "2013 Mustang", thumb: "http://mustangsdaily.com/blog/wp-content/uploads/2012/07/01-2013-ford-mustang-gt-review-585x388.jpg"},
			{id: 2, modelId: 1, year: 2014, name: "2014 Mustang", thumb: "http://mustangsdaily.com/blog/wp-content/uploads/2013/03/2014-roush-mustang.jpg"},
			{id: 2, modelId: 2, year: 2013, name: "2013 Focus", thumb: "http://images.newcars.com/images/car-pictures/original/2013-Ford-Focus-Sedan-S-4dr-Sedan-Exterior.png"},
			{id: 2, modelId: 2, year: 2014, name: "2014 Focus", thumb: "http://ipinvite.iperceptions.com/Invitations/survey705/images_V2/top4.jpg"},
			{id: 2, modelId: 3, year: 2013, name: "2013 Altima", thumb: "http://www.blogcdn.com/www.autoblog.com/media/2012/04/04-2013-nissan-altima-1333416664.jpg"},
			{id: 2, modelId: 3, year: 2014, name: "2014 Altima", thumb: "http://www.blogcdn.com/www.autoblog.com/media/2012/04/01-2013-nissan-altima-ny.jpg"},
			{id: 2, modelId: 4, year: 2013, name: "2013 Leaf", thumb: "http://www.blogcdn.com/www.autoblog.com/media/2012/04/01-2013-nissan-altima-ny.jpg"},
			{id: 2, modelId: 4, year: 2014, name: "2014 Leaf", thumb: "http://images.thecarconnection.com/med/2013-nissan-leaf_100414473_m.jpg"}
		],{
			year: function(a, b){
				return a == b;
				
			},
			modelId: function(a, b){
				return a == b;
			}
		});
		
		
		fixture('GET /presetStore', store.findAll);
		stop();
		$.ajax({ url: "/presetStore", method: "get", data: {year: 2013, modelId:1}, dataType: "json" }).then(function(response){
			
			equal(response.data[0].id, 1, "got the first item");
			equal(response.data.length, 1, "only got one item");
			start();
		});
		
	});

	test("store with objects allows .create, .update and .destroy (#1471)", 6, function(){

		var store = fixture.store([
			{id: 1, modelId: 1, year: 2013, name: "2013 Mustang", thumb: "http://mustangsdaily.com/blog/wp-content/uploads/2012/07/01-2013-ford-mustang-gt-review-585x388.jpg"},
			{id: 2, modelId: 1, year: 2014, name: "2014 Mustang", thumb: "http://mustangsdaily.com/blog/wp-content/uploads/2013/03/2014-roush-mustang.jpg"},
			{id: 3, modelId: 2, year: 2013, name: "2013 Focus", thumb: "http://images.newcars.com/images/car-pictures/original/2013-Ford-Focus-Sedan-S-4dr-Sedan-Exterior.png"},
			{id: 4, modelId: 2, year: 2014, name: "2014 Focus", thumb: "http://ipinvite.iperceptions.com/Invitations/survey705/images_V2/top4.jpg"},
			{id: 5, modelId: 3, year: 2013, name: "2013 Altima", thumb: "http://www.blogcdn.com/www.autoblog.com/media/2012/04/04-2013-nissan-altima-1333416664.jpg"},
			{id: 6, modelId: 3, year: 2014, name: "2014 Altima", thumb: "http://www.blogcdn.com/www.autoblog.com/media/2012/04/01-2013-nissan-altima-ny.jpg"},
			{id: 7, modelId: 4, year: 2013, name: "2013 Leaf", thumb: "http://www.blogcdn.com/www.autoblog.com/media/201204/01-2013-nissan-altima-ny.jpg"},
			{id: 8, modelId: 4, year: 2014, name: "2014 Leaf", thumb: "http://images.thecarconnection.com/med/2013-nissan-leaf_100414473_m.jpg"}
		]);


		fixture('GET /cars', store.findAll);
		fixture('POST /cars', store.create);
		fixture('PUT /cars/{id}', store.update);
		fixture('DELETE /cars/{id}', store.destroy);

		var Car = can.Model.extend({
			resource: '/cars'
		}, {});

		stop();
		Car.findAll().then(function(cars) {
			equal(cars.length, 8, 'Got all cars');
			return cars[1].destroy();
		}).then(function() {
			return Car.findAll();
		}).then(function(cars) {
			equal(cars.length, 7, 'One car less');
			equal(cars.attr('1.name'), '2013 Focus', 'Car actually deleted');
		}).then(function() {
			var altima = new Car({
				modelId: 3,
				year: 2015,
				name: "2015 Altima"
			});

			return altima.save();
		}).then(function(saved) {
			ok(typeof saved.id !== 'undefined');
			saved.attr('name', '2015 Nissan Altima');
			return saved.save();
		}).then(function(updated) {
			equal(updated.attr('name'), '2015 Nissan Altima');
			return Car.findAll();
		}).then(function (cars) {
			equal(cars.length, 8, 'New car created');
			start();
		});
	});

	
	