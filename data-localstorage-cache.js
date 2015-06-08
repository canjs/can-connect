var getItems = require("./helpers/get-items");
var can = require("can/util/util");
var connect = require("can-connect");
var sortedSetJSON = require("./helpers/sorted-set-json");
var canSet = require("can-set");

// 
var indexOf = function(connection, props, items){
	var id = connection.id(props);
	for(var i = 0; i < items.length; i++) {
		if( id == connection.id(items[i]) ) {
			return i;
		}
	}
	return -1;
};

var setAdd = function(set, items, item, compare){
	return items.concat([item]);
};

/**
 * @module can-connect/localstorage-cache
 * 
 */
module.exports = connect.behavior("data-localstorage-cache",function(baseConnect){

	var behavior = {
		// an array of each set to the ids it contains
		_sets: null,
		// a map of each id to an instance
		_instances: {},
		getSets: function(){
			if(!this._sets) {
				var sets = this._sets = {};
				(JSON.parse(localStorage.getItem(this.name+"-sets"))|| []).forEach(function(setKey){
					// make sure we actually have set data
					if( localStorage.getItem(this.name+"/set/"+setKey) ) {
						sets[setKey] = {
							set: JSON.parse(setKey),
							setKey: setKey
						};
					}
				});
			}
			return this._sets;
		},
		getInstance: function(id){
			//if(!this._instances[id]) {
				var res = localStorage.getItem(this.name+"/instance/"+id);
				if(res) {
					return JSON.parse( res );
				}
			//}
			//return this._instances[id];
		},
		getInstances: function(ids){
			var self = this;
			return ids.map(function(id){
				return self.getInstance(id);
			});
		},
		removeSet: function(setKey, noUpdate) {
			var sets = this.getSets();
			localStorage.removeItem(this.name+"/set/"+setKey);
			delete sets[setKey];
			if(noUpdate !== true) {
				this.updateSets();
			}
		},
		updateSets: function(){
			var sets = this.getSets();
			localStorage.setItem(this.name+"-sets", JSON.stringify( Object.keys(sets) ) );
		},
		reset: function(){
			var sets = this.getSets();
			for(var setKey in sets) {
				localStorage.removeItem(this.name+"/set/"+setKey);
			}
			localStorage.removeItem(this.name+"-sets");
			
			// remove all instances
			var i = 0;
			while(i < localStorage.length) {
				if(localStorage.key(i).indexOf(this.name+"/instance/") === 0) {
					localStorage.removeItem( localStorage.key(i) );
				} else {
					i++;
				}
			}
			this._instances = {};
			this._sets = null;
		},
		// gets the set from localstorage
		getListData: function(set){
			var setKey = sortedSetJSON(set);
			
			var setDatum = this.getSets()[setKey];
			if(setDatum) {
				var localData = localStorage.getItem(this.name+"/set/"+setKey);
				if(localData) {
					return new can.Deferred().resolve( {data: this.getInstances( JSON.parse( localData ) )} );
				}
			} 
			return new can.Deferred().reject({message: "no data", error: 404});
			
		},
		// TODO: Ideally, this should be able to go straight to the instance and not have to do
		// much else
		getInstanceData: function(params){
			var id = this.id(params);
			var res = localStorage.getItem(this.name+"/instance/"+id);
			if(res){
				return new can.Deferred().resolve( JSON.parse(res) );
			} else {
				return new can.Deferred().reject({message: "no data", error: 404});
			}
		},
		updateSet: function(setDatum, items, newSet) {
			var newSetKey = newSet ? sortedSetJSON(newSet) : setDatum.setKey;
			if(newSet) {
				// if the setKey is changing
				if(newSetKey !== setDatum.setKey) {
					// add the new one
					var sets = this.getSets();
					var oldSetKey = setDatum.setKey;
					sets[newSetKey] = setDatum;
					setDatum.setKey = newSetKey;
					// remove the old one
					this.removeSet(oldSetKey);
				}
			}

			setDatum.items = items;
			// save objects and ids
			var self = this;
			
			var ids = items.map(function(item){
				var id = self.id(item);
				//localStorage.setItem(this.name+"/instance/"+id, JSON.stringify(item) );
				
				return id;
			});
			
			localStorage.setItem(this.name+"/set/"+newSetKey, JSON.stringify(ids) );
		},
		addSet: function(set, data) {
			var items = getItems(data);
			var sets = this.getSets();
			var setKey = sortedSetJSON(set);
			sets[setKey] = {
				setKey: setKey,
				items: items,
				set: set
			};
			
			var self = this;
			
			var ids = items.map(function(item){
				var id = self.id(item);
				localStorage.setItem(this.name+"/instance/"+id, JSON.stringify(item));				
				return id;
			});
			
			localStorage.setItem(this.name+"/set/"+setKey, JSON.stringify(ids) );
			this.updateSets();
		},
		// creates the set in localstorage
		updateListData: function(data, set){
			var items = getItems(data);
			var sets = this.getSets();
			var self = this;
			
			for(var setKey in sets) {
				var setDatum = sets[setKey];
				var union = canSet.union(setDatum.set, set, this.compare);
				if(union) {
					return this.getListData(setDatum.set).then(function(setData){
						
						self.updateSet(setDatum, canSet.getUnion(setDatum.set, set, getItems(setData), items, this.compare), union);
					});
				}
			}

			this.addSet(set, data);
			// setData.push({set: set, items: data});
			return new can.Deferred().resolve();
		},
		_eachSet: function(cb){
			var sets = this.getSets();
			var self = this;
			var loop = function(setDatum, setKey) {
				return cb(setDatum, setKey, function(){
					
					if( !("items" in setDatum) ) {
						var ids = JSON.parse( localStorage.getItem(this.name+"/set/"+setKey) );
						setDatum.items = self.getInstances(ids);
					}
					return setDatum.items;

				});
			};

			for(var setKey in sets) {
				var setDatum = sets[setKey];
				var result = loop(setDatum, setKey);
				if(result !== undefined) {
					return result;
				}
			}
		},
		createInstanceData: function(props){
			var self = this;
			// for now go through every set, if this belongs, add
			this._eachSet(function(setDatum, setKey, getItems){
				if(canSet.subset(props, setDatum.set, this.compare)) {
					self.updateSet(setDatum, setAdd(setDatum.set,  getItems(), props, this.compare), setDatum.set);
				}
			});
			var id = this.id(props);
			localStorage.setItem(this.name+"/instance/"+id, JSON.stringify(props));
			return new can.Deferred().resolve({});
		},
		updateInstanceData: function(props){
			var self = this;
			// for now go through every set, if this belongs, add it or update it, otherwise remove it
			this._eachSet(function(setDatum, setKey, getItems){
				// if props belongs
				var items = getItems();
				var index = indexOf(self, props, items);
				
				if(canSet.subset(props, setDatum.set, this.compare)) {
					
					// if it's not in, add it
					if(index == -1) {
						// how to insert things together?
						
						self.updateSet(setDatum, setAdd(setDatum.set,  getItems(), props, this.compare) );
					} else {
						// otherwise add it
						items.splice(index,1, props);
						self.updateSet(setDatum, items);
					}
					
				} else if(index != -1){
					// otherwise remove it
					items.splice(index,1);
					self.updateSet(setDatum, items);
				}
			});
			var id = this.id(props);
			
			localStorage.setItem(this.name+"/instance/"+id, JSON.stringify(props));
				
			return new can.Deferred().resolve({});
		},
		destroyInstanceData: function(props){
			var self = this;
			// for now go through every set, if this belongs, add it or update it, otherwise remove it
			this._eachSet(function(setDatum, setKey, getItems){
				// if props belongs
				var items = getItems();
				var index = indexOf(self, props, items);
				
				if(index != -1){
					// otherwise remove it
					items.splice(index,1);
					self.updateSet(setDatum, items);
				}
			});
			var id = this.id(props);
			localStorage.removeItem(this.name+"/instance/"+id);
			return new can.Deferred().resolve({});
		}
	};
	
	return behavior;
	
});


