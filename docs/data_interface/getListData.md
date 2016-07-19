@typedef {function} can-connect/connection.getListData getListData
@parent can-connect/DataInterface

@description Retrieves list data for a particular set.

@option {function}

  Returns a promise that resolves to the list data for a particular set.

  @param {can-set/Set} set A object that represents the set of data needed to be loaded.

  @return {Promise<can-connect.listData>} A promise that resolves to the [can-connect.listData] format.

@body

## Use

Extensions like [can-connect/data/url/url] make it easy to implement `getListData`, but it can be as simple as:

```
var connection = connect([],{
  getListData: function(set){
    return new Promise(function(resolve, reject){
		$.get("/api/todos",set).then(resolve, reject)
	});
  }
})
```
