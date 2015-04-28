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
- A list of hooks that behaviors can call or implement.
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

### `getListData(set) -> Promise<{data:Array<Object>}>` - Retrieves list data for a particular set.

