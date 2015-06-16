
var connect = require("can-connect");
var getItems = require("can-connect/helpers/get-items");
var can = require("can/util/util");
can = require("can/util/string/string");
var canSet = require("can-set");
var helpers = require("can-connect/helpers/");
require("when/es6-shim/Promise");

/**
 * @module can-connect/service-worker
 * @parent can-connect.modules
 */
var scope;

module.exports = connect.behavior("service-worker",function(options){
	var requestId = 0;
	var requestDeferreds = {};
	var isReady = new helpers.deferred();

	if(navigator.serviceWorker.controller) {
		navigator.serviceWorker.ready.then(function(registration) {
			if(!registration) console.error("ERROR no registration");
			scope = (registration || {}).scope;
			isReady.resolve(navigator.serviceWorker.controller);
		});
	} else {
		navigator.serviceWorker.register(
			options.workerURL,
			{ scope: (scope = options.scope || options.workerURL.replace(/(\/.*\/).*\??.*/, "$1")) }
		).then(function(manager) {
			var chennel;
			var worker = (manager.installing || manager.active);
			//manager.unregister(worker);

			if(worker === manager.installing) {
				worker.onstatechange = function(ev) {
					var channel = new MessageChannel();
					console.log("MAIN - State changed", ev.target.state);
					if(ev.target.state === "activated") {
						 isReady.resolve(worker);
					}
				};
			} else {
				 isReady.resolve(worker);
			}
		}).catch(function(e) {
			console.error(e);
		});
		//});
	}


	var makeRequest = function(url, data){
		var reqId = requestId++;
		var def = helpers.deferred();
		requestDeferreds[reqId] = def;
		var channel = {};
		if('MessageChannel' in window) {
			channel = new MessageChannel();
		}

		data = data || {};

		isReady.promise.then(function(){
			var _url = scope + url;

			if(typeof data.method !== "string" || data.method.toUpperCase() === "GET") {      
				if(data.body && !can.isEmptyObject(data.body)) {
					_url += "?" + can.param(data.body);
				}
				delete data.body;
			} else {
				url = new Request(can.extend({ url: url }, data));
			}

			fetch(
				_url, data
			).then(function(result) {
				return result.json().then(function(json) {
					def.resolve(json);
				});
			}).catch(function(result) {
				def.reject(result);
			});
		});

		return def.promise;
	};
	
	return {
		getListData: function(params){
			var url = options.findAll ?
									can.sub(options.findAll, params, true) || options.findAll :
									("/" + options.name);
			return makeRequest(
				url, 
				{
					body: params,
					method: "GET"
				}
			);
		},
		getInstanceData: function(params) {
			var url = options.findOne ?
									can.sub(options.findOne, params, true) || options.findOne :
									("/" + options.name + "/" + params.id);
			return makeRequest(
				url,
				{
					body: params,
					method: "GET"
				}
			);
		},
		updateListData: function(params) {
			var that = this;
			return Promise.all(params.map(function(param) {
				return that.updateInstanceData(param);
			}));
		}, 
		updateInstanceData: function(params) {
			var url = options.update ?
									can.sub(options.update, params) || options.update :
									("/" + options.name + "/" + params.id);
			return makeRequest(
				url,
				{
					body: JSON.stringify(params),
					method: "PUT"
				}
			);
		}, 
		createInstanceData: function(params) {
			var url = options.create ?
									can.sub(options.create, params) || options.create :
									("/" + options.name);
			return makeRequest(
				url,
				{
					body: JSON.stringify(params),
					method: "POST"
				}
			);
		}, 
		destroyInstanceData: function(params) {
			var url = options.destroy ?
									can.sub(options.destroy, params) || options.destroy :
									("/" + options.name + "/" + params.id);
			return makeRequest(
				url,
				{
					body: JSON.stringify(params),
					method: "DELETE"
				}
			);
		}, 
		messageWorker: function(params) {
			var channel = new MessageChannel();
			isReady.promise.then(function(worker) {
				worker.postMessage(params, [channel.port2]);        
			});
			return channel.port1;
		},
		fixturize: function(params) {
			return this.messageWorker({
				request: "fixturize",
				url: params.url,
				type: params.type || "GET",
				response: params.response
			})
		},
		ready: isReady.promise
	};
});