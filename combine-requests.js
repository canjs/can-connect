
var connect = require("can-connect");
var canSet = require("can-set");
var can = require("can/util/util");

// TODO: rename combine-requests
/**
 * @module can-connect/combine-set
 * 
 * Combines multiple incoming requests into one if possible.
 * 
 * ```
 * {from: 1000, to: 2000},{from: 2001: to: 3000} => {from: 1000, to: 3000}
 * {},{type: "directories"},{type: "files"} => {}
 * ```
 * 
 * @param {{}} options
 * 
 *   @option {can.Object.compare} compare 
 */
module.exports = connect.behavior("combined-requests",function(base, options){
	options = options || {};
	var pendingRequests; //[{params, deferred}]
	
	return {
		combinePendingRequests: function(pendingParams){
			// this should try to merge existing param requests, into an array of 
			// others to send out
			// but this data structure keeps the original promises.
			
			
			// we need the "biggest" sets first so they can swallow up everything else
			// O(n log n)
			pendingRequests.sort(function(pReq1, pReq2){
				
				if(canSet.subset(pReq1.params, pReq2.params, options.compare)) {
					return 1;
				} else if( canSet.subset(pReq2.params, pReq1.params, options.compare) ) {
					return -1;
				} 
				
			});
			
			// O(n^2).  This can probably be made faster, but there are rarely lots of pending requests.
			var combineData = [];
			var current;
			var self = this;
			doubleLoop(pendingRequests, {
				start: function(pendingRequest){
					current = {
						params: pendingRequest.params,
						pendingRequests: [pendingRequest]
					};
					combineData.push(current);
				},
				iterate: function(pendingRequest){
					var combined = canSet.union(current.params, pendingRequest.params, options.compare);
					if(combined) {
						// add next 
						current.params = combined;
						current.pendingRequests.push(pendingRequest);
						// removes this from iteration
						return true;
					}
				}
			});
			
			return new can.Deferred().resolve(combineData);
		},
		getSubset: function(params, combinedParams, data, options){
			return canSet.getSubset(params, combinedParams, data, options.compare);
		},
		getListData: function(params){
			var self = this;
			
			if(!pendingRequests) {
				
				pendingRequests = [];
				
				setTimeout(function(){
					var combineDataPromise = self.combinePendingRequests(params);
					
					combineDataPromise.then(function(combinedData){
						// farm out requests
						combinedData.forEach(function(combined){
							
							base.getListData(combined.params).then(function(data){
								
								if(combined.pendingRequests.length === 1) {
									combined.pendingRequests[0].deferred.resolve(data);
								} else {
									combined.pendingRequests.forEach(function(pending){
										pending.deferred.resolve( self.getSubset(pending.params, combined.params, data, options) );
									});
								}
								
							});
						});
					});
					
					
				}, options.time || 1);
			}
			
			var deferred = new can.Deferred();
			pendingRequests.push({deferred: deferred, params: params});
			
			return deferred;	
		}
	};
});	
	

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
		i++;
	}
};

