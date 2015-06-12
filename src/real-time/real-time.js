var can = require("can/util/util");
var connect = require("../can-connect");
var canSet = require("can-set");

var indexOf = function(connection, props, items){
	var id = connection.id(props);
	for(var i = 0; i < items.length; i++) {
		if( id === connection.id(items[i]) ) {
			return i;
		}
	}
	return -1;
};

var setAdd = function(connection, set, items, item, algebra){
	return items.concat([item]);
};

var create = function(props){
	var self = this;
	// go through each list
	this.listStore.forEach(function(list, id){
		var set = JSON.parse(id);
		// ideally there should be speed up ... but this is fine for now.
		
		
		var index = indexOf(self, props, list);
		
		if(canSet.subset(props, set, self.algebra)) {
			
			// if it's not in the list, update the list with this and the lists data merged
			if(index == -1) {
				// get back the list items
				var items = self.serializeList(list);
				self.updatedList(list,  { data: setAdd(self, set,  items, props, self.algebra) }, set);
			} else {
				// if the index
			}
			
		} 
		
	});
};

var update = function(props) {
	var self = this;
	this.listStore.forEach(function(list, id){
		var set = JSON.parse(id);
		// ideally there should be speed up ... but this is fine for now.
		
		
		var index = indexOf(self, props, list);
		
		if(canSet.subset(props, set, self.algebra)) {
			
			// if it's not in the list, update the list with this and the lists data merged
			// in the future, this should update the position.
			if(index == -1) {
				// get back the list items
				var items = self.serializeList(list);
				self.updatedList(list,  { data: setAdd(self, set,  items, props, self.algebra) }, set);
			} 
			
		}  else if(index != -1){
			// otherwise remove it
			var items = self.serializeList(list);
			items.splice(index,1);
			self.updatedList(list,  { data: items }, set);
		}
		
	});
};


var destroy = function(props) {
	var self = this;
	this.listStore.forEach(function(list, id){
		var set = JSON.parse(id);
		// ideally there should be speed up ... but this is fine for now.
		
		var index = indexOf(self, props, list);
		
		if(index != -1){
			// otherwise remove it
			var items = self.serializeList(list);
			items.splice(index,1);
			self.updatedList(list,  { data: items }, set);
		}
		
	});
};

/**
 * @module can-connect/real-time real-time
 * @parent can-connect.modules
 */
module.exports = connect.behavior("real-time",function(baseConnect){
	return {
		
		createInstance: function(props){
			var id = this.id(props);
			var instance = this.instanceStore.get(id);
			var promise;
			var serialized;
			
			if( instance ) {
				// already created
				this.updatedInstance(instance, props);
				promise = new can.Deferred().resolve(instance);
				serialized = this.serializeInstance(instance);
			} else {
				instance = this.hydrateInstance(props);
				this.createdInstance(instance, {});
				serialized = this.serializeInstance(instance);
				if(this.cacheConnection) {
					promise = this.cacheConnection.createData(serialized).then(function(){
						return instance;
					});
				} else {
					promise = new can.Deferred().resolve(instance);
				}
				
				
			}
			this.addInstanceReference(instance);
			
			create.call(this, serialized);
			this.addInstanceReference(instance);
			
			// TODO: ideally this could hook into the same callback mechanism as `createdData`.
			return promise;
		},
		createdData: function(props, params, cid){
			var instance = this.cidStore.get(cid);
			this.createdInstance(instance, props);
			// we can pre-register it so everything else finds it
			this.addInstanceReference(instance);
			
			create.call(this, this.serializeInstance(instance));
			this.deleteInstanceReference(instance);
			return undefined;
		},
		updatedData: function(props, params){
			// Go through each list in the listStore and see if there are lists that should have this,
			// or a list that shouldn't.
			var instance = this.instanceStore.get( this.id(params) );
			this.updatedInstance(instance, props);
			update.call(this, this.serializeInstance(instance));
			return undefined;
		},
		updateInstance: function(props){
			var id = this.id(props);
			var instance = this.instanceStore.get(id);
			if( !instance ) {
				instance = this.hydrateInstance(props);
			} else {
				this.updatedInstance(instance, props);
			}
			var serialized = this.serializeInstance(instance);
			// we can pre-register it so everything else finds it
			this.addInstanceReference(instance);
			update.call(this, serialized);
			this.deleteInstanceReference(instance);
			
			
			if(this.cacheConnection) {
				return this.cacheConnection.updateData(serialized).then(function(){
					return instance;
				});
			} else {
				return  new can.Deferred().resolve(instance);
			}
		},
		destroyedData: function(props, params){
			// Go through each list in the listStore and see if there are lists that should have this,
			// or a list that shouldn't.
			var id = this.id(params);
			var instance = this.instanceStore.get(id);
			if( !instance ) {
				instance = this.hydrateInstance(props);
			} else {
				this.destroyedInstance(instance, props);
			}
			// we can pre-register it so everything else finds it
			this.addInstanceReference(instance);
			destroy.call(this, this.serializeInstance(instance));
			this.deleteInstanceReference(instance);
			return undefined;
		},
		destroyInstance: function(props){
			var id = this.id(props);
			var instance = this.instanceStore.get(id);
			
			if( !instance ) {
				instance = this.hydrateInstance(props);
			} else {
				this.destroyedInstance(instance, props);
			}
			// we can pre-register it so everything else finds it
			this.addInstanceReference(instance);
			var serialized = this.serializeInstance(instance);
			destroy.call(this, serialized);
			this.deleteInstanceReference(instance);
			if(this.cacheConnection) {
				return this.cacheConnection.destroyData(serialized).then(function(){
					return instance;
				});
			} else {
				return  new can.Deferred().resolve(instance);
			}
		}
	};
});