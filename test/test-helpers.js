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
		
		
		
	}
};
