@typedef {function} connection.getListData getListData
@parent can-connect.data_interface

@description Retrieves list data for a particular set.

@option {function}

  Returns a promise that resolves to the list data for a particular set.

  @param {Object} set A object that represents the set of data needed to be loaded.

  @return {Promise<can-connect.listData>} A promise that resolves to the [can-connect.listData] format.

@body

## Use

Extensions like [can-connect/data-url] make it easy to implement `getListData`, but it can be as simple as:

```
var connection = connect([],{
  getListData: function(set){
    return $.get(set)
  }
})
```
