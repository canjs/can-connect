@typedef {function} can-connect/connection.getData getData
@parent can-connect/DataInterface
@description Retrieves instance data for particular parameters.

@option {function}

  Returns a promise that resolves to the instance data for particular parameters.

  @param {Object} set A object that represents the set of data needed to be loaded.

  @return {Promise<can-connect.listData>} A promise that resolves to the [can-connect.listData] format.

@body

## Use

Extensions like [can-connect/data/url/url] make it easy to implement `getData`, but it can be as simple as:

```
var connection = connect([],{
  getData: function(params){
    return new Promise(function(resolve, reject){
		$.get("/api/todo",params).then(resolve, reject)
	});
  }
})
```
