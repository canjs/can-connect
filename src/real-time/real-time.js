/**
 * @module can-connect/real-time real-time
 * @group can-connect/real-time.callbacks Data Callbacks
 * @group can-connect/real-time.methods Methods
 * 
 * @parent can-connect.modules
 */
var connect = require("../can-connect");
var canSet = require("can-set");




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
				promise = Promise.resolve(instance);
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
					promise = Promise.resolve(instance);
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
			this.addInstanceReference(instance, this.id(props));
			this.createdInstance(instance, props);
			// we can pre-register it so everything else finds it
			
			
			create.call(this, this.serializeInstance(instance));
			this.deleteInstanceReference(instance);
			return undefined;
		},
		/**
		 * @function can-connect/real-time.updatedData updatedData
		 * @parent can-connect/real-time.callbacks
		 * 
		 * @signature `connection.updatedData(props, params)`
		 * 
		 *   An instance has been updated by this client. Goes through
		 *   
		 */
		// Go through each list in the listStore and see if there are lists that should have this,
		// or a list that shouldn't.
		updatedData: function(props, params){
			
			var instance = this.instanceStore.get( this.id(params) );
			this.updatedInstance(instance, props);
			update.call(this, this.serializeInstance(instance));
			
			// Returning undefined prevents other behaviors from running.
			return undefined;
		},
		/**
		 * @signature `connection.updateInstance(props)`
		 * 
		 *   
		 * 
		 * @param {Object} props
		 */
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
				return  Promise.resolve(instance);
			}
		},
		destroyedData: function(props, params){
			var data = getInstanceUpdateAndSerialize.call(this, props, params, "destroyedInstance");
			// we can pre-register it so everything else finds it
			destroy.call(this, data.serialized);
			return undefined;
		},
		destroyInstance: function(props){
			var data = getInstanceUpdateAndSerialize.call(this, props, undefined, "destroyedInstance");
			
			// we can pre-register it so everything else finds it
			
			this.addInstanceReference(data.instance);
			destroy.call(this, data.serialized);
			this.deleteInstanceReference(data.instance);
			
			
			if(this.cacheConnection) {
				return this.cacheConnection.destroyData(data.serialized).then(function(){
					return data.instance;
				});
			} else {
				return  Promise.resolve(data.instance);
			}
		}
	};
});

var getInstanceUpdateAndSerialize = function(props, params, pastInstanceMethod){
	var id = this.id(params || props);
	var instance = this.instanceStore.get(id);
	if( !instance ) {
		instance = this.hydrateInstance(props);
	} else {
		this[pastInstanceMethod](instance, props);
	}
	var serialized = this.serializeInstance(instance);
	return {
		id: id,
		instance: instance,
		serialized: serialized
	};
};

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

// ## update
// Goes through each list and sees if the list should be updated
// with the new.
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