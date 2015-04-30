var can = require("can/util/util");

var WeakReferenceMap = function(){
	this.set = {};
};

// if weakmap, we can add and never worry ...
// otherwise, we need to have a count ...

can.simpleExtend(WeakReferenceMap.prototype,{
	has: function(key){
		return !!this.set[key];
	},
	addReference: function(key, item){
		var data = this.set[key];
		if(!data) {
			data = this.set[key] = {
				item: item,
				referenceCount: 0,
				key: key
			};
		}
		data.referenceCount++;
	},
	deleteReference: function(key){
		var data = this.set[key];
		if(data){
			data.referenceCount--;
			if( data.referenceCount === 0 ) {
				delete this.set[key];
			}
		}
	},
	get: function(key){
		var data = this.set[key];
		if(data) {
			return data.item;
		}
	}
});

module.exports = WeakReferenceMap;

