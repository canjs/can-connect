@typedef {function} can-connect/connection.updateData updateData
@parent can-connect/DataInterface

@description Updates an instance's data.

@option {function}

  Updates instance data given the serialized form of the data. Returns any
  additional properties that should be added to the instance.

  @param {Object} props The serialized instance data.

  @return {Promise<props>} A promise that resolves with any properties that should be added to the instance.
  This should include the [can-connect/base/base.idProp] of the instance.
