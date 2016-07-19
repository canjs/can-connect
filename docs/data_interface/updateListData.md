@typedef {function} can-connect/connection.updateListData updateListData
@parent can-connect/DataInterface

@description Updates list data for a particular set.

@option {function}

  Returns a promise that resolves to the list data for a particular set.

  @param {can-connect.listData} listData A object that represents the set of data needed to be loaded.

  @param {Object} [set] The set of data that is updating.

  @return {Promise<can-connect.listData>} A promise that resolves to the updated [can-connect.listData].

@body
