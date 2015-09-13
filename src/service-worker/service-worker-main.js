var cache_version = 'v1';

self.addEventListener("install", function(ev) {
	// ev.waitUntil(
	//  addCache(
	//    // registration.scope + "/todos",
	//    // new Response('{"data": [{"id": 1}, {"id": 2}]}')
	//  ).then(function() {
	//    console.log("WORKER - Installed");      
	//  }, function(e) {
	//    console.error("wORKER - Install failed!", e);
	//  })
	// );
});

self.addEventListener("activate", function(ev) {
	clients.matchAll({}).then(function(cs) {
		cs.forEach(function(c) {
			c.postMessage({ 
				type: "activated"
			});
		});
	});
});

function addCache(scope, response) {
	return caches.open(cache_version).then(function(cache) {
		return cache.put(
			scope,
			response
		);
	});
}

function removeCache(scope) {
	return caches.open(cache_version).then(function(cache) {
		return cache.delete(
			scope
		);
	}); 
}

self.addEventListener("message", function(ev){
	var deferred;
	console.log("WORKER - got message", ev.data);
	if(ev.data.request === "unregister") {

		deferred = self.registration.unregister(self.location.pathname);
		clients.matchAll({}).then(function(cs) {
			cs.forEach(function(c) {
				deferred.then(function() {
					c.postMessage({ response: "uninstalled" });
				});
			});
		});
	}

	else if(ev.data.request === "run") {
		ev.ports.forEach(function(port) {
			port.postMessage({ 
				type: "ready"
			});
		});
		clients.matchAll({}).then(function(cs) {
			console.log("sending ready to", cs.length, "clients:", cs);
			cs.forEach(function(c) {
				c.postMessage({ 
					type: "ready"
				});
			});
		});
	}

	else if(ev.data.request === "fixturize") {
		addCache(registration.scope + ev.data.url, new Response(ev.data.response)).then(function() {
			ev.ports.forEach(function(port) {
				port.postMessage({
					type: "fixturize:success"
				});
			});
		});
	}

	else {
		ev.ports.forEach(function(port) {
			port.postMessage({ 
				type: "response",
				requestId: ev.data.requestId,
				response: {data: [{id: 1}, {id: 2}]}
			});
		});
		clients.matchAll({}).then(function(cs) {
			cs.forEach(function(c) {
				c.postMessage({ 
					type: "response",
					requestId: ev.data.requestId,
					response: {data: [{id: 1}, {id: 2}]}
				});
			});
		});
	}   
});

self.addEventListener('fetch', function(event) {
	try {
		if(event.request.method === "PUT") {
			event.respondWith(
				caches.match(event.request).then(function(response) {
					return Promise.all([event.request.json(), response.json()]);
				}, function(e) {
					return fetch(event.request);
				}).then(function(jsons) {
					var key, newresponse;
					var newobj = jsons[0];
					var oldobj = jsons[1];
					for(key in newobj) {
						(oldobj.data || oldobj)[key] = newobj[key];
					}
					newresponse = new Response(JSON.stringify(oldobj));
					return addCache(event.request.url, newresponse).then(function() {
						// need another response to return because caching reads the body
						return new Response(JSON.stringify(oldobj));
					});
				})
			);
		} else if(event.request.method === "POST") {
			event.respondWith(
				caches.match(event.request).then(function(response) {
					return Promise.all([event.request.json(), response.json()]);
				}, function(e) {
					return fetch(event.request);
				}).then(function(jsons) {
					var newresponse;
					var newobj = jsons[0];
					var oldlist = jsons[1];
					newobj.id = oldlist.data.length + 1;
					oldlist.data.push(newobj);
					newresponse = new Response(JSON.stringify(oldlist));
					return Promise.all([
						addCache(event.request.url, newresponse),
						addCache(event.request.url + "/" + newobj.id, new Response(JSON.stringify(newobj)))
					]).then(function() {
						return new Response(JSON.stringify(newobj));
					});
				})
			);
		} else if(event.request.method === "DELETE") {
			event.respondWith(
				caches.match(event.request.url.replace(/\/[^\/]*$/, "")).then(function(response) {
					return Promise.all([event.request.json(), response.json()]);
				}, function(e) {
					return fetch(event.request);
				}).then(function(jsons) {
					var newresponse;
					var newobj = jsons[0];
					var oldlist = jsons[1];
					var id = event.request.url.substr(event.request.url.lastIndexOf("/") + 1);
					var i = oldlist.data.length - 1;
					for(; i >= 0; i--) {
						if(oldlist.data[i].id === +id) {
							oldlist.data.splice(i, 1);
						}
					}
					newresponse = new Response(JSON.stringify(oldlist));
					return Promise.all([
						addCache(event.request.url.replace(/\/[^\/]*$/, ""), newresponse),
						removeCache(event.request.url, new Response(JSON.stringify(newobj)))
					]).then(function() {
						return new Response(JSON.stringify(newobj));
					});
				})
			);
		} else if(event.request.method === "GET") {
			event.respondWith(
				caches.match(event.request).then(function(response) {
					return response || fetch(event.request);
				})
			);      
		}
	} catch(e) {
		console.log(e);
	}
});
