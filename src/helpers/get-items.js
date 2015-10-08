var isArray = require("can-connect/helpers/").isArray;

module.exports = function(data){
	if(isArray(data)) {
		return data;
	} else {
		return data.data;
	}
};
