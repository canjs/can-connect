
var can = require("can/util/util");
var connect = require("can-connect");
var pipe = require("./helpers/pipe");


var pairs = {
	getListData: "parseListData",
	getInstanceData: "parseInstanceData",
	createInstanceData: "parseInstanceData",
	updateInstanceData: "parseInstanceData",
	destroyInstanceData: "parseInstanceData"
};

/**
 * @module can-connect/parse-data
 * 
 * hooks getListData, getInstanceData, etc, to parse functions. Should be called 
 * after those core things are all decided.
 * 
 * ## Adds
 * 
 * parseListData, parseInstanceData
 * 
 * @param {{}} options
 *   @option {String} parseListProp
 *   @option {String} parseInstanceData
 */
module.exports = connect.behavior("parse-data",function(baseConnect, options){
	
	var behavior = {
		parseListData: function( items ) {
			if( can.isArray(items) ) {
				return items;
			}

			prop = options.parseListProp || 'data';

			var result = can.getObject(prop, items);
			
			if(!can.isArray(result)) {
				throw new Error('Could not get any raw data while converting using .models');
			}
			return result;
		},
		parseInstanceData: function( props ) {
			return options.parseInstanceProp ? can.getObject(options.parseInstanceProp, props) : props;
		}
	};
	
	can.each(pairs, function(parseFunction, name){
		behavior[name] = function(params){
			return pipe(baseConnect[name].call(this, params), this, function(){
				return this[parseFunction].apply(this, arguments);
			});
		};
	});
	
	return behavior;
	
});
