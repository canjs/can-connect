
var QUnit = require("steal-qunit");
var persist = require("../persist");
var combineRequests = require("../combine-requests");
var set = require("can-set");


var getId = function(d){ return d.id};


QUnit.module("can-connect/combine_requests",{
	setup: function(){
		
		this.persistOptions = {
			findAll: function(){ }
		};
		
		this.base = persist({},this.persistOptions);
	}
});


QUnit.test("basics", function(){
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
	
	var res = combineRequests(this.base);
	
	var p1 = res.getListData({type: "critical"});
	var p2 = res.getListData({due: "today"});
	var p3 = res.getListData({});
	
	can.when(p1,p2,p3).then(function(res1, res2, res3){
		
		
		deepEqual(res1.map(getId), [1,3,5]);
		deepEqual(res2.map(getId), [1,2]);
		deepEqual(res3.map(getId), [1,2,3,4,5,6]);
		start();
	});
});


QUnit.test("ranges", function(){
	stop();
	var count = 0;
	this.persistOptions.findAll = function(params){
		deepEqual(params,{start: 0, end: 5},"called for everything");
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
	
	
	var res = combineRequests(this.base,{
		compare: set.comparators.rangeInclusive("start","end")
	});
	
	var p1 = res.getListData({start: 0, end: 3});
	var p2 = res.getListData({start: 2, end: 5});
	
	can.when(p1,p2).then(function(res1, res2){
		
		
		deepEqual(res1.map(getId), [1,2,3,4]);
		deepEqual(res2.map(getId), [3,4,5,6]);
		start();
	});
	
	
});
