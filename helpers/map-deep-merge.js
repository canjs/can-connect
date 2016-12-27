var isArrayLike = require("can-util/js/is-array-like/is-array-like");


function smartMerge (instance, data) {
	if (isArrayLike( instance )) {
		mergeList( list, data );
	} else {
		mergeInstance( instance, data);
	}
}

function mergeInstance (instance, data) {

	instance.forEach(function(value, prop){
		var newValue = data[prop];

		if( typeof newValue === 'object' && typeof value === 'object' ) {
			var Type = value.constructor;
			var id = Type.algebra.id;
			if( id(instance) === id(data) ) {
				mergeInstance( value, newValue )
			} else {
				instance[prop] = hydrate( newValue );
			}
		}

		if( isArrayLike( newValue ) && value) {
			mergeList(value, newValue);
		}

		// handle #4
	});

	// delete properties not in data
}

function mergeList (list, data) {
	var Type = list._define["#"]
	var id = Type.algebra.id;
	var identity = function(a, b){
		var eq = id(a) === id(b);
		if(eq) {
			mergeInstance( a, b );
		}
		return eq;
	};
	var hydrator = Type.connection.makeInstance || function(data){ return new Type(data) };
	var patches = diff( list, data , identity );

	// apply patches #3
	// any insertion ... use hydrator probably?

	// on the instances that weren't "patched" ... we need to call mergeInstance(). Case #2
}


module.exports = {
	smartMerge,
	mergeInstance,
	mergeList
};