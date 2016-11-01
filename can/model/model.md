@module can-connect/can/model/model
@parent can-connect.modules

@description Exports a constructor that works very similar to [can.Model](http://canjs.com/docs/can.Model.html).

@signature `Model.extend( static, prototype )`

  Defines a [can-map] that has almost all of the functionality of
  `can.Model`.

@body

## Use

`can-connect/can/model` is for backwards compatibility
with `can.Model` so that developers can migrate
to `can-connect` without having to rewrite their models immediately.

However, use of `can.Model` will be deprecated in CanJS 3.0. Instead of extending `can.Model`,
extend [can-map] and [can-list] and use the [can-connect/can/map/map] behavior to connect your Map and List to a connection:

```js
var CanMap = require("can-map");
var CanList = require("can-list");

var Todo = CanMap.extend({ ... });

var TodoList = CanList.extend({
  Map: Todo
},{ ... });

var todoConnection = connect(["data-url","constructor","can/map"],{
  Map: Todo,
  List: TodoList,
  url: "/services/todos"
});
```

Or, use the [can-connect/can/super-map/super-map] function to create a connection with the "super" behaviors:

```
var todoConnection = superMap({
  idProp: "_id",
  Map: Todo,
  List: TodoList,
  url: "/services/todos",
  name: "todo"
});
```

For your legacy code, you should just need to import "can-connect/can/model/" instead of "can/model/" like:

```js
import Model from "can-connect/can/model/";

Todo = Model.extend({
  findAll: "/todos"
},{});

Todo.findAll({}).then(function(todos){

});
```

## Upgrading can.Models to can-connect

This section walks through making the necessary changes to upgrade a legacy can.Model to use `can-connect` and its
behaviors.  We'll convert a `can.Model` and `can.Model.List` that looks like:

```
Todo = can.Model.extend({
  resource: "/",
  destroy: "POST /todos/{id}/delete",
  findOne: function(params){
    return $.get("/todos/"+params._id);
  },

  parseModels: function(data){
    return data.todos;
  },
  parseModel: "todo",

  id: "_id",
},{
  method: function(){ ... },
  define: { ... }
});

Todo.List = Todo.List.extend({ ... });
```

Converting this to use `can-connect` looks like:

```js
var CanMap = require("can-map"),
	CanList = require("can-list");

Todo = CanMap.extend({
  method: function(){ ... },
  define: { ... }
});
Todo.List = CanList.extend({
  Map: Todo
},{ ... })

connect([
	require("can-connect/data/url/url"),
	require("can-connect/data/parse/parse"),
	require("can-connect/constructor/constructor"),
	require("can-connect/constructor/store/store"),
	require("can-connect/can/map/map")
  ],
  {
    Map: Todo,
    List: Todo.List,

    url: {
      resource: "/",
      destroyData: "POST /todos/{id}/delete",
      getData: function(params){
        return $.get("/todos/"+params._id);
      }
    },

    parseListData: function(data){
      return data.todos;
    },
    parseInstanceProp: "todo",

    idProp: "_id"
  });
```

Instead of `Todo.findAll` and `Todo.findOne`, use `Todo.getList` and `Todo.get`.

Lets break this down in the following sections.

### Defining the Map and List

The first step is to pull out the parts of the Model and Model.List that define the
observable Map and List's behavior into a [can-map] and [can-list]:

```js
var CanMap = require("can-map"),
	CanList = require("can-list");

Todo = CanMap.extend({
  method: function(){ ... },
  define: { ... }
});
Todo.List = CanList.extend({
  Map: Todo
},{ ... })
```

One of the main advantageous of `can-connect` is that it lets separate persistence behavior
from property behavior.

### Connecting the Map and List to behaviors

The next step is to connect the Map and List to the right behaviors.  The following
adds behaviors with similar functionality to legacy `can.Map` and uses the [can-connect/can/map/map] behavior
(which makes use of [can-connect/constructor/constructor]) to connect the connection to the provided Map and List types:

```
connect([
	require("can-connect/data/url/url"),
	require("can-connect/data/parse/parse"),
	require("can-connect/constructor/constructor"),
	require("can-connect/constructor/store/store"),
	require("can-connect/can/map/map")
  ],
  {
    Map: Todo,
    List: Todo.List,
    ...
  })
```

### Connecting to urls

The [can-connect/data/url/url] behavior supports CRUDing data from urls.  It can be configured like:

```
connect(["data-url", ...],
  {
    ...
    url: {
      resource: "/",
      destroyData: "POST /todos/{id}/delete",
      getData: function(params){
        return $.get("/todos/"+params._id);
      }
    },
    ...
  });
```

### Correcting response data

The [can-connect/data/parse/parse] behavior supports correcting response data.  It can be configured like:

```
connect([..., "data-parse", ...],
  {
    ...
    parseListData: function(data){
      return data.todos;
    },
    parseInstanceProp: "todo",
    ...
  });
```

### Specifying the id

The id of a model is used in a variety of ways.  It's part of the [can-connect/base/base] behavior
added to every connection.  You can customize which property represents the id with [can-connect/base/base.idProp].

```
connect([...],
  {
    idProp: "_id"
  });
```

### Retrieving data

The [can-connect/can/map/map] behavior adds a `getList` and `get` method to the `Map` option.  Use them in
place of `findAll` and `findOne`:

```
Todo.findAll({}).then(function(todosList){ ... });
Todo.findOne({id: 5}).then(function(todo){ ... });
```

## Differences from can.Model

Model's produced from `can-connect/can/model`:

 - Do not support `makeFindAll` or `makeFindOne`.  If your legacy code did this, you can probably add it as a custom behavior.
 - Has the instance store at `Model.store`, but items should be retrieved like `Model.store.get(id)`.
 - Should not use `Model.models` or `Model.model` to correct Ajax data and should instead use `Models.parseModel` and `Model.parseModels`.
 - Uses a Promise polyfill, not jQuery's promises.
