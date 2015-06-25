
var connect = require("can-connect");
var getItems = require("can-connect/helpers/get-items");
var canSet = require("can-set");
var helpers = require("can-connect/helpers/");
require("when/es6-shim/Promise");

module.exports = connect.behavior("data-worker",function(base){


	if(typeof document !== "undefined") {
		
		var requestId = 0;
		var requestDeferreds = {};
		var isReady = helpers.deferred();

		var behavior = {
			_workerRequest: function(data){
				data.type =  "can-connect:data-worker:"+this.name+":request";
				data.requestId = requestId++;
				
				// save the deferred so it can later be resolved when this response comes back
				var def = helpers.deferred(),
					worker = this.worker;
				requestDeferreds[data.requestId] = def;
				
				isReady.promise.then(function(){
					worker.postMessage(data);
				});
				
				return def.promise;
			},
			init: function(){
				// check if there's a worker, if not a workerURL
				if(!this.worker) {
					console.warn("No worker provided, defaulting to base behavior");
					return;
				}
				var worker = this.worker,
					connection = this;
				
				worker.onmessage = function(ev){
					var data = ev.data;
					if(!data.type || data.type.indexOf("can-connect:data-worker:"+connection.name) !== 0) {
						return;
					}
					console.log("MAIN - message:",connection.name, ev.data.method);
					
					var method = ev.data.method;
					
					if(method === "ready" || method === "pong") {
						isReady.resolve();
					} else {
						requestDeferreds[ev.data.requestId].resolve(ev.data.response);
					}
					
				};
				
				// send a ping to see if the worker is ready.  If this doesn't get a response,
				// we assume the worker will send a ready
				worker.postMessage({
					type: "can-connect:data-worker:"+connection.name+":response",
					connectionName: connection.name,
					method: "ping"
				});
			}
		};
		/**
		 * @function can-connect/data/worker.getListData getListData
		 * @parent can-connect/data/worker.data
		 * 
		 * If passed a [can-connect/data/worker.worker] option, overwritten
		 * to forward calling this method on a connection in the worker that
		 * shares this connection's [can-connect/data/worker.name].
		 */
		["getListData",
		/**
		 * @function can-connect/data/worker.updateListData updateListData
		 * @parent can-connect/data/worker.data
		 * 
		 * If passed a [can-connect/data/worker.worker] option, overwritten
		 * to forward calling this method on a connection in the worker that
		 * shares this connection's [can-connect/data/worker.name].
		 */
		"updateListData",
		/**
		 * @function can-connect/data/worker.getSets getSets
		 * @parent can-connect/data/worker.data
		 * 
		 * If passed a [can-connect/data/worker.worker] option, overwritten
		 * to forward calling this method on a connection in the worker that
		 * shares this connection's [can-connect/data/worker.name].
		 */
		"getSets",
		/**
		 * @function can-connect/data/worker.clear clear
		 * @parent can-connect/data/worker.data
		 * 
		 * If passed a [can-connect/data/worker.worker] option, overwritten
		 * to forward calling this method on a connection in the worker that
		 * shares this connection's [can-connect/data/worker.name].
		 */
		"clear",
		/**
		 * @function can-connect/data/worker.getData getData
		 * @parent can-connect/data/worker.data
		 * 
		 * If passed a [can-connect/data/worker.worker] option, overwritten
		 * to forward calling this method on a connection in the worker that
		 * shares this connection's [can-connect/data/worker.name].
		 */
		"getData",
		/**
		 * @function can-connect/data/worker.createData createData
		 * @parent can-connect/data/worker.data
		 * 
		 * If passed a [can-connect/data/worker.worker] option, overwritten
		 * to forward calling this method on a connection in the worker that
		 * shares this connection's [can-connect/data/worker.name].
		 */
		"createData",
		/**
		 * @function can-connect/data/worker.updateData updateData
		 * @parent can-connect/data/worker.data
		 * 
		 * If passed a [can-connect/data/worker.worker] option, overwritten
		 * to forward calling this method on a connection in the worker that
		 * shares this connection's [can-connect/data/worker.name].
		 */
		"updateData",
		/**
		 * @function can-connect/data/worker.destroyData destroyData
		 * @parent can-connect/data/worker.data
		 * 
		 * If passed a [can-connect/data/worker.worker] option, overwritten
		 * to forward calling this method on a connection in the worker that
		 * shares this connection's [can-connect/data/worker.name].
		 */
		"destroyData"].forEach(function(name){

			behavior[name] = function(){
				return this._workerRequest({
					method: name,
					args: [].slice.call(arguments, 0)
				});
			};
		});
		
		return behavior;
	} else {
		// uses `init` to get a handle on the connnection.
		return {
			init: function(){
				var connection = this;
				
				addEventListener("message", function(ev){
			
					var data = ev.data;
					
					// make sure this is meant for us
					if(!data.type || data.type.indexOf("can-connect:data-worker:"+connection.name) !== 0) {
						return;
					}
					var method = data.method;
					console.log("WORKER - message:", connection.name, method);
					
					if(method === "ping") {
						return postMessage({
							type: "can-connect:data-worker:"+connection.name+":response",
							connectionName: connection.name,
							requestId: data.requestId,
							method: "pong"
						});
					}
					
					if(!connection[method]) {
						return console.warn("There's no method named "+method+" on connection "+connection.name);
					}
					
					connection[method].call(connection, data.args).then(function(response){
						postMessage({
							type: "can-connect:data-worker:"+connection.name+":response",
							requestId: data.requestId,
							response: response,
							method: method
						});
					});
				});
				
				// Let the other page know we are ready to recieve events.
				postMessage({
					type: "can-connect:data-worker:"+connection.name+":ready",
					connectionName: connection.name,
					method: "ready"
				});
				
			}
			/**
			 * @property {String} can-connect/data/worker.name name
			 * @parent can-connect/data/worker.identifiers
			 * 
			 * @option {String} The connection must be provided a unique name.
			 */
			
			/**
			 * @property {Worker} can-connect/data/worker.worker worker
			 * @parent can-connect/data/worker.identifiers
			 * 
			 * @option {Worker} A web-worker that "data instance" methods will be sent to.  This
			 * web-worker should include a connection that matches the name of the window's 
			 * connection.
			 */
		};
	}
	
	

	
	
});