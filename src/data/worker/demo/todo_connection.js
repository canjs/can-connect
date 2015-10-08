import connect from "can-connect";
import "can-connect/data/url/";
import "can-connect/constructor/";
import "can-connect/constructor/store/";
import "can-connect/data/memory-cache/";
import "can-connect/cache-requests/";
import "can-connect/data/worker/";
import fixture from "can-fixture";

var cache = connect(['data-memory-cache'],{
	name: "todos"
});

var worker;
if(typeof document !== "undefined") {
	worker = new Worker( System.stealURL+"?main=src/data/worker/demo/todo_connection" );
}

var todosConnection = connect([
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
