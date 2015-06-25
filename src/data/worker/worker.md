@module can-connect/data/worker data-worker
@parent can-connect.behaviors
@group can-connect/data/worker.identifiers Identifiers
@group can-connect/data/worker.data Data Methods

@signature `dataWorker(baseConnection)`

If a [Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
is provided, overwrites the "data interface methods" to package the arguments and send them as 
part of a `postMessage` to the Worker.


If a `Worker` is not provided, it is assumed "data-worker" is being added
within a worker thread.  It listens to messages sent to the Worker, calls the specified "data interface method" 
and sends a message back with the result.

Any data methods called on the `window` connection will wait until the `worker` connection
has established a handshake.

@body

## Use

The best way to use `data-worker` is to create a connection module that works when loaded in 
either the `window` or in a [Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers). 
This pattern tends to work even if workers are not supported.

The following creates a connection that does the work of [can-connect/cache-requests], 
[can-connect/data-url], and [can-connect/data/memory-cache] in a worker thread.  

@demo can-connect/src/data/worker/demo/worker.html

The `todo_connection` module can be found [here](https://github.com/canjs/can-connect/blob/master/src/data/worker/demo/todo_connection.js) 
and looks like the following:


```
// Create a cache.  This will only be used
// by the workerthread using the `cache-requests` behavior.
var cache = connect(['data-memory-cache'],{
	name: "todos-cache"
});

// If we are in the WINDOW thread, because there is a document,
// create a worker that loads the `todo_connection` module.
var worker;
if(typeof document !== "undefined") {
	var workerURL = System.stealURL+"?main=todo_connection";
	worker = new Worker( workerURL );
}

var todoConnection = connect([
	"data-url",
	"cache-requests",
	"data-worker",
	"constructor",
	"constructor-store"],
  {
    url: "/todos",
    cacheConnection: cache,
    worker: worker,
    name: "todos"
  });
```



The things to notice:

1. A `Worker` should be passed as the `worker` option
that loads a connection with the same name as the connection in the `window`.  In thise case, the same 
connection module is loaded so everything works.

2. A single `Worker` could load multiple connection modules and perform other behavior.  

### Split Connection Logic

THe previous example used a single module that was loaded by both the window and the worker.
This doesn't have to be the case.  Two different modules could be used.  For example, `todo-window.js` and
`todo-worker.js`.  Each might look like:

```
// todo-window.js
var workerURL = System.stealURL+"?main=models/todo-worker";

var todoConnection = connect([
	"data-worker",
	"constructor",
	"constructor-store"],
  {
    worker: new Worker( workerURL ),
    name: "todos"
  });
```

```
// todo-worker.js
var cache = connect(['data-memory-cache'],{
	name: "todos-cache"
});

var todoConnection = connect([
	"data-url",
	"cache-requests",
	"data-worker"],
  {
    url: "/todos",
    cacheConnection: cache,
    name: "todos"
  });
```

However, the problem with the two-module approach is that it will not work 
if Workers are not supported by your browser.






