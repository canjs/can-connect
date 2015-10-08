require("when/es6-shim/Promise");

var strReplacer = /\{([^\}]+)\}/g,
	// Returns `true` if the object can have properties (no `null`s).
	isContainer = function (current) {
		return /^f|^o/.test(typeof current);
	},
	arrayProto = Array.prototype;
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
	forEach: arrayProto.forEach || function(cb){
		var i = 0, len = this.length;
		for(; i < len; i++) {
			cb(this[i], i);
		}
	},
	map: arrayProto.map || function(cb){
		var out = [], arr = this;
		helpers.forEach.call(arr, function(o, i){
			out.push(cb(o, i, arr));
		});
		return out;
	},
	indexOf: arrayProto.indexOf || function(item) {
		for (var i = 0, thisLen = this.length; i < thisLen; i++)
			if (this[i] === item)
				return i;
		return -1;
	},
	getObject: function(prop, data, remove) {
		var res = data[prop];
		if(remove) {
			delete data[prop];
		}
		return res;
	},
	sub: function (str, data, remove) {
		var obs = [];
		str = str || '';
		obs.push(str.replace(strReplacer, function (whole, inside) {
			// Convert inside to type.
			var ob = helpers.getObject(inside, data, remove);
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
	},
	keys: Object.keys || (function () {
		var hasOwnProperty = Object.prototype.hasOwnProperty,
		hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
		dontEnums = [
			'toString',
			'toLocaleString',
			'valueOf',
			'hasOwnProperty',
			'isPrototypeOf',
			'propertyIsEnumerable',
			'constructor'
		],
		dontEnumsLength = dontEnums.length;

		return function (obj) {
			if (typeof obj !== 'object' && typeof obj !== 'function' || obj === null) throw new TypeError('Object.keys called on non-object');

			var result = [];

			for (var prop in obj) {
				if (hasOwnProperty.call(obj, prop)) result.push(prop);
			}

			if (hasDontEnumBug) {
				for (var i=0; i < dontEnumsLength; i++) {
					if (hasOwnProperty.call(obj, dontEnums[i])) result.push(dontEnums[i]);
				}
			}
			return result;
		};
	})(),
	defineProperty: (function(){
		try {
			var tmp = {};
			Object.defineProperty(tmp, "foo", {});
			return Object.defineProperty;
		} catch(_) {
			// Not fixable, we can only support .value
			return function(obj, name, desc){
				if(desc.value) {
					obj[name] = value;
				}
			};
		}
	})(),
	isArray: Array.isArray || function(arr){
		return Object.prototype.toString.call(arr) === "[object Array]";
	},
	bind: (function(){
		if(Function.prototype.bind) {
			return function(fn, ctx){
				return fn.bind(ctx);
			}
		} else {
			return function(fn, ctx){
				return function(){
					return fn.apply(ctx, arguments);
				};
			}
		}
	})()
};
