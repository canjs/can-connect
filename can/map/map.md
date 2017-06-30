@module {connect.Behavior} can-connect/can/map/map can/map
@group can-connect/can/map/map.options 0 behavior options
@group can-connect/can/map/map.map-static 1 map static methods
@group can-connect/can/map/map.map 2 map instance methods
@group can-connect/can/map/map.hydrators 3 hydrators
@group can-connect/can/map/map.serializers 4 serializers
@group can-connect/can/map/map.identifiers 5 identifiers
@group can-connect/can/map/map.instance-callbacks 6 instance callbacks
@group can-connect/can/map/map.static 7 behavior static methods
@parent can-connect.behaviors

Integrate a `can-connect` connection with a [can-define/map/map DefineMap] type. Among other things, adds the 
instance CRUD methods to the Map type of the connection.

@signature `canMap( baseConnection )`

Implements the hydrators, serializers, identifiers, and instance callback interfaces of [can-connect/constructor/constructor constructor] 
behavior so they work with a [can-define/map/map DefineMap] and [can-define/list/list DefineList]. Adds static methods 
like [can-connect/can/map/map.getList] and instance methods like [can-connect/can/map/map.prototype.isDestroying] to the 
Map type that integrate with the functionality of the connection.


@body

## Use

The `can/map` behavior makes a connection use instances of a [can-define/map/map DefineMap] and
[can-define/list/list DefineList].  It also adds methods to the [can-define/map/map DefineMap] that use the connection 
for retrieving, creating, updating, and destroying Map instances.

To use the `can/map` behavior, first create a Map and List constructor function:

```
var Todo = DefineMap.extend({
  allowComplete: function(ownerId) {
    return this.ownerId === ownerId;
  }
});

var TodoList = DefineList.extend({
  "#": Todo,
  incomplete: function(){
    return this.filter({complete: false});
  }
});
```

Next, pass the Map and List constructor functions to `connect` as options. The following creates a connection that 
connects `Todo` and `TodoList` to a RESTful data service:

```js
var connect = require("can-connect");

var todoConnection = connect([
    require("can-connect/data/url/url"),
    require("can-connect/constructor/constructor"),
    require("can-connect/can/map/map")
],{
  Map: Todo,
  List: TodoList,
  url: "/services/todos"
});
```

Now the connection can be used to CRUD `Todo` and `TodoList`s:

```js
todoConnection.getList({}).then(function(todos){
  var incomplete = todos.incomplete();
  incomplete[0].allowComplete( 5 ) //-> true
});
```

Instead of how it's down above, because `can/map` adds methods to the `Map` option, you can use `Todo` directly to 
retrieve `Todo` and `TodoList`s:

```js
Todo.getList({}).then(function(todos){ ... });
Todo.get({}).then(function(todo){ ... });
```

You can also create, update, and [can-connect/can/map/map.prototype.destroy] `Todo` instances. Notice that
[can-connect/can/map/map.prototype.save] is used to create and update:


```js
// create an instance
new Todo({name: "dishes"}).save().then(function(todo){
  todo.set({
      name: "Do the dishes"
    })
    .save() // update an instance
    .then(function(todo){
      todo.destroy(); // destroy an instance
    });
});
```

There's also methods that let you know if an instance is in the process of being
[can-connect/can/map/map.prototype.isSaving saved] or [can-connect/can/map/map.prototype.isDestroying destroyed]:

```js
var savePromise = new Todo({name: "dishes"}).save();
todo.isSaving() //-> true

savePromise.then(function(){
	todo.isSaving() //-> false

	var destroyPromise = todo.destroy();    
	todo.isDestroying() //-> true

	destroyPromise.then(function(){
        todo.isDestroying() //-> false
	})
})
```
