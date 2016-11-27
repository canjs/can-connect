var QUnit = require("steal-qunit");
var cacheRequests = require("can-connect/cache-requests/");
var memCache = require("can-connect/data/memory-cache/");
var connect = require("can-connect");
var map = [].map;

var set = require("can-set");

var getId = function(d) {
	return d.id;
};

QUnit.module("can-connect/cache-requests/",{
	setup: function(){

	}
});


QUnit.test("Get everything and all future requests should hit cache", function(assert) {
	var count = 0;
	var done = assert.async();

	var res = cacheRequests( {
		getListData: function(params){
			deepEqual(params,{},"called for everything");
			count++;
			equal(count,1,"only called once");
			return Promise.resolve([
				{id: 1, type: "critical", due: "today"},
				{id: 2, type: "notcritical", due: "today"},
				{id: 3, type: "critical", due: "yesterday"},
				{id: 4},
				{id: 5, type: "critical"},
				{id: 6, due: "yesterday"}
			]);
		},
		cacheConnection: memCache(connect.base({}))
	} );

	res.getListData({}).then(function(list){
		assert.deepEqual(map.call(list, getId), [1,2,3,4,5,6]);

		return res.getListData({type: "critical"});
	}).then(function(list) {
		assert.deepEqual(map.call(list.data, getId), [1,3,5]);

		return res.getListData({due: "today"});
	}).then(function(list) {
		deepEqual(map.call(list.data, getId), [1,2]);
		done();
	}).then(null, function(error) {
		assert.ok(false, error);
	});
});



QUnit.test("Incrementally load data", function(){
	stop();
	var count = 0;

	var algebra = set.comparators.rangeInclusive("start","end");

	var behavior = cacheRequests( {
		getListData: function(params){
			equal(params.start, count * 10 + 1, "start is right "+params.start);
			count++;
			equal(params.end, count * 10, "end is right "+params.end);


			var items = [];
			for(var i= (+params.start); i <= (+params.end); i++) {
				items.push({
					id: i
				});
			}
			return Promise.resolve({data: items});
		},
		algebra: algebra,
		cacheConnection: memCache(connect.base({algebra: algebra}))
	} );


	behavior.getListData({
		start: 1,
		end: 10
	}).then(function(listData){
		var list = listData.data;
		equal(list.length, 10, "got 10 items");
		equal(list[0].id, 1);
		equal(list[9].id, 10);

		behavior.getListData({
			start: 1,
			end: 20
		}).then(function(listData){
			var list = listData.data;
			equal(list.length, 20, "got 20 items");
			equal(list[0].id, 1, "0th object's id'");
			equal(list[19].id, 20, "19th object's id");


			behavior.getListData({start: 9, end: 12}).then(function(listData){
				var list = listData.data;
				equal(list.length, 4, "got 4 items");
				equal(list[0].id, 9);
				equal(list[3].id, 12);
				start();
			});



		});

	});

});
