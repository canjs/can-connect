@typedef {function} can-connect/connection.createData createData
@parent can-connect/DataInterface

@description Creates instance data given the serialized form of the instance.

@option {function}

Creates instance data given the serialized form of the data. Returns any additional properties that should be added to the
instance. A client ID is passed of the instance that is being created.

  @param {Object} instanceData The serialized data of the instance.

  @param {Number} [cid] A unique id that represents the instance that is being created.

  @return {Promise<Object>} A promise with the data that will be passed to [connection.createdData].
