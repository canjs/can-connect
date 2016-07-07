import connect from "can-connect";
import dataUrl from "can-connect/data/url/";
import constructor from "can-connect/constructor/";
import constructorStore from "can-connect/constructor/store/";
import "can-connect/data/memory-cache/";
import cacheRequests from "can-connect/cache-requests/cache-requests/";
import dataWorker from "can-connect/data/worker/";
import fixture from "can-fixture";

var cache = connect(['data-memory-cache'],{
	name: "todos"
});

var worker;
if(typeof document !== "undefined") {
	worker = new Worker( System.stealURL+"?main=src/data/worker/demo/todo_connection" );
}

var todosConnection = connect([
	dataUrl,
	cacheRequests,
	dataWorker,
	constructor,
	constructorStore],
  {
    url: "/todos",
    cacheConnection: cache,
    worker: worker,
    name: "todos"
  });


fixture.delay = 1000;
fixture({
	"GET /todos": function(request){
		return {data: [
			{id: 1, name: "wash dishes"},
			{id: 2, name: "mow lawn"},
			{id: 3, name: "do laundry"}
		]};
	}
});

export default todosConnection;
