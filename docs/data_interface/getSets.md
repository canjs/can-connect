@typedef {function} can-connect/connection.getSets getSets
@parent can-connect/DataInterface

@description Gets the sets that are available in the connection.

@option {function}

  Returns a promise that resolves to a list of [can-set/Set] objects contained in the connection.

  @return {Promise<Array<can-set/Set>>} A promise that resolves to an an array of sets.

@body

## Use

Extensions like [can-connect/data/localstorage-cache/localstorage-cache] implement
`.getSets` to provide the sets they contain.
