var DefineMap = require('can-define/map/map');
var DefineList = require('can-define/list/list');
var diff = require('can-util/js/diff/diff');

function smartMerge( instance, props ) {
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

		if( value instanceof DefineList || isArray( newValue ) ) {

			mergeList( value, newValue );

		} else if( typeof newValue === 'object' || typeof value === 'object' ) {

			var Type = value.constructor;
			var id = idFromType( Type );
			var hydrate = hydratorFromType( Type );

			// Merge if id is the same:
			if( id && id( value ) === id( newValue ) ) {
				mergeInstance( value, newValue )
			} else {
				// Instantiate if id is different:
				instance[prop] = hydrate( newValue );
			}

		} else {

			instance[prop] = newValue;

		}
	});
}

function mergeList (list, data) {
	var Type = typeFromList(list);
	var id = idFromType(Type);
	var identity = function(a, b){
		var eq = id(a) === id(b);
		if(eq) {
			// If id is the same we merge data in. Case #2
			mergeInstance( a, b );
		}
		return eq;
	};
	var hydrate = hydratorFromType( Type );
	var patches = diff( list, data , identity );

	// If there are no patches then data contains only updates for all of the existing items, and we just leave.
	if (!patches.length){
		return list;
	}

	// Apply patches (add new, remove) #3. For any insertion use a hydrator.
	patches.forEach(function(patch){
		applyPatch( list, patch, hydrate );
	});
}

function typeFromList( list ){
	return list && list._define && list._define.definitions["#"] && list._define.definitions["#"].Type;
}
function idFromType( Type ){
	return Type && Type.algebra && Type.algebra.clauses && Type.algebra.clauses.id && function(o){
			return o[Type.algebra.clauses.id.id];
		} || function(o){
			return o.id || o._id;
		};
}
function isArray( o ){
	return Object.prototype.toString.call(o) === '[object Array]';
}
function hydratorFromType( Type ){
	return Type && Type.connection && Type.connection.makeInstance || function( data ){ return new Type( data ) };
}


// TODO: move this to can-util
function applyPatch( list, patch, makeInstance ){
	// array.splice(start, deleteCount, item1, item2, ...)
	// patch = {index: 1, deleteCount: 0, insert: [1.5]}
	var insert = makeInstance && patch.insert.map( makeInstance ) || patch.insert;

	// TODO: Without spread operator ?
	// var args = [patch.index, patch.deleteCount].concat( insert );
	// list.splice.apply(list, args);

	list.splice( patch.index, patch.deleteCount, ...insert );

	return list;
}
// TODO: maybe name this method just `patch`?
function applyPatchPure( list, patch, makeInstance ){
	var copy = list.slice();
	return applyPatch( copy, patch, makeInstance );
}

module.exports = {
	smartMerge,
	mergeInstance,
	mergeList,
	applyPatch,
	applyPatchPure
};