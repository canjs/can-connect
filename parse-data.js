
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
		// The ONLY job of this is to get this into the {data: items} format
		parseListData: function( items, xhr, headers ) {
			var result;
			if( can.isArray(items) ) {
				result = {data: items};
			} else {
				var prop = options.parseListProp || 'data';

				items.data = can.getObject(prop, items);
				result = items;
				if(prop !== "data") {
					delete items[prop];
				}
				if(!can.isArray(result.data)) {
					throw new Error('Could not get any raw data while converting using .models');
				}
				
			}
			var arr = [];
			for(var i =0 ; i < result.data.length; i++) {
				arr.push( this.parseInstanceData(result.data[i], xhr, headers) );
			}
			result.data = arr;
			return result;
		},
		parseInstanceData: function( props ) {
			return options.parseInstanceProp ? can.getObject(options.parseInstanceProp, props) || props : props;
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
