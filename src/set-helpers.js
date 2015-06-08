var canObject = require("can/util/object/object");

/**
 * @module can-connect/set-helpers
 * 
 * Provides helpers for comparing sets.
 * 
 * @body
 * 
 * ## Understanding Sets
 * 
 * `can-connect` uses the parameters you passed to the server to represent the 
 * set of data you loaded from the server.
 * 
 * For example, if you pass `{due: "today"}`, by default, it will expect every item returned by the server
 * to include a property `due` that equals `"today"`.  Furthermore, by default, it expects a request like:
 * 
 * `{due: "today", authorId: 5}` to request a subset of data loaded by `{due: "today"}`.  This means
 * that if `{due: "today"}` has already been loaded, you probably don't need to make a request
 * for `{due: "today", authorId: 5}`.  
 * 
 * This type of set/superset behavior also extends to ranges.  Two different sets, with ranges, 
 * can overlap. For example, `{start: 0, end: 100}` and  `{start: 50, end: 150}` intersect.  
 * If one set has been loaded, you have to recieve less of the other set.
 * 
 * ## Use
 * 
 * This library provides helpers for comparting different sets.  The most important helpers are:
 * 
 * - setHelpers.supersetOf(setA, setB, compare) - `true` if setA is a superset of setB
 * - setHelpers.subsetOf(setA, setB, compare) - `true` if setA is a subset of setB
 * - setHelpers.same(setA, setB, compare) - `true` if setA and setB represent the same data
 * - setHelpers.diff(setA, setB, compare) - Returns intersection (and non intersection) range data.
 * 
 * 
 * 
 * ## Customizing with the `compare` object
 * 
 * You can configure the relationship between data. For example, if `{due: "March 30, 2015"}`
 * should be a superset of `{due: 1427763325612}`, you can pass a compare object like:
 * 
 * ```
 * sethelpers.supersetOf(
 *  {due: "March 30, 2015"},
 *  {due: 1427763325612},
 *  {
 *    due: function(super, sub){
 *      return moment(super).to("day") === moment(sub).to("day")
 *    }
 *  }
 * )
 * ```
 * 
 * By default, ranges are compared with inclusive indexes.  This means that
 * `{start: 50, end: 99}` loads 50 items.  Specify which properties represent a range with
 * the "rangedProperties" compare property like:
 * 
 * ```
 * sethelpers.diff(
 *  {start: 0, end: 100},
 *  {start: 50, end: 150},
 *  {
 *    rangedProperties: ['start','end']
 *  }
 * )
 * ```
 * 
 * If you want to use something like a limit / offset, you must convert these properties to a
 * indexed value:
 * 
 * ```
 * sethelpers.diff(
 *  {offset: 0, limit: 50},
 *  {offset: 25, limit: 50},
 *  {
 *    rangedProperties: {
 *      limit: function(limit, set){
 * 	      return set.offset+limit-1;
 *      },
 *      reverseLimit: function(start, end){
 * 	      return end-start+1;
 *      }
 *    }
 *  }
 * )
 * ```
 * 
 * ## diff
 * 
 * 
 * 
 */
var helpers;

module.exports = helpers = {
	// only one range can be different
	//diffRange: diffRange,
	
	diff: function(params1, params2, options){
		var rangedProperties = options && options.compare && options.compare.rangedProperties;
		if(rangedProperties) {
			// are they the same, minus the ranged properties?
			var p1 = cleanForRange(params1, options.compare);
		
			var p2 = cleanForRange(params2, options.compare);
			
			// these should be the same except for their shared values
			if(can.Object.same(p1, p2, options.compare)) {
				var diffResult;
				for(var i = 0 ; i < rangedProperties.length; i = i+ 2){
					var result = diff(params1, params2, rangedProperties[i], rangedProperties[i+1], options.compare);
					if(result && diffResult) {
						// we can only combine one range
						return;
					} else if(result) {
						diffResult = result;
					} 
				}
				return diffResult;
			}
		}
	},
	/**
	 * Returns params that are needed and cached
	 * @param {{}} params1 params that are in the cache
	 * @param {{}} params2 params that need to be requested
	 * @return {{}}
	 * 
	 *   @option {Object} needs params that need to be requested
	 *   @option {Object} cached params that are already available
	 */
	diffRanges: function(params1, params2, options){
		var result = helpers.diff(params1, params2, options);
		if(result) {
			params1 = cleanForRange(params1, options.compare);
			params2 = cleanForRange(params2, options.compare);
			
			var res = {count: 0};
			
			if( result.needs ) {
				// reuse params1
				res.needs = params1;
				res.needs[result.properties[0]] = result.needs[0];
				res.needs[result.properties[1]] = result.needs[1];
				res.count = result.needs[1] - result.needs[0]+1;
			}
			
			if( result.cached ) {
				res.cached = params2;
				res.cached[result.properties[0]] = result.cached[0];
				res.cached[result.properties[1]] = result.cached[1];
			}
			
			
			if(result.cached || result.needs) {
				return res;
			}
			
		}
	},
	/**
	 * If two params can be combined, returns a params that represents
	 * the combination.
	 */
	combineParams: function( params1, params2, options){
		// test set / superset
		if( canObject.subset(params1, params2, options.compare ) ) {
			return params2;
		} else if( canObject.subset(params2, params1, options.compare ) ) {
			return params1;
		} else {
			return callOnThisOrHelpers(this,"combineRange" ,params1, params2, options);
		}
	},
	/**
	 * If the two params' ranges can be combined, returns them combined. 
	 * @param {Object} params1
	 * @param {Object} params2
	 * @param {Object} options
	 */
	combineParamsRanges: function(params1, params2, options){
		var rangedProperties = options && options.compare && options.compare.rangedProperties;
		if(rangedProperties) {
			// are they the same, minus the ranged properties?
			var p1 = cleanForRange(params1, options.compare);
		
			var p2 = cleanForRange(params2, options.compare);
			
			// these should be the same except for their shared values
			if(can.Object.same(p1, p2, options.compare)) {
				var newRanges = {};
				for(var i = 0 ; i < rangedProperties.length; i = i+ 2){
					var result = combineRange(params1, params2, rangedProperties[i], rangedProperties[i+1], options.compare);
					if(result) {
						newRanges[rangedProperties[i]] = result[0];
						newRanges[rangedProperties[i+1]] = result[1];
					} else {
						// don't do anything if there's one non combine-able range
						return;
					}
				}
				return can.simpleExtend(p1, newRanges);
			}
			
		}
	},
	combineRange: function(params1, params2, options){
		return helpers.combineParamsRanges(params1, params2, options);
	},
	/**
	 * Merges a list of objects with a set property.
	 * @param {Array<{set: set}>} sets
	 * @param {Object} options
	 */
	merge: function(sets, options, combine){
		
		sets.sort(function(set1, set2){
			if(canObject.subset(set1.set, set2.set, options.compare)) {
				return 1;
			} else if( canObject.subset(set2.set, set1.set, options.compare) ) {
				return -1;
			} 
		});
		
		// O(n^2).  This can probably be made faster, but there are rarely lots of pending requests.
		var newSets = [];
		var current;
		doubleLoop(sets, {
			start: function(setObject){
				current = setObject;
			},
			iterate: function(setObject){
				var combined = callOnThisOrHelpers(self, "combineParams", current.set, setObject.set, options);
				if(combined) {
					current = combine(current, setObject, combined, options);
					return true;
				}
			},
			end: function(){
				newSets.push(current);
			}
		});
		return newSets;
	},
	mergeData: function(params, diff, needed, cached, options){
		var diffResult = helpers.diff(diff.cached, params, options);
		if(diffResult.insertNeeds === "before") {
			return needed.concat(cached);
		} else{
			return cached.concat(needed);
		}
	},
	rangedProperties: function(options){
		return options && options.compare && options.compare.rangedProperties;
	},
	paramsHasRangedProperties: function( params, options ) {
		var rangedProperties = options && options.compare && options.compare.rangedProperties;
		return rangedProperties && (rangedProperties[0] in params) && (rangedProperties[1] in params);
	}
};

var callOnThisOrHelpers = function(that, method){
	var args = [].slice.call(arguments, 2);
	
	if(that[method]) {
		return that[method].apply(that, args);
	} else {
		return helpers[method].apply(helpers, args);
	}
};


var cleanForRange = function(params, compare){
	if(compare && compare.rangedProperties) {
		params = can.simpleExtend({}, params);
		compare.rangedProperties.forEach(function(rangeName){
			delete params[rangeName];
		});	
	}
	return params;
};

var defaultCompare = function(v1, v2){
	if(v1 > v2) {
		return 1;
	} else if(v2 > v1) {
		return -1;
	} else {
		return 0;
	}
};

var compareValues = function(v1, v2, property, compare, params1, params2){
	if(compare[prop]) {
		return canObject.same(v1, v2, compare, params1, params2);
	} else {
		return defaultCompare(v1, v2);
	}
};

var nextToOrWithin = function(value, range){
	return value >= range[0]-1 && value <= range[1];
};
var within = function(value, range){
	return value >= range[0] && value <= range[1];
};

// normalize
var combineRange = function(params1, params2, property1, property2, compare){
	// p for param
	// v for value
	var p1v1 = params1[property1],
		p1v2 = params1[property2],
		p2v1 = params2[property1],
		p2v2 = params2[property2];
	
	// params1 contains params2
	if(p1v1 <= p2v1 && p1v2 >= p2v2) {
		return [p1v1, p1v2];
	}
	// params2 contains params1
	else if(p2v1 <= p1v1 && p2v2 >= p1v2) {
		return [p2v1, p2v2];
	}
	// params1 starts earlier and overlaps params2
	else if(p1v1 <= p2v1 && nextToOrWithin(p1v2, [p2v1, p2v2]) ) {
		return [p1v1, p2v2];
	}
	// params2 starts earlier and overlaps params1
	else if(p2v1 <= p1v1 && nextToOrWithin(p2v2, [p1v1, p1v2])) {
		return [p2v1, p1v2];
	}
};

// returns what needs to be loaded from p2's perspective
var diff = function(params1, params2, property1, property2, compare){
	// p for param
	// v for value
	var p1v1 = params1[property1],
		p1v2 = params1[property2],
		p2v1 = params2[property1],
		p2v2 = params2[property2];
	
	// params1 starts earlier and overlaps params2
	if(p1v1 <= p2v1 && within(p1v2, [p2v1, p2v2]) ) {
		return {
			needs: [p1v2+1, p2v2],
			insertNeeds: "after",
			cached: [p1v1,p1v2],
			properties: [property1, property2]
		};
	}
	// params2 starts earlier and overlaps params1
	else if(p2v1 <= p1v1 && within(p2v2, [p1v1, p1v2])) {
		return {
			needs: [p2v1, p1v1-1],
			insertNeeds: "before",
			cached: [p1v1,p1v2],
			properties: [property1, property2]
		};
	// right next to each other ... nothing cached
	} else if(p1v2 == p2v1-1) {
		return {
			needs: [p2v1,p2v2],
			insertNeeds: "after",
			properties: [property1, property2]
		};
	} else if(p2v2 == p1v1 - 1) {
		return {
			needs: [p2v1,p2v2],
			insertNeeds: "before",
			properties: [property1, property2]
		};
	} else if( within(p2v1, [p1v1, p1v2]) && within(p2v2, [p1v1, p1v2]) ) {
		return {
			cached: [p2v1,p2v2],
			properties: [property1, property2]
		};
	}
};

var doubleLoop = function(arr, callbacks){
	var i = 0;
	while(i < arr.length) {
		callbacks.start(arr[i]);
		var j = i+1;
		while( j < arr.length ) {
			if(callbacks.iterate(arr[j]) === true) {
				arr.splice(j, 1);
			} else {
				j++;
			}
		}
		callbacks.end && callbacks.end(arr[i]);
		i++;
	}
};