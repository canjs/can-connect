require("when/es6-shim/Promise");

var strReplacer = /\{([^\}]+)\}/g,
	// Returns `true` if the object can have properties (no `null`s).
	isContainer = function (current) {
		return /^f|^o/.test(typeof current);
	};
var helpers;
module.exports = helpers = {
	extend: function(d, s){
		for(var name in s) {
			d[name] = s[name];
		}
		return d;
	},
	deferred: function(){
		var def = {};
		def.promise = new Promise(function(resolve, reject){
			def.resolve = resolve;
			def.reject = reject;
		});
		return def;
	},
	each: function(obj, cb){
		for(var prop in obj) {
			cb(obj[prop], prop);
		}
		return obj;
	},
	getObject: function(prop, data){
		return data[prop];
	},
	sub: function (str, data, remove) {
		var obs = [];
		str = str || '';
		obs.push(str.replace(strReplacer, function (whole, inside) {
			// Convert inside to type.
			var ob = helpers.getObject(inside, data, remove === true ? false : undefined);
			if (ob === undefined || ob === null) {
				obs = null;
				return '';
			}
			// If a container, push into objs (which will return objects found).
			if (isContainer(ob) && obs) {
				obs.push(ob);
				return '';
			}
			return '' + ob;
		}));
		return obs === null ? obs : obs.length <= 1 ? obs[0] : obs;
	}
};
