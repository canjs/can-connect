@module {connect.Behavior} can-connect/can/map/map
@group can-connect/can/map/map.map-static 0 map static methods
@group can-connect/can/map/map.map 1 map instance methods
@group can-connect/can/map/map.hydrators 2 hydrators
@group can-connect/can/map/map.serializers 3 serializers
@group can-connect/can/map/map.identifiers 4 identifiers
@group can-connect/can/map/map.instance-callbacks 5 instance callbacks
@group can-connect/can/map/map.static 6 behavior static methods
@parent can-connect.behaviors

Make a connection use a [can-define/map/map] type.

@signature `canMap( baseConnection )`

  Implements the hydrators, serializers, identifiers, and instance
  callback interfaces of [can-connect/constructor/constructor] so they work with a [can-define/map/map] and [can-define/list/list].
  Adds static methods like [can-connect/can/map/map.getList] and prototype methods
  like [can-connect/can/map/map.prototype.isDestroying] to the Map type that make use of the connection's
  methods.



@body

## Use

The `can-connect/can/map/map` behavior make a connection use instances of a [can-define/map/map] and
[can-define/list/list].  It also adds methods to the [can-define/map/map]
that use the connection for retrieving, creating, updating, and destroying Map instances.

To use `can-connect/can/map/map`, first create a Map and List constructor function:

```
var Todo = DefineMap.extend({
  canComplete: function(ownerId) {
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

Next, pass the Map and List constructor functions to `connect` as options. The following
creates a connection that connects `Todo` and `TodoList` to a restful URL:

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
  incomplete[0].canComplete( 5 ) //-> true
});
```

However, because `can/map` adds methods to the `Map` option, you can use `Todo` directly to
retrieve `Todo` and `TodoList`s:

```js
Todo.getList({}).then(function(todos){ ... });
Todo.get({}).then(function(todo){ ... });
```

You can also create, update, and [can-connect/can/map/map.prototype.destroy] todo instances. Notice
that [can-connect/can/map/map.prototype.save] is used to create
and update:


```js
new Todo({name: "dishes"}).save().then(function(todo){
  todo.set({
      name: "Do the dishes"
    })
    .save()
    .then(function(todo){
      todo.destroy();
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
