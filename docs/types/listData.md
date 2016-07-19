@typedef {{data:Array<Object>}} can-connect.listData ListData
@parent can-connect.types

The data resolved by [can-connect/connection.getListData].

@option {Array<Object>} data Foo

@body

## Use

[can-connect/connection.getListData] should return a promise that resolves
an object that looks like:

```
{
  data: [
    {id: 1, name: "take out the trash"},
    {id: 1, name: "do the dishes"}
  ]
}
```

The object must have a `data` property that is an Array of 
instanceData.

The object can have other meta information related to the data
that has been loaded.  For example, `count` might be the total
number of items the server has:

```
{
  data: [
    {id: 1, name: "take out the trash"},
    {id: 1, name: "do the dishes"}
  ],
  count: 1000
}
```