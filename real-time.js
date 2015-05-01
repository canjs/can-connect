
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

var setAdd = function(connection, set, items, item, compare){
	return items.concat([item]);
};

var create = function(props, options){
	var self = this;
	// go through each list
	this.listStore.forEach(function(list, id){
		var set = JSON.parse(id);
		// ideally there should be speed up ... but this is fine for now.
		
		
		var index = indexOf(self, props, list);
		
		if(canSet.subset(props, set, options.compare)) {
			
			// if it's not in the list, update the list with this and the lists data merged
			if(index == -1) {
				// get back the list items
				var items = self.serializeList(list);
				self.updatedList(list,  { data: setAdd(self, set,  items, props, options.compare) }, set);
			} else {
				// if the index
			}
			
		} 
		
	});
};

var update = function(props, options) {
	var self = this;
	this.listStore.forEach(function(list, id){
		var set = JSON.parse(id);
		// ideally there should be speed up ... but this is fine for now.
		
		
		var index = indexOf(self, props, list);
		
		if(canSet.subset(props, set, options.compare)) {
			
			// if it's not in the list, update the list with this and the lists data merged
			// in the future, this should update the position.
			if(index == -1) {
				// get back the list items
				var items = self.serializeList(list);
				self.updatedList(list,  { data: setAdd(self, set,  items, props, options.compare) }, set);
			} 
			
		}  else if(index != -1){
			// otherwise remove it
			var items = self.serializeList(list);
			items.splice(index,1);
			self.updatedList(list,  { data: items }, set);
		}
		
	});
};


var destroy = function(props, options) {
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


module.exports = connect.behavior("real-time",function(baseConnect, options){
	return {
		createInstance: function(props){
			var id = this.id(props);
			var instance = this.instanceStore.get(id);
			if( instance ) {
				// already created
				this.updatedInstance(instance, {});
			} else {
				instance = this.makeInstance(props);
				this.createdInstance(instance, {});
			}
			create.call(this, props, options);
			return instance;
		},
		createdInstanceData: function(props, params, cid){
			var instance = this.cidStore.get(cid);
			this.createdInstance(instance, props);
			// we can pre-register it so everything else finds it
			this.addInstanceReference(instance);
			
			create.call(this, this.serializeInstance(instance), options);
			this.deleteInstanceReference(instance);
			return undefined;
		},
		updatedInstanceData: function(props, params){
			// Go through each list in the listStore and see if there are lists that should have this,
			// or a list that shouldn't.
			var instance = this.instanceStore.get( this.id(params) );
			this.updatedInstance(instance, props);
			update.call(this, this.serializeInstance(instance), options);
			return undefined;
		},
		updateInstance: function(props){
			var id = this.id(props);
			var instance = this.instanceStore.get(id);
			if( !instance ) {
				instance = this.makeInstance(props);
			} else {
				this.updatedInstance(instance, props);
			}
			// we can pre-register it so everything else finds it
			this.addInstanceReference(instance);
			update.call(this, this.serializeInstance(instance), options);
			this.deleteInstanceReference(instance);
			return instance;
		},
		destroyedInstanceData: function(props, params){
			// Go through each list in the listStore and see if there are lists that should have this,
			// or a list that shouldn't.
			var id = this.id(params);
			var instance = this.instanceStore.get(id);
			if( !instance ) {
				instance = this.makeInstance(props);
			} else {
				this.destroyedInstance(instance, props);
			}
			// we can pre-register it so everything else finds it
			this.addInstanceReference(instance);
			destroy.call(this, this.serializeInstance(instance), options);
			this.deleteInstanceReference(instance);
			return instance;
		},
		destroyInstance: function(props){
			var id = this.id(props);
			var instance = this.instanceStore.get(id);
			if( !instance ) {
				instance = this.makeInstance(props);
			} else {
				this.destroyedInstance(instance, props);
			}
			// we can pre-register it so everything else finds it
			this.addInstanceReference(instance);
			destroy.call(this, this.serializeInstance(instance), options);
			this.deleteInstanceReference(instance);
			return instance;
		}
	};
});