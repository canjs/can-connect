
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
			return pipe(baseConnect.getListData(params), this, function(data){
				return this.makeInstances(data);
			});
		},
		findOne: function(params) {
			return pipe(baseConnect.getInstanceData(params), this, function(data){
				return this.makeInstance(data, options);
			});
		},
		makeInstances: function(items){
			var arr = [];
			for(var i = 0; i < items.length; i++) {
				arr.push( this.makeInstance(items[i]) );
			}
			return options.list(arr);
		},
		makeInstance: function(props){
			return options.instance(props);
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
