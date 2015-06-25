@module can-connect/data/worker data-worker
@parent can-connect.behaviors
@group can-connect/data/worker.identifiers Identifiers

@signature `dataWorker(baseConnection)`

If a [Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
is provided, overwrites the "data interface methods" to package the arguments and send them as 
part of a `postMessage` to the Worker.


If a `Worker` is not provided, it is assumed "data-worker" is being added
within a worker thread.  It listens to messages sent to the Worker, calls the specified "data interface method" 
and sends a message back with the result.

@body

## Use

The best way to use `data-worker` is to create a connection that works when loaded in 
either the `window` or in a [Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers). 
This pattern tends to work even if workers are not supported.

The following creates a connection that does the work of [can-connect/cache-requests], 
[can-connect/data-url], and [can-connect/data/memory-cache] in a worker thread.  

@demo can-connect/src/data/worker/demo/worker.html

The `todoConnection` module looks like the following:


```
var cache = connect(['data-memory-cache'],{
	name: "todos-cache"
});

// If we are in the MAIN thread, because there is a document,
// create a worker that loads this module
var worker;
if(typeof document !== "undefined") {
	var workerURL = System.stealURL+"?main=src/data/worker/demo/todo_connection";
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




