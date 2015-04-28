# can-connect

`can-connect` provides persisted data middleware.  It's designed to be useful to any JavaScript framework, not just CanJS. Use it to assemble powerful model layers. It currently can:

 - Save response data and using it for future requests - [cache-requests](#cache-requests)
 - Combine overlapping or reduntant requests - [combine-requests](#combine-requests)
 - Create instances of a constructor function or a special list type - [constructor](#constructor)
 - Create only a single instance for a given id - [instance-store](#instance-store)
 - Persist data to restful or other types of services - [persist](#persist)
 - Extract response data into a format needed for other plugins - [parse-data](#parse-data)
 - Inherit from a highly compatable [can.Model] implementation - [model](#model)
 
The following features are also planned

 - List store with automatic item removal and insertion.
 - Backup
 - Fall-through cache
 - Real-time update

## Use

Use `can.connect` to create a `connection` object by passing it behavior names and options:

```js
var todoConnection = can.connect(
  ["cache-requests","constructor","instance-store","comibine-requests"],
  {
    instance: function(data){ new Todo(data) },
    resource: "/services/todos"
  })
```

Then, use that `todoConnection` to load data:

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

## API

The API is broken up into:

- The different behaviors, like perist, instance-store, etc
- A full list of options that behaviors consume.
- [The core list of hooks that behaviors can call or implement](#core-hooks)
- How to create a behavior.


## persist

Supplies a `getListData` object that makes ajax requests.  Eventually, 
it will supply other crud methods similar to can.Model.

```js
var persistBehavior = persist({
  findAll: "GET /todos"
});

persistBehavior.getListData({}) //-> promise(Array<items>)
```

## combine-requests

Combines requests made within a certain time if the
sets of data they load overlap.

```js
combineBehavior = combineRequests( persistBehavior, {time: 100} );

// the following makes a single request
combineBehavior.getListData({}) //-> promise(Array<items>)
combineBehavior.getListData({type: "critical"}) //-> promise(Array<items>)
combineBehavior.getListData({due: "today"}) //-> promise(Array<items>)
```


## cache-requests

Supports caching data for requests that are made for sets of data that
overlap.  By default caching is done in-memory only.


```js
combineBehavior = cacheRequests( persistBehavior );

combineBehavior.getListData({}) //-> promise(Array<items>)

// this will use the previous data if done later
combineBehavior.getListData({type: "critical"}) //-> promise(Array<items>)

// this will use the previous loaded data if done later
combineBehavior.getListData({due: "today"}) //-> promise(Array<items>)
```

 - `getAvailableSets()` -> `promise(Array<sets>)` - Gets a list of the sets that have been stored.
 - `addAvailableSet(set)` -> `promise()` - Adds a set that should be stored.
 - `getListCachedData(set)` -> `promise(Array<data>)` - Gets data for a given set from the local storage.
 - `addListCachedData(set)` -> `promise()` - Adds data to the cache.
 - `diffSet(set, sets)` -> `promise(Diff<{needs: set, cached: set}>)` - Given the set that needs to be loaded and the 
   sets that have been loaded, return an object that:
    - specifies the set that __needs__ to be loaded by base `getListData`
    - specifies the set that should be loaded from `getListCachedData`
 - `mergeData(params, diff, requestedData, cachedData)` -> `Array<items>` return merged cached and requested data.


## Core Hooks

These are hooks that most plugins will use in some way.

### External Persisted CRUD methods

The methods that people using an implemented connection should use.

- `findAll(set) -> Promise<INSTANCES<INSTANCE>>` - load instances
- `findOne(set) -> Promise<INSTANCE>` - load a single instance
- `save(instance) -> Promise<INSTANCE>` - creates or updates an instance
- `destroy(instance)` -> Promise<INSTANCE>` - destroys an instance

### Internal Persisted CRUD methods

The raw-data connection methods.  These are used internally by the "External Persisted CRUD methods".

-  `getListData(set) -> Promise<{data:Array<Object>}>` - Retrieves list data for a particular set.
-  `getInstanceData(set) -> Promise<Object>` - Retrieves data for a particular item.
-  `createInstanceData( props ) -> Promise<Object>` - Creates instance data given the serialized form of the data.  Returns any additional properties that should be added to the instance.
-  `updateInstanceData( props ) -> Promise<Object>` - Updates instance data given the serialized form of the data.  Returns any additional properties that should be added to the instance.
-  `destroyInstanceData( props ) -> Promise<Object>` - Destroys an instance given the seralized form of the data.  Returns any additional properties that should be added to the instance.
- `parseListData(*) -> {data:Array<Object>}` - Given the response of getListData, return the right object format.
- `parseInstanceData(*) -> Object` - Given a single items response data, return the right object format.  This is called by parseListData as well as all other internal CRUD methods.

### Instance and Instances

- `makeInstance( props )` - Creates an instance in memory given data for that instance.
- `makeInstances({data: Array<Object})` - Creates a container for instances and all the instances within that container.
- `createdInstance(instance, props)` - Called whenever an instance is created in the persisted state.
- `updatedInstance(instance, props)` - Called whenever an instance is updated in the persisted state.
- `destroyedInstance(instance, props)` - Called whenever an instance is destroyed in the persisted state.


### Identifiers

- `id( props | instance )` - Given the raw data for an instance, or the instance, returns a unique identifier for the instance.
- `idProp {String="id"}` - The name of the unique identifier property.

## External Hooks

Hooks that your library and code should be calling.

- `madeInstance(instance)` - Called whenever an isntance is created in memory.
- `observeInstance(instance)` - Called whenver an instance is observed. This serves as a signal that memory-unsafe actions can be performed.
- `unobserveInstance(instance)` - Called whenever an instance is no longer observed. This serves as a signal that memory-unsafe should be removed.
- `observedList(list)` - Called whenever a a list is observed.
- `unobservedList(list)` - Called whenever a a list is unobserved.


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
    getInstanceData: function(params){
      var id = this.idProp;
      return new Promise(function(resolve){
        var data = localStorage.getItem(options.name+"/"+params[id]);
        resolve( JSON.parse(data) )
      });
    },
    createInstanceData: function(props){
      var nextId = ++JSON.parse( localStorage.getItem(options.name+"-ID") || "0");
      localStorage.setItem(options.name+"-ID"), nextId);
      var id = this.idProp;
      return new Promise(function(resolve){
        props[id] = nextId;
        localStorage.setItem(options.name+"/"+nextId, props);
        resolve( props )
      });
    },
    updateInstanceData: function(){ ... },
    destroyInstanceData: function(){ ...}
  };
})
```

