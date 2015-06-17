@page can-connect
@group can-connect.behaviors 1 Behaviors
@group can-connect.options 2 Options
@group can-connect.externalCRUD 3 Instance Interface
@group can-connect.data_interface 4 Data Interface
@group can-connect.types 5 Data Types
@group can-connect.modules 6 Modules

# can-connect

[![Build Status](https://travis-ci.org/canjs/can-connect.png?branch=master)](https://travis-ci.org/canjs/can-connect)

`can-connect` provides persisted data middleware. Use it to assemble powerful model layers for 
any JavaScript framework, not just CanJS.  It currently can:

Load data:

 - [can-connect/data-url] - Persist data to restful or other types of services.
 - [can-connect/data-parse] - Extract response data into a format needed for other extensions.

Convert data into special types:

 - [can-connect/constructor] - Create instances of a constructor function or list type.
 - [can-connect/constructor/store] - Create only a single instance for a given id or a single list for a set.

Real time:

 - [can-connect/real-time] - Update lists and instances with server side events.
 
Caching strategies:

 - [can-connect/fall-through-cache] - Respond with data from the [connection.cacheConnection] and 
   then update the response with data from the `raw CRUD Methods`.
 - [can-connect/data/inline-cache] - Use an inline cache for initial ajax requests.
 - [can-connect/cache-requests] - Save response data and use it for future requests.
 - [can-connect/data/combine-requests] - Combine overlapping or reduntant requests.

Caching layers:

 - [can-connect/data/localstorage-cache] - LocalStorage caching connection.
 - [can-connect/data/memory-cache] - LocalStorage caching connection.

The following modules glue certain methods together:

 - [can-connect/data/callbacks] - Glues the result of the `raw CRUD Methods` to callbacks.
 - [can-connect/data/callbacks-cache] - Calls [connection.cacheConnection] methods whenever `raw CRUD methods` are called. 


The following modules are useful to CanJS specifically:

 - [can-connect/can/map] - Create instances of a special can.Map or can.List type. 
 - [can-connect/can/super-map] - Create a connection for a can.Map or can.List that uses almost all the plugins.
 - [can-connect/can/model] - Inherit from a highly compatable [can.Model](http://canjs.com/docs/can.Model.html) implementation.
 - [can-connect/can/tag] - Create a custom element that can load data into a template.

## Overview

The "can-connect" module exports a `connect` function that is used to assemble different 
behaviors and some options into a `connection`.  For example, the following uses `connect` and
the [can-connect/constructor] and [can-connect/data-url] behaviors to create a `todoConnection`
connection:

```js
import connect from "can-connect";
import "can-connect/constructor/";
import "can-connect/data/url/";

var todoConnection = connect(
  ["constructor","data-url"],
  {
    url: "/services/todos"
  });
```

A connection typically provides the ability to 
create, read, update, or delete (CRUD) some data source. That data source is 
usually accessed through the "Instance Interface" methods:

 - [connection.get]
 - [connection.getList]
 - [connection.save]
 - [connection.destroy]

For example, to get all todos from "GET /services/todos", we could write the following:

```
todoConnection.getList({}).then(function(todos){ ... });
```

__Behaviors__, like [can-connect/constructor] and [can-connect/data-url] implement,
extend, or require some set of [interfaces](#section_Interfaces).  For example, data-url implements
the "Data Interface" methods, and [can-connect/constructor] implements the 
"Instance Interface" methods.

The `connect` method calls these behaviors in the right order to create a connection. For instance,
the [can-connect/cache-requests] behavior must be applied after the [can-connect/data-url]
connection.  This is because [can-connect/cache-requests], overwrites [can-connect/data-url]'s 
[connection.getListData] first check a cache for the data.  Only if the data is not present, 
does it call [can-connect/data-url]'s [connection.getListData]. So even if we write:

```
connect(['cache-requests','data-url'])
```

or

```
connect(['data-url','cache-requests'])
```
 
... our connection will be built in the right order!

A __connection__ is just an object with each behavior object on its prototype chain and
its options object at the end of the prototype chain.


## Use

To use `can-connect`, it's typically best to start out with the most basic
behaviors: [can-connect/data-url] and [can-connect/constructor]. [can-connect/data-url]
connects the "Data Interface" to a restful service. [can-connect/constructor] adds
an "Instance Interface" that can create, read, update and delete (CRUD) typed data
using the lower-level "Data Interface".





[can-connect/constructor] 



```js
import connect from "can-connect";
import "can-connect/constructor/";
import "can-connect/data/url/";

var todoConnection = connect(
  ["constructor","data-url"],
  {
    instance: function(data){ new Todo(data) },
    resource: "/services/todos"
  });
```

Next, use the `INSTANCE INTERFACE` methods to create, read, update, and destroy `Todo` instances.
The following gets all todos from the server by making an ajax request to "/services/todos":

```
todoConnection.findAll({}).then(function(todos){});
```

`todos` is an array of `Todo` instances.




Then, use that `todoConnection`'s `External CRUD Methods` to load data:

```js
todoConnection.findAll({completed: true}).then(function(todos){

});
```

To work well with `can-connect` your code might need to call some of its hooks:

```js
Todo.prototype.bind = function(){
  // tells this todo to be saved in the store so no other 
  // instances that have its ID will be created
  todoConnection.observedInstance(this);
}
```

## Interfaces

The API is broken up into:

- The different behaviors, like perist, instance-store, etc
- A full list of options that behaviors consume.
- [The core list of hooks that behaviors can call or implement](#core-hooks)
- How to create a behavior.


## Core Hooks

These are hooks that most plugins will use in some way.

### External Persisted CRUD methods

The methods that people using an implemented connection should use.

- [connection.getList] - load instances
- [connection.get] - load a single instance
- [connection.save] - creates or updates an instance
- [connection.destroy] - destroys an instance

### Data Interface 

The raw-data connection methods.  These are used by "Instance Interface".  These should
be implemented by behaviors. 

- [connection.getListData] - Retrieves list data for a particular set.
- [connection.updateListData] - Called when a set of data is updated with the raw data to be 
  saved. This is normally used for caching connection layers.
- [connection.createData] - Creates instance data given the serialized form of the data. 
  Returns any additional properties that should be added to the instance. A client ID is passed of the instance that is being created.
- [connection.updateData] - Updates instance data given the serialized form of the data.  Returns any additional properties that should be added to the instance.
- [connection.destroyData] - Destroys an instance given the seralized form of the data.  Returns any additional properties that should be added to the instance.
- `parseListData(*) -> {data:Array<Object>}` - Given the response of getListData, return the right object format.
- `getData(set) -> Promise<Object>` - Retrieves data for a particular item.
- `parseInstanceData(*) -> Object` - Given a single items response data, return the right object format.  This is called by parseListData as well as all other internal CRUD methods.

## Hooks to update raw data

These methods are used to update data from the outside, usually by a real time connection.

- `createInstance( props ) -> instance`
- `updateInstance( props ) -> instance` 
- `destroyInstance( props ) -> instance` 

### Instance and Instances

- `hydrateInstance( props )` - Creates an instance in memory given data for that instance.
- `hydrateList({data: Array<Object>}, set)` - Creates a container for instances and all the instances within that container.
- `createdInstance(instance, props)` - Called whenever an instance is created in the persisted state.
- `updatedInstance(instance, props)` - Called whenever an instance is updated in the persisted state.
- `destroyedInstance(instance, props)` - Called whenever an instance is destroyed in the persisted state.
- `updatedList(list, updatedListData, set)` - Called whenever a list has been updated. `updatedList` should be merged into `list`.
- `serializeInstance`
- `serializeList`

### Identifiers

- `id( props | instance ) -> STRING` - Given the raw data for an instance, or the instance, returns a unique identifier for the instance.
- `idProp {String="id"}` - The name of the unique identifier property.
- `listSet(list) -> set` - Returns the set this set represents.
- `listSetProp {String="__set"}` - The property on a List that contains its set.

## External Hooks

Hooks that your library and code should be calling.

- `hydratedInstance(instance)` - Called whenever an isntance is created in memory.
- `hydratedInstance(list, set)` - Called whenever a list is created in memory.

- `addInstanceReference(instance)` - Called whenver an instance is observed. This serves as a signal that memory-unsafe actions can be performed.
- `deleteInstanceReference(instance)` - Called whenever an instance is no longer observed. This serves as a signal that memory-unsafe should be removed.
- `addListReference(list)` - Called whenever a a list is observed.
- `deleteListReference(list)` - Called whenever a a list is unobserved.


## Creating Behaviors

To create your own behavior, call `connect.behavior` with the name of your behavior and a function that
returns an object that defines the hooks you want to overwrite or provide:

```js
connect.behavior("my-behavior", function(baseBehavior, options){
  return {
    // Hooks here
  };
})
```

For example, localStorage might looks like:

```js
connect.behavior("localstorage", function(baseBehavior, options){
  return {
    getData: function(params){
      var id = this.idProp;
      return new Promise(function(resolve){
        var data = localStorage.getItem(options.name+"/"+params[id]);
        resolve( JSON.parse(data) )
      });
    },
    createData: function(props){
      var nextId = ++JSON.parse( localStorage.getItem(options.name+"-ID") || "0");
      localStorage.setItem(options.name+"-ID"), nextId);
      var id = this.idProp;
      return new Promise(function(resolve){
        props[id] = nextId;
        localStorage.setItem(options.name+"/"+nextId, props);
        resolve( props )
      });
    },
    updateData: function(){ ... },
    destroyData: function(){ ...}
  };
})
```

