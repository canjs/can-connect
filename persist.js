

var connect = require("can-connect");

/**
 * @module can-connect/persist
 * 
 * Easily fill out the raw data connection layers.
 */
module.exports = connect.behavior(function(baseConnect, options){
	
	return {
		getListData: function(params){
			if(options.findAll === "string") {
				return $.get(options.findAll, params);
			} else if(typeof options.findAll === "function"){
				return options.findAll(params);
			} else {
				return baseConnect.getAllRawData(params);
			}
		}
	};
	
});
