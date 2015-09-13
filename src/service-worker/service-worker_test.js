var QUnit = require("steal-qunit");
var serviceWorkerCache = require("can-connect/service-worker/");
var connect = require("can-connect");

var makeIframe = function(src){
	var iframe = document.createElement('iframe');
	window.removeMyself = function(){
		delete window.removeMyself;
		document.body.removeChild(iframe);
	};
	document.body.appendChild(iframe);
	iframe.src = src;
	return iframe;
};

var injectScript = function(frame, script) {
	frame.addEventListener("load", function() {
		var el = frame.contentWindow.document.createElement("script");
		el.innerText = script;
		frame.contentWindow.document.body.appendChild(el);
	});
};

if(typeof navigator.serviceWorker === "object") {

var testcount = 0;
var timeout;
QUnit.module("can-connect/service-worker-cache",{
	timeout: null,
	setup: function(){
		this.connection = connect([serviceWorkerCache],{
			name: "todos",
			findAll: "/todos",
			findOne: "/todos/{id}",
			update: "/todos/{id}",
			create: "/todos",
			destroy: "/todos/{id}",
			workerURL: System.stealURL.substr(0, System.stealURL.indexOf("can-connect")) + "can-connect/src/service-worker/service-worker-main_test.js",
			scope: System.stealURL.substr(0, System.stealURL.indexOf("can-connect")) + "can-connect/src/service-worker/"
		});
		testcount ++;
	},
	teardown: function() {
		var that = this;
		timeout && clearTimeout(timeout);
		timeout = setTimeout(function() {
			testcount--;
			if(testcount < 1) {
				navigator.serviceWorker.getRegistration().then(function(reg) {
					if(reg) {
						reg.unregister(location.pathname);
					}
				});
				//window.removeMyself();
			}
		}, 1000);
	}
});

QUnit.test("getStubListData", function(){
	stop();
	this.connection.ready.then(function() {
		var items = [{id: 1, foo:"bar"},{id: 2, foo:"bar"},{id: 3, foo:"bar"}];		
		injectScript(
			makeIframe("src/service-worker/test_frame.html"),
			'ready.then(function() {\
				connection.fixturize({\
					url: "/todos",\
			 		response: \'{"data": [{"id": 1}, {"id": 2}]}\'\
				}).onmessage = function() {\
				connection.getListData({})\
				.then(function(listData){\
					QUnit.deepEqual(listData, {data: [{id: 1}, {id: 2}]}, "got back data");\
					window.removeMyself();\
					QUnit.start();\
				}, function(e){ QUnit.ok(false, e.message); QUnit.start(); }); }; });'
		);
	});
});

QUnit.test("getStubInstanceData", function(){
	stop();
	this.connection.ready.then(function() {
		var items = [{id: 1, foo:"bar"},{id: 2, foo:"bar"},{id: 3, foo:"bar"}];		
		injectScript(
			makeIframe("src/service-worker/test_frame.html"),
			'ready.then(function() {\
				connection.fixturize({\
					url: "/todos/1",\
			 		response: \'{"data": {"id": 1}}\'\
				}).onmessage = function() {\
					connection.getInstanceData({id: 1})\
					.then(function(listData){\
						QUnit.deepEqual(listData, {data: {id: 1}}, "got back data");\
						window.removeMyself();\
						QUnit.start();\
					}, function(e){ QUnit.ok(false, e.message); QUnit.start(); }); }; });'
		);
	});
});

QUnit.test("updateStubInstanceData", function(){
	stop();
	this.connection.ready.then(function() {	
		injectScript(
			makeIframe("src/service-worker/test_frame.html"),
			'ready.then(function() {\
				connection.fixturize({\
					url: "/todos/1",\
			 		response: \'{"data": {"id": 1}}\'\
				}).onmessage = function() {\
					connection.updateInstanceData({id: 1, foo: "bar"})\
					.then(function() {\
						return connection.getInstanceData({id: 1});\
					})\
					.then(function(listData){\
						QUnit.deepEqual(listData, {data: {id: 1, foo: "bar"}}, "got back data");\
						window.removeMyself();\
						QUnit.start();\
					}, function(e){ QUnit.ok(false, e.message); QUnit.start(); }); }; });'
		);
	});
});

QUnit.test("updateStubListData", function(){
	stop();
	this.connection.ready.then(function() {	
		injectScript(
			makeIframe("src/service-worker/test_frame.html"),
			'ready.then(function() {\
				connection.fixturize({\
					url: "/todos/1",\
			 		response: \'{"data": {"id": 1}}\'\
				}).onmessage = function() {\
					connection.fixturize({\
						url: "/todos/2",\
				 		response: \'{"data": {"id": 2}}\'\
					}).onmessage = function() {\
						connection.updateListData([{id: 1, foo: "bar"}, {id: 2, foo: "baz"}])\
						.then(function() {\
							return connection.getInstanceData({id: 1});\
						})\
						.then(function(listData){\
							QUnit.deepEqual(listData, {data: {id: 1, foo: "bar"}}, "got back data");\
							return connection.getInstanceData({id: 2});\
						}).then(function(listData2) {\
							QUnit.deepEqual(listData2, {data: {id: 2, foo: "baz"}}, "got back data");\
							window.removeMyself();\
							QUnit.start();\
						}, function(e){ QUnit.ok(false, e.message); QUnit.start(); }); }; }; });'
		);
	});
});

QUnit.test("createStubInstanceData", function(){
	stop();
	this.connection.ready.then(function() {	
		injectScript(
			makeIframe("src/service-worker/test_frame.html"),
			'ready.then(function() {\
				connection.fixturize({\
					url: "/todos",\
			 		response: \'{"data": []}\'\
				}).onmessage = function() {\
					connection.createInstanceData({foo: "bar"})\
					.then(function() {\
						return connection.getListData({});\
					})\
					.then(function(listData){\
						QUnit.deepEqual(listData, {data: [{id: 1, foo: "bar"}]}, "got back data");\
						window.removeMyself();\
						QUnit.start();\
					}, function(e){ QUnit.ok(false, e.message); QUnit.start(); }); }; });'
		);
	});
});

QUnit.test("destroyStubInstanceData", function(){
	stop();
	this.connection.ready.then(function() {	
		injectScript(
			makeIframe("src/service-worker/test_frame.html"),
			'ready.then(function() {\
				connection.fixturize({\
					url: "/todos",\
			 		response: \'{"data": [{"id": 1}]}\'\
				}).onmessage = function() {\
					connection.destroyInstanceData({id: 1, foo: "bar"})\
					.then(function() {\
						return connection.getListData({});\
					})\
					.then(function(listData){\
						QUnit.deepEqual(listData, {data: []}, "got back data");\
						QUnit.start();\
						window.removeMyself();\
					}, function(e){ QUnit.ok(false, e.message); QUnit.start(); clearTimeout(to); }); }; });'
		);
	});
});


QUnit.test("register as client", function() {
	stop();
	this.connection.ready.then(function() {
		injectScript(
			makeIframe("src/service-worker/test_frame.html"), 
			"ready.then(function() {\
				connection.messageWorker({ request: 'run' }).onmessage = function(d) { \
					QUnit.equal(d.type, 'message');\
					QUnit.equal(d.data.type, 'ready');\
				  window.removeMyself();\
				  QUnit.start(); \
				}; \
			}, function(e){ QUnit.ok(false, e.message); QUnit.start(); });"
		);
	});
});

}