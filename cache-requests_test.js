
var QUnit = require("steal-qunit");
var persist = require("./persist");
var cacheRequests = require("./cache-requests");


var getId = function(d){ return d.id};

QUnit.module("can-connect/cache-requests",{
	setup: function(){
		
		this.persistOptions = {
			findAll: function(){ }
		};
		
		this.base = persist({},this.persistOptions);
	}
});


QUnit.test("Get everything and all future requests should hit cache", function(){
	stop();
	var count = 0;
	this.persistOptions.findAll = function(params){
		deepEqual(params,{},"called for everything");
		count++;
		equal(count,1,"only called once");
		return new can.Deferred().resolve([
			{id: 1, type: "critical", due: "today"},
			{id: 2, type: "notcritical", due: "today"},
			{id: 3, type: "critical", due: "yesterday"},
			{id: 4},
			{id: 5, type: "critical"},
			{id: 6, due: "yesterday"}
		]);
	};
	
	var res = cacheRequests(this.base);
	
	res.getListData({}).then(function(list){
		
		deepEqual(list.map(getId), [1,2,3,4,5,6]);
		
		res.getListData({type: "critical"}).then(function(list){
			deepEqual(list.map(getId), [1,3,5]);
			
			res.getListData({due: "today"}).then(function(list){
				deepEqual(list.map(getId), [1,2]);
				start();
			});
			
		});
		
	});

});
