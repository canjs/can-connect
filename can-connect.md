@module {function} can-connect
@parent can-core
@group can-connect.behaviors 1 behaviors
@group can-connect.modules 2 modules
@group can-connect.types 3 data types
@outline 2
@package ./package.json

@description `can-connect` provides persisted data middleware. Use it to assemble powerful model layers for
any JavaScript project.

@signature `connect(behaviors, options)`

Goes through every behavior and assembles them into a final
connection.

```js
var connect = require("can-connect");
var todosConnection = connect([
    require("can-connect/data/url/url"),
    require("can-connect/constructor/constructor")    
],{
    url: "/api/todos"
});
```

  @param {Array<can-connect/Behavior>} behaviors An array of
  behaviors that will be used to compose the final connection.

  @param {Object} options an object of configuration
  options.

@body

`can-connect` comes with the following behaviors that:

Load data:

 - [can-connect/data/url/url] — Persist data to restful or other types of services.
 - [can-connect/data/parse/parse] — Extract response data into a format needed for other extensions.

Convert data into special types:

 - [can-connect/constructor/constructor] — Create instances of a constructor function or list type.
 - [can-connect/constructor/store/store] — Create only a single instance for a given id or a single list for a set.

Real time:

 - [can-connect/real-time/real-time] — Update lists and instances with server side events.

Caching strategies:

 - [can-connect/fall-through-cache/fall-through-cache] — Respond with data from the [connection.cacheConnection] and
   then update the response with data from the `raw CRUD Methods`.
 - [can-connect/cache-requests/cache-requests] — Save response data and use it for future requests.
 - [can-connect/data/combine-requests/combine-requests] — Combine overlapping or reduntant requests.

Caching layers:

 - [can-connect/data/localstorage-cache/localstorage-cache] — LocalStorage caching connection.
 - [can-connect/data/memory-cache/memory-cache] — LocalStorage caching connection.

The following modules glue certain methods together:

 - [can-connect/data/callbacks/callbacks] — Glues the result of the `raw CRUD Methods` to callbacks.
 - [can-connect/data/callbacks-cache/callbacks-cache] — Calls [connection.cacheConnection] methods whenever `raw CRUD methods` are called.


The following modules are useful to CanJS specifically:

 - [can-connect/can/map/map] — Create instances of a special [can-define/map/map] or [can-define/list/list] type.
 - [can-connect/can/super-map/super-map] — Create a connection for a [can-define/map/map] or [can-define/list/list] that uses almost all the plugins.
 - [can-connect/can/model/model] — Inherit from a highly compatible [can.Model](http://v2.canjs.com/docs/can.Model.html) implementation.
 - [can-connect/can/tag/tag] — Create a custom element that can load data into a template.

## Overview

The `can-connect` module exports a `connect` function that is used to assemble different
behaviors and some options into a `connection`.  For example, the following uses `connect` and
the [can-connect/constructor/constructor] and [can-connect/data/url/url] behaviors to create a `todoConnection`
connection:

```js
var connect = require("can-connect");
var constructor = require("can-connect/constructor/constructor");
var dataUrl = require("can-connect/data/url/url");

var todoConnection = connect(
  [constructor,dataUrl],
  {
    url: "/services/todos"
  });
```

A connection typically provides the ability to
create, read, update, or delete (CRUD) some data source. That data source is
usually accessed through the “Instance Interface” methods:

 - [can-connect/connection.get]
 - [can-connect/connection.getList]
 - [can-connect/connection.save]
 - [can-connect/connection.destroy]

For example, to get all todos from "GET /services/todos", we could write the following:

```
todoConnection.getList({}).then(function(todos){ ... });
```

__Behaviors__, like [can-connect/constructor/constructor] and [can-connect/data/url/url] implement,
extend, or require some set of [interfaces](#Interfaces).  For example, [can-connect/data/url/url] implements
the “Data Interface” methods, and [can-connect/constructor/constructor] implements the
“Instance Interface” methods.

The `connect` method calls these behaviors in the right order to create a connection. For instance,
the [can-connect/cache-requests/cache-requests] behavior must be applied after the [can-connect/data/url/url]
connection.  This is because [can-connect/cache-requests/cache-requests], overwrites [can-connect/data/url/url]’s
[can-connect/connection.getListData] first check a cache for the data.  Only if the data is not present,
does it call [can-connect/data/url/url]’s [can-connect/connection.getListData]. So even if we write:

```js
var dataUrl = require("can-connect/data/url/url");
var cacheRequests = require("can-connect/cache-requests/cache-requests");
connect([cacheRequests,dataUrl])
```

or

```
connect([dataUrl,cacheRequests])
```

... our connection will be built in the right order!

A __connection__ is just an object with each behavior object on its prototype chain and
its options object at the end of the prototype chain.


### Basic Use

To use `can-connect`, it’s typically best to start out with the most basic
behaviors: [can-connect/data/url/url] and [can-connect/constructor/constructor]. [can-connect/data/url/url]
connects the “Data Interface” to a restful service. [can-connect/constructor/constructor] adds
an “Instance Interface” that can create, read, update and delete (CRUD) typed data
using the lower-level "Data Interface".

By `typed` data we mean data that is more than just plain JavaScript objects.  For
example, we might to create `todo` objects with an `isComplete` method:

```js
var Todo = function(props){
  Object.assign(this, props);
};

Todo.prototype.isComplete = function(){
  return this.status === "complete";
};
```

And, we might want a special list type with `completed` and `active` methods:

```js
var TodoList = function(todos){
  [].push.apply(this, todos);
};
TodoList.prototype = Object.create(Array.prototype);

TodoList.prototype.completed = function(){
  return this.filter(function(todo){
    return todo.status === "complete";
  });
};

TodoList.prototype.active = function(){
  return this.filter(function(todo){
    return todo.status !== "complete";
  });
};
```

We can create a connection that connects a restful "/api/todos"
service to `Todo` instances and `TodoList` lists like:

```js
var todoConnection = connect([constructor, dataUrl],{
  url: "/api/todos",
  list: function(listData, set){
  	return new TodoList(listData.data);
  },
  instance: function(props) {
  	return new Todo(props);
  }
});
```

And then use that connection to get a `TodoList` of `Todo`s:

```js
todoConnection.getList({}).then(function(todos){
	var todosEl = document.getElementById("todos-list");
	todosEl.innerHTML = "<h2>Active</h2>"+
		render(todos.active())+
		"<h2>Complete</h2>"+
		render(todos.completed());
});

var render = function(todos) {
	return "<ul>"+todos.map(function(todo){
		return "<li>"+todo.name+
				"<input type='checkbox' "+
				(todo.isComplete() ? "checked" : "")+"/></li>";
	}).join("")+"</ul>";
};
```

The following demo shows the result:

@demo demos/can-connect/basics.html

This connection also lets you create, update, and destroy a Todo instance as follows:

```js
var todo = new Todo({
  name: "take out trash"
})

// POSTs to /api/todos name=take out trash
// server returns {id: 5}
todoConnection.save( todo ).then(function(todo){
  todo.id //-> 5
  todo.name = 'take out garbage'

  // PUTs to /api/todos/5 name=take out garbage
  // server returns {id: 5, "take out garbage"}
  todoConnection.save( todo ).then( function(todo){

    // DELETEs to /api/todos/5
    // server returns {}
    todoConnection.destroy( todo ).then( function(todo){

    });

  });

});
```

### Configure behaviors

Whenever `connect` creates a connection, it always adds the [can-connect/base/base]
behavior. This behavior defines configurable options that are used by almost
every other behavior.  For example, if your data uses an `_id` property
to uniquely identify todos, you
can specify this with [can-connect/base/base.idProp] like:

```js
var todoConnection = connect([
    require("can-connect/constructor/constructor"),
    require("can-connect/data/url/url")
],{
  url: "/api/todos",
  idProp: "_id"
});
```

Other behaviors list their configurable options in their own docs page.  

### Overwrite behaviors

If configurable options are not enough, you can overwrite any behavior with your own behavior.

For example, the `constructor`’s [can-connect/constructor/constructor.updatedInstance] behavior
sets the instance’s properties to match the result of [can-connect/connection.updateData]. But if
the `PUT /api/todos/5 name=take out garbage` request returned `{}`, the following would result in
a todo with only an `id` property:

```js
var todo = new Todo({id: 5, name: "take out garbage"})
// PUTs to /api/todos/5 name=take out garbage
// server returns {}
todoConnection.save( todo ).then( function(todo){

  todo.id //-> 5
  todo.name //-> undefined
});
```

The following overwrites the behavior of `updateData`:

```js
var mergeDataBehavior = {
  updateData: function(instance, data){
    Object.assign(instance, data);
  }
};

var todoConnection = connect([
    require("can-connect/constructor/can-connect/constructor"),
    require("can-connect/data/url/url")
    mergeDataBehavior
  ],{
  url: "/api/todos"
});
```

You can add your own behavior that overwrite all base behaviors by adding
it to the end of the behaviors list.


### CanJS use

If you are using CanJS, you can either:

- use the [can-connect/can/map/map] behavior that overwrites
  many methods and settings to work with [can-define/map/map] and [can-define/list/list].
- use the [can-connect/can/super-map/super-map] helper to create a connection that bundles [can-connect/can/map/map can/map] and
  many of the other extensions.

Using [can-connect/can/map/map] to create a connection looks like:

```js
var DefineMap = require("can-define/map/map");
var DefineList = require("can-define/list/list");

var Todo = DefineMap.extend({ ... });
Todo.List = DefineList.extend({
    "#": Todo
});

var todoConnection = connect([
    require("can-connect/data/url/url"),
    require("can-connect/can/map/map/map"),
    require("can-connect/constructor/constructor"),
    require("can-connect/constructor/store/store")
  ],{
  Map: Todo,
  url: "/todos"
});
```

When you bind on a `Todo` instance or `Todo.List` list, they will automatically call
[can.connect/constructor-store.addInstanceReference] and [can.connect/constructor-store.addListReference].

Using [can-connect/can/super-map/super-map] to create a connection looks like:

```js
var DefineMap = require("can-define/map/map");
var DefineList = require("can-define/list/list");

var Todo = DefineMap.extend({ ... });
Todo.List = DefineList.extend({
    "#": Todo
});

var todoConnection = superMap({
    Map: Todo,
    url: "/todos"
});
```

### ReactJS use

Help us create a special ReactJS behavior that integrates
a connection with React’s observable life-cycle. Read more [here](#Otheruse).

### Angular use

Help us create a special AngularJS behavior that integrates
a connection with Angular’s observable life-cycle. Read more [here](#Otheruse).

### Backbone use

Help us create a special BackboneJS behavior that integrates
a connection with Backbone’s observable life-cycle. Read more [here](#Otheruse).

### Other use

Integrating `can-connect` with your framework is typically pretty easy.  In general,
the pattern involves creating a behavior that integrates with your framework’s
observable instances. The [can-connect/can/map/map]
behavior can serve as a good guide. You’ll typically want to implement the following
in your behavior:

`.instance` - Creates the appropriate observable object type.  
`.list` - Creates the appropriate observable array type.  
`.serializeInstance` - Return a plain object out of the observable object type.  
`.serializeList` - Return a plain array out of the observable array type.  

`.createdInstance` - Update an instance with data returned from `createData`.  
`.updatedInstance` - Update an instance with data returned from `updateData`.  
`.destroyedInstance` -  Update an instance with data returned from `destroyData`.  
`.updatedList` - Update a list with raw data.

And, in most frameworks you know when a particular observable is being used, typically
observed, and when it can be discarded.  In those places, you should call:

[can-connect/constructor/store/store.addInstanceReference] — Call when an instance is being used.
[can-connect/constructor/store/store.deleteInstanceReference] — Call when an instance is no longer being used.
[can-connect/constructor/store/store.addListReference] — Call when a list is being used.
[can-connect/constructor/store/store.deleteListReference] — Called when a list is no longer being used.


## Interfaces

The following is a list of the most important interface methods and properties implemented
or consumed by the core behaviors.

### Identifiers

`.id( props | instance ) -> String` - Returns a unique identifier for the instance or raw data.  
`.idProp -> String="id"` - The name of the unique identifier property.  
`.listSet(list) -> set` - Returns the set a list represents.  
`.listSetProp -> String="__listSet"` - The property on a List that contains its set.  

Implemented by [can-connect/base/base].

### Instance Interface

The following methods operate on instances and lists.

#### CRUD methods:

`.getList(set) -> Promise<List>` - retrieve a list of instances.  
`.getList(set) -> Promise<Instance>` - retrieve a single instance.   
`.save(instance) -> Promise<Instance>` - creates or updates an instance.  
`.destroy(instance) -> Promise<Instance>` - destroys an instance.  

Implemented by [can-connect/constructor/constructor]. Overwritten by [can-connect/constructor/store/store].

#### Instance callbacks

`.createdInstance(instance, props)` - An instance is created.  
`.updatedInstance(instance, props)` - An instance is updated.  
`.destroyedInstance(instance, props)` - An instance is destroyed.  
`.updatedList(list, updatedListData, set)` - A list has been updated.  

Implemented by [can-connect/constructor/constructor]. Overwritten by [data-connect/real-time/real-time],
[can-connect/constructor/callbacks-once/callbacks-once].

#### Hydrators and Serializers

`.instance(props) -> Instance` - Creates an instance given raw data.  
`.list({data: Array<Instance>}) -> List` - Creates a list given an array of instances.  
`.hydrateInstance(props) -> Instance` - Provides an instance given raw data.  
`.hydrateList({ListData}, set) -> List` - Provides a list given raw data.  
`.hydratedInstance(instance)` - Called whenever an instance is created in memory.  
`.hydratedList(list, set)` - Called whenever a list is created in memory.  
`.serializeInstance(instance) -> Object` - Returns the serialized form of an instance.  
`.serializeList(list) -> Array<Object>` - Returns the serialized form of a list and its instances.  


Implemented by [can-connect/constructor/constructor]. Overwritten by [can-connect/constructor/store/store],
[can-connect/fall-through-cache/fall-through-cache].

### Data Interface

The raw-data connection methods.  

#### CRUD methods

`.getListData(set) -> Promise<ListData>` - Retrieves list data.  
`.updateListData(listData[, set]) -> Promise<ListData>` - Update a list’s data.
`.getSets() -> Promise<Array<Set>>` - Returns the sets available to the connection.  


`.getData(params) -> Promise<Object>` - Retrieves data for a particular item.  
`.createData(props, cid) -> Promise<props>` - Creates instance data given the serialized form of the data.
  A client ID is passed of the
  instance that is being created.  
`.updateData(props) -> Promise<props>` - Updates instance data given the
  serialized form of the data.  
`.destroyData(props) -> Promise<props>` - Destroys an instance given the seralized
form of the data.  

`.clear() -> Promise` - Clears all data in the connection.

Implemented by [can-connect/data/url/url],
[can-connect/data/localstorage-cache/localstorage-cache], [can-connect/data/memory-cache/memory-cache].
Overwritten by [can-connect/cache-requests/cache-requests], [can-connect/data/combine-requests/combine-requests], [can-connect/fall-through-cache/fall-through-cache].
Consumed by [can-connect/constructor/constructor].  

#### Data Callbacks

`.gotListData(listData, set) -> ListaData` - List data is retrieved.  
`.gotData( props, params) -> props` - Instance data is retreived.  
`.createdData( props, params, cid) -> props` - An instance’s data is created.
`.updatedData( props, params) -> props` - An instance’s data is updated.
`.destroyedData( props, params) -> props` - An instance’s data is destroyed.

Implemented by [can-connect/data/callbacks/callbacks].  Overwritten by [can-connect/data/callbacks-cache/callbacks-cache],
[can-connect/real-time/real-time].

#### Response parsers

`.parseListData(*) -> ListData` - Given the response of getListData, return the right object format.  
`.parseInstanceData(*) -> props` - Given the response of getData, createData, updateData, and destroyData,
return the right object format.

Implemented by [can-connect/data/parse/parse].

#### Store Interface

`.addInstanceReference(instance)` - Signal that memory-unsafe actions can be performed on the instance.  
`.deleteInstanceReference(instance)` - Signal that memory-unsafe actions should be removed.
`.addListReference(list)` - Signal that memory-unsafe actions can be performed on the list.  
`.deleteListReference(list)` - Signal that memory-unsafe actions should be removed.

Implemented by [can-connect/constructor/store/store].

#### Real-time Methods

`createInstance( props ) -> Promise<instance>` - Inform the connection an instance has been created.  
`updateInstance( props ) -> Promise<instance>` - Inform the connection an instance has been updated.  
`destroyInstance( props ) -> Promise<instance>` - Inform the connection an instance has been destroyed.  

Implemented by [can-connect/real-time/real-time].

## Creating Behaviors

To create your own behavior, call `connect.behavior` with the name of your behavior and a function that
returns an object that defines the hooks you want to overwrite or provide:

```js
connect.behavior("my-behavior", function(baseConnection){
  return {
    // Hooks here
  };
})
```

For example, creating a simple localStorage behavior might look like:

```js
connect.behavior("localstorage", function(baseConnection){
  return {
    getData: function(params){
      var id = this.id(params);
      return new Promise(function(resolve){
        var data = localStorage.getItem(baseConnection.name+"/"+id);
        resolve( JSON.parse(data) )
      });
    },
    createData: function(props){
      var id = localStorage.getItem(baseConnection.name+"-ID") || "0";

      var nextId = ++JSON.parse( id );
      localStorage.setItem(baseConnection.name+"-ID", nextId);
      var id = this.idProp;
      return new Promise(function(resolve){
        props[id] = nextId;
        localStorage.setItem(baseConnection.name+"/"+nextId, props);
        resolve( props )
      });
    },
    updateData: function(){ ... },
    destroyData: function(){ ...}
  };
})
```
