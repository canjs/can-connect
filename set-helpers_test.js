
var QUnit = require("steal-qunit");
var sets = require("./set-helpers");


var getId = function(d){ return d.id };

QUnit.module("can-connect/set-helpers",{
	setup: function(){
		
	}
});

var compareStartAndEnd = {
	compare: { rangedProperties: ["start","end"] }
};

test("combineRange - basics", function(){
	
	var res = sets.combineRange({start: 100, end: 199}, {start: 200, end: 299}, compareStartAndEnd);
	deepEqual(res, {start:100, end:299}, "default compare works");
	
	var res = sets.combineRange({start: 200, end: 299}, {start: 100, end: 199}, compareStartAndEnd);
	deepEqual(res, {start:100, end:299}, "default compare works");
	
	var res = sets.combineRange({start: 200, end: 299}, {start: 100, end: 209}, compareStartAndEnd);
	deepEqual(res, {start:100, end:299}, "default compare works");
	
	var res = sets.combineRange({start: 100, end: 299}, {start: 103, end: 209}, compareStartAndEnd);
	deepEqual(res, {start:100, end:299}, "default compare works");
	
	var res = sets.combineRange({start: 100, end: 299}, {start: 100, end: 299}, compareStartAndEnd);
	deepEqual(res, {start:100, end:299}, "default compare works");
	
	
});


test("diff - basics", function(){
	var diff = sets.diff({start: 100, end: 149}, {start: 100, end: 299}, compareStartAndEnd);
	deepEqual(diff, {needs: [150,299], insertNeeds: "after", cached: [100,149], properties: ["start","end"]}, "default diff works");
	
	var diff = sets.diff({start: 150, end: 299}, {start: 100, end: 299}, compareStartAndEnd);
	deepEqual(diff, {needs: [100,149], insertNeeds: "before", cached: [150,299], properties: ["start","end"]}, "default diff works");
	
	var diff = sets.diff({start: 100, end: 299}, {start: 101, end: 102}, compareStartAndEnd);
	deepEqual(diff, {cached: [101,102], properties: ["start","end"]}, "default diff works");
});

test("diffRange - basics", function(){
	var diff = sets.diffRanges({start: 100, end: 149}, {start: 100, end: 299}, compareStartAndEnd);
	deepEqual(diff, 
		{
			needs: {start: 150,end:299}, 
			count: 150, 
			cached: {start: 100, end:149}
		}, "default diff works");
});

test("merge - basics", function(){
	
	var setObjects = [{
		set: { start: 10, end: 11 },
		items: [{id: 10}, {id: 11}]
	},{
		set: { start: 12, end: 13 },
		items: [{id: 12}, {id: 13}]
	}];
	
	
	var res = sets.merge(setObjects, compareStartAndEnd, function(o1, o2, combined, options){
		var rangedProperties = sets.rangedProperties(options);
		if(rangedProperties) {
			var diff = sets.diff( o1.set, o2.set, options );
			if( diff ) {
				return {
					set: combined,
					items: diff.insertNeeds === "before" ? o2.items.concat(o1.items) : o1.items.concat(o2.items)
				};
			}
		}
		return {
			set: combined
		};
	});
	
	deepEqual(res,[{
		set: {start: 10, end: 13},
		items: [{id: 10}, {id: 11}, {id: 12}, {id: 13}]
	}], "merged correctly");
	
});

