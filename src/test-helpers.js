module.exports = {
	makeStateChecker: function(QUnit, names){

		return {
			check: function(value){
				console.log("STATE",value);
				var state = names.shift();
				QUnit.equal( state, value, "state check "+state );
				if(state !== value) {
					QUnit.start();
				}
				return state;
			},
			get: function(){
				console.log("STATE", names[0])
				return names[0];
			},
			next: function(){
				console.log("STATE", names[0])
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
