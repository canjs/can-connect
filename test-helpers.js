"use strict";
module.exports = {
	makeStateChecker: function(QUnit, names){

		return {
			check: function(value){
				var state = names.shift();
				QUnit.equal( state, value, "state check "+state );
				if(state !== value) {
					QUnit.start();
				}
				return state;
			},
			get: function(){
				return names[0];
			},
			next: function(){
				return names.shift();
			},
			toString: function(){
				return this.get();
			}
		};



	},
	later: function(fn){
		return function(){
			setTimeout(fn, 1);
		};
	},
	logErrorAndStart: function(e){
		ok(false,"Error "+e);
		setTimeout(function(){
			throw e;
		},1);
		start();
	},
	getId: function(o){
		return o.id;
	},
	asyncResolve: function(data) {
		var def = new Promise(function(resolve){
			setTimeout(function(){
				resolve(data);
			},1);
		});
		return def;
	},
	asyncReject: function(data) {
		var def = new Promise(function(resolve, reject){
			setTimeout(function(){
				reject(data);
			},1);
		});
		return def;
	}

};
