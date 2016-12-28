var DefineMap = require('can-define/map/map');
var DefineList = require('can-define/list/list');

function smartMerge( instance, props ) {
	console.log('smartMerge here !!!');

	if( instance instanceof DefineList ) {
		mergeList( instance, props );
	} else {
		mergeInstance( instance, props );
	}
}

function mergeInstance( instance, data ) {

	instance.forEach( function( value, prop ){
		var newValue = data[prop];

		// cases:
		// a. list
		// b. map
		// c. primitive

		if( value instanceof DefineList ) { // isArray(newValue)
			mergeList( value, newValue );
		} else if( typeof newValue === 'object' || typeof value === 'object' ) {
			var Type = value.constructor;
			var id = idFromType( Type );
			var hydrate = Type && Type.connection && Type.connection.makeInstance || function( data ){ return new Type( data ) };
			if( id && id( value ) === id( newValue ) ) {
				mergeInstance( value, newValue )
			} else {
				instance[prop] = hydrate( newValue );
			}
		} else {
			instance[prop] = newValue;
		}

		// handle #4
	});

	// delete properties not in data
}

function mergeList (list, data) {
	return data;

	var Type = typeFromList(list);
	var id = idFromType(Type);
	var identity = function(a, b){
		var eq = id(a) === id(b);
		if(eq) {
			mergeInstance( a, b );
		}
		return eq;
	};
	var hydrator = Type && Type.connection.makeInstance || function(data){ return new Type(data) };
	var patches = typeof diff !== 'undefined' && diff( list, data , identity );

	// apply patches #3
	// any insertion ... use hydrator probably?

	// on the instances that weren't "patched" ... we need to call mergeInstance(). Case #2
}

function typeFromList(list){
	return list && list._define && list._define.definitions["#"] && list._define.definitions["#"].Type;
}
function idFromType(Type){
	return Type && Type.algebra && Type.algebra.clauses && Type.algebra.clauses.id && function(o){
			return o[Type.algebra.clauses.id.id];
		} || function(o){
			return o.id || o._id;
		};
}
function isArray(o){
	return Object.prototype.toString.call(o) === '[object Array]';
}

module.exports = {
	smartMerge,
	mergeInstance,
	mergeList
};