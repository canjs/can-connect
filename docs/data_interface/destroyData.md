@typedef {function} connection.destroyData destroyData
@parent can-connect.data_interface

@description Destroys an instance given the serialized form of the instance.

@option {function}

Destroys an instance given the seralized form of the data.  Returns any additional properties that should be added to the instance.

  @param {Object} instanceData The serialized data of the instance.

  @return {Promise<Object>} A promise that resolves with any properties that should be added to the instance.
