
var connect = require("can-connect");
var canSet = require("can-set");
var can = require("can/util/util");
var getItems = require("./helpers/get-items");

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
 *   @option {number} time
 */
module.exports = connect.behavior("data-combine-requests",function(base){
	var pendingRequests; //[{params, deferred}]
	
	return {
		combinePendingRequests: function(){
			// this should try to merge existing param requests, into an array of 
			// others to send out
			// but this data structure keeps the original promises.
			
			
			// we need the "biggest" sets first so they can swallow up everything else
			// O(n log n)
			var self = this;
			
			pendingRequests.sort(function(pReq1, pReq2){
				
				if(canSet.subset(pReq1.params, pReq2.params, self.compare)) {
					return 1;
				} else if( canSet.subset(pReq2.params, pReq1.params, self.compare) ) {
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
					var combined = canSet.union(current.params, pendingRequest.params, self.compare);
					if(combined) {
						// add next 
						current.params = combined;
						current.pendingRequests.push(pendingRequest);
						// removes this from iteration
						return true;
					}
				}
			});
			pendingRequests = null;
			return new can.Deferred().resolve(combineData);
		},
		getSubset: function(params, combinedParams, data){
			return canSet.getSubset(params, combinedParams, data, this.compare);
		},
		getListData: function(params){
			var self = this;
			
			if(!pendingRequests) {
				
				pendingRequests = [];
				
				setTimeout(function(){
					
					var combineDataPromise = self.combinePendingRequests();
					combineDataPromise.then(function(combinedData){
						// farm out requests
						combinedData.forEach(function(combined){
							
							base.getListData(combined.params).then(function(data){
								
								if(combined.pendingRequests.length === 1) {
									combined.pendingRequests[0].deferred.resolve(data);
								} else {
									combined.pendingRequests.forEach(function(pending){
										pending.deferred.resolve( {data: self.getSubset(pending.params, combined.params, getItems(data) )} );
									});
								}
								
							});
						});
					});
					
					
				}, this.time || 1);
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

