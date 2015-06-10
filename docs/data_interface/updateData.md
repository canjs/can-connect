@typedef {function} connection.updateData updateData
@parent can-connect.data_interface

@description Updates an instance's data.

@option {function}

  Updates instance data given the serialized form of the data. Returns any 
  additional properties that should be added to the instance.

  @param {Object} props The serialized instance data.
  
  @return {Promise<props>} A promise that resolves with any properties that should be added to the instance.
  This should include the [connection.idProp] of the instance.
