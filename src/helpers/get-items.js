var can = require("can/util/util");

module.exports = function(data){
	if(can.isArray(data)) {
		return data;
	} else {
		return data.data;
	}
};
