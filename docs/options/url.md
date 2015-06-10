@property {String|Object} connection.url url
@parent can-connect.options

@description Configure ajax urls for CRUD data methods.

@option {String}

  If `url` is a string, it's assumed to be a restful resource url. [connection.getListData], 
  [connection.getData],
  [connection.createData],
  [connection.updateData], and 
  [connection.destroyData] will make ajax requests to the resource url and add
  the [connection.idProp] where appropriate.

@option {{}}

@body 
  
## Use