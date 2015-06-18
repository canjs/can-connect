
var connect = require("can-connect");
var getItems = require("can-connect/helpers/get-items");
var canSet = require("can-set");
var helpers = require("can-connect/helpers/");
require("when/es6-shim/Promise");

/**
 * @module can-connect/service-worker
 * @parent can-connect.behaviors
 * @hide
 */
module.exports = connect.behavior("service-worker",function(base){
	
	var worker = new Worker(this.workerURL);
	var requestId = 0;
	var requestDeferreds = {};
	var isReady = helpers.deferred();
	
	var makeRequest = function(data){
		var reqId = requestId++;
		var def = helpers.deferred();
		requestDeferreds[reqId] = def;
		
		isReady.promise.then(function(){
			worker.postMessage({
				request: data,
				requestId: reqId
			});
		});
		
		return def.promise;
	};
	worker.onmessage = function(ev){
		console.log("MAIN - got message", ev.data.type)
		if(ev.data.type === "ready"){ 
			isReady.resolve();
		} else if(ev.data.type === "response") {
			requestDeferreds[ev.data.requestId].resolve(ev.data.response);
		}
		
	};
	
	return {
		getListData: function(params){
			return makeRequest({
				params: params
			});
		}
	};
});