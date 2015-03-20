# can-connect

`can-connect` provides persisted data middleware.  Use it to 
speed up application load times by:

 - creating a CRUD connection - [persist]
 - combining overlapping or reduntant requests - [combine-requests](#combine-requests)
 - saving response data and using it for future requests - [params-cache]
 
Planned:

Model
 - Instance store
 - List store
 - Backup
 - Fall-through cache
 - Real-time update

Model.List
 - automatic removal
 - automatic addition


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

This suppors the following hooks:

 - `getAvailableSets()` -> `promise(Array<sets>)` - Gets a list of the sets that have been stored.
 - `addAvailableSet(set)` -> `promise()` - Adds a set that should be stored.
 - `getListCachedData(set)` -> `promise(Array<data>)` - Gets data for a given set from the local storage.
 - `addListCachedData(set)` -> `promise()` - Adds data to the cache.
 - `diffSet(set, sets)` -> `promise(Diff<{needs: set, cached: set}>)` - Given the set that needs to be loaded and the 
   sets that have been loaded, return an object that:
    - specifies the set that __needs__ to be loaded by base `getListData`
    - specifies the set that should be loaded from `getListCachedData`
 - `mergeData(params, diff, requestedData, cachedData)` -> `Array<items>` return merged cached and requested data.

## Potential hooks

Some other hooks that might need to exist.

```
hooks = {
	getListData: function(){
		// parseListData?
	},
	getInstances: function(){
		
	},
	makeInstances: function(){
		
	},
	id: function(){},
	// a hook to know when an instance is doing something
	observeInstance: function(){ },
	unobserveInstance: function(){ },
	observeList: function(){ },
	unobserveList: function(){ },
	
	// a hook to know whenever an instance is created .. this is so other hooks can be setup
	createdInstance: function(){},
	createdList: function(){},
	
	// persiste this instance
	postInstance: function(){
		
	},
	putInstance: function(){
		
	},
	deleteInstance: function(){
		
	}
};
```
