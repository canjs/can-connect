
var can = require("can/util/util");
var connect = require("can-connect");
var pipe = require("./helpers/pipe");


/**
 * @module can-connect/constructor
 * 
 * Connect CRUD methods to a constructor function.
 * 
 * Consumes:
 * 
 * - getListData, getInstanceData, createInstanceData, updateInstanceData, destroyInstanceData
 * 
 * Produces:
 * 
 * - findAll, findOne, save, destroy, id, createdInstance, updatedInstance
 * 
 * @param {{}} options
 * 
 *   @option {function} instance
 *   @option {function} list
 *   @option {String} id
 */
module.exports = connect.behavior("constructor",function(baseConnect, options){
	
	var behavior = {
		findAll: function(params) {
			return pipe(this.getListData( params ), this, function(data){
				return this.makeList(data, params);
			});
		},
		findOne: function(params) {
			return pipe(this.getInstanceData(params), this, function(data){
				return this.makeInstance(data, options);
			});
		},
		
		// given raw data, makes the instances
		makeList: function(instanceData, params){
			if(can.isArray(instanceData)) {
				instanceData = {data: instanceData};
			}
			
			var arr = [];
			for(var i = 0; i < instanceData.data.length; i++) {
				arr.push( this.makeInstance(instanceData.data[i]) );
			}
			instanceData.data = arr;
			if(options.list) {
				return options.list(instanceData, params);
			} else {
				var list = instanceData.data.slice(0);
				list.__set = params;
				return list;
			}
			
		},
		makeInstance: function(props){
			if(options.instance) {
				return options.instance(props);
			} else {
				return can.simpleExtend({}, props);
			}
		},
		save: function(instance){
			var serialized = this.serializeInstance(instance);
			var id = this.id(instance);
			
			if(id === undefined) {
				return pipe(this.createInstanceData(serialized), this, function(data){
					this.createdInstance(instance, data);
					return instance;
				});
			} else {
				return pipe(this.updateInstanceData(serialized), this, function(data){
					this.updatedInstance(instance, data);
					return instance;
				});
			}
		},
		destroy: function(instance){
			var serialized = this.serializeInstance(instance);
			
			return pipe( this.destroyInstanceData(serialized), this, function(data){
				this.destroyedInstance(instance, data);
				return instance;
			});
		},
		id: function(instance){
			return instance[options.id || "id"];
		},
		createdInstance: function(instance, data){
			can.simpleExtend(instance, data);
		},
		updatedInstance: function(instance, data){
			can.simpleExtend(instance, data);
		},
		destroyedInstance: function(instance, data){
			can.simpleExtend(instance, data);
		},
		serializeInstance: function(instance){
			return can.simpleExtend({}, instance);
		}
	};
	
	return behavior;
	
});


var pairs = {
	findAll: "getListData",
	findOne: "getInstanceData",
	
	getListData: {prop: "findAll", type: "GET"},
	getInstanceData: {prop: "findOne", type: "GET"},
	createInstanceData: {prop: "create", type: "POST"},
	updateInstanceData: {prop: "update", type: "PUT"},
	destroyInstanceData: {prop: "destroy", type: "DELETE"}
};
