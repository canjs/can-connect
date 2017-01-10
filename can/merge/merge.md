@module {connect.Behavior} can-connect/can/merge/merge
@group can-connect/can/merge/merge.instance-callbacks 5 instance callbacks
@parent can-connect.behaviors

Update nested data structures correctly with the response from the server.

@signature `canMergeBehavior( baseConnection )`

Overwrites [can-connect/can/map/map]'s instance callbacks
so they use [can-connect/helpers/map-deep-merge].  [can-connect/helpers/map-deep-merge]
is able to make minimal changes to instances and lists given raw data.  Use this behavior
after the [can-connect/can/map/map] behavior:

```js
var canMergeBehavior = require("can-connect/can/merge/merge");
var canMapBehavior = require("can-connect/can/map/map");

connect([..., canMapBehavior, canMergeBehavior, ...],{
	...
});
```

The connection's [can-connect/can/map/map._Map], [can-connect/can/map/map._List]
and any other types that they reference must be property configured.  That configuration
is discussed in the `Use` section below.

@body

## Use

To use `can-connect/can/merge/merge`, you have to:

1. Add the behavior after [can-connect/can/map/map], and
2. Make sure all types, especially `List` types are properly configured.  

Adding the `can-connect/can/merge/merge` behavior after [can-connect/can/map/map]
is pretty straightforward.  When you create a custom connection, create it as follows:

```js
var canMergeBehavior = require("can-connect/can/merge/merge");
var canMapBehavior = require("can-connect/can/map/map");

var ClassRoom = DefineMap.extend({
	...
});

ClassRoom.List = DefineList.extend({
	"#": ClassRoom
});

ClassRoom.algebra = new set.Algebra({...})

ClassRoom.connection = connect([..., canMapBehavior, canMergeBehavior, ...],{
	Map: ClassRoom,
	List: ClassRoom.List
});
```

For [can-connect/helpers/map-deep-merge] to
merge correctly, it needs to know how to uniquely identify an instance and
be able to convert raw data to instances and lists. `map-deep-merge` looks for
this configuration on the `.algebra` and `.connection` properties of the
[can-define.types.TypeConstructor] setting on [can-define] types.

This is more easily understood if the `ClassRoom` has a `students` property that
is a list of `Student` instances like:

```js
var ClassRoom = DefineMap.extend({
	students: Student.List
});
```

To be able to uniquely identify `Student` instances, make sure `Student`
has an `algebra` property that is configured with the unique identifier property:

```js
Student = DefineMap.extend({ ... });

Student.algebra = new set.Algebra(set.props.id("_id"))
```

Also, make sure that `Student.List` points its [can-define/list/list.prototype.wildcardItems]
definition to `Student` like the following:

```js
Student.List = DefineList.extend({
    "#": Student
});
```

Finally, the default method used to create a `Student` will be `new Student(props)`.  However,
if `Student`'s have a `.connection`, the `.connection.hydrateInstance(props)` will be
used.  This is useful if `Student`s should be looked up in their [can-connect/constructor/store/store.instanceStore].

For example, `Student` might have a connection like:

```js
Student.connection = baseMap({
	Map: Student,
	List: Student.List,
	url: "/services/students",
	name: "students"
});
```
