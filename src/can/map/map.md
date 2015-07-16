@module {connect.Behavior} can-connect/can/map can/map
@group can-connect/can/map.map-static 0 Map Static Methods
@group can-connect/can/map.map 1 Map Instance Methods
@group can-connect/can/map.hydrators 2 Hydrators
@group can-connect/can/map.serializers 3 Serializers
@group can-connect/can/map.identifiers 4 Identifiers
@group can-connect/can/map.instance-callbacks 5 Instance Callbacks
@parent can-connect.behaviors

Connects a [can.Map](http://canjs.com/docs/can.Map.html) to everything that needs to be connected to

@signature `canMap( baseConnect )`

  Implements the hydrators, serializers, identifiers, and instance
  callback interfaces so they work with a [can.Map](http://canjs.com/docs/can.Map.html) and
  [can.List](http://canjs.com/docs/can.List.html).
  Adds static and prototype methods to the Map that make use of the connection's
  methods.
  
@body

## Use

The `can/map` behavior make a connection use instances of a [can.Map](http://canjs.com/docs/can.Map.html) and
[can.List](http://canjs.com/docs/can.List.html).  It also adds methods to the [can.Map](http://canjs.com/docs/can.Map.html)
that use the connection for retrieving, creating, updating, and destroying Map instances.

To use `can/map`, first create a Map and List constructor function:

```
var Todo = can.Map.extend({
  canComplete: function(ownerId) {
    return this.attr("ownerId") === ownerId;
  }
});

var TodoList = can.List.extend({
  Map: Todo
},{
  incomplete: function(){
    return this.filter(function(todo){
      return !todo.attr("complete")
    });
  }
});
```

Next, pass the Map and List constructor functions to `connect` as options. The following
creates a connection that connects `Todo` and `TodoList` to a restful URL:

```
var todoConnection = connect(["data-url","constructor","can/map"],{
  Map: Todo,
  List: TodoList,
  url: "/services/todos"
});
```

Now the connection can be used to CRUD `Todo` and `TodoList`s:

```
todoConnection.getList({}).then(function(todos){
  var incomplete = todos.incomplete();
  incomplete.attr(0).canComplete( 5 ) //-> true
})
```

However, because `can/map` adds methods to the `Map` option, you can use `Todo` directly to 
CRUD `Todo` and `TodoList`s:

```
Todo.getList({}).then(function(todos){ ... });
Todo.get({}).then(function(todo){ ... });

new Todo({name: "dishes"}).save().then(function(todo){
  todo.attr({
      name: "Do the dishes"
    })
    .save()
    .then(function(todo){
      todo.destroy();
    });
});
```

