//	___________        .___
//	\__    ___/___   __| _/____
//	  |    | /  _ \ / __ |/  _ \
//	  |    |(  <_> ) /_/ (  <_> )
//	  |____| \____/\____ |\____/
//						\/
//
// TODO: This implementation deeply depends on `can-define/map/` and `can-define/list/`.
// Track the issue `https://github.com/canjs/canjs/issues/2931` to figure out how to apply smartMerge
// to regular objects and arrays.

var DefineList = require('can-define/list/list');
var diff = require('can-util/js/diff/diff');

/*
 * Main method exported by the module.
 * @param {can-define/map/map | can-define/list/list} instance Instance to apply smartMerge to.
 * @param {Object} props Data to be merged to the provided instance.
 */
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

		if( value instanceof DefineList || Array.isArray( newValue ) ) {

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
function hydratorFromType( Type ){
	return Type && Type.connection && Type.connection.makeInstance || function( data ){ return new Type( data ) };
}


function applyPatch( list, patch, makeInstance ){
	// Splice signature compared to patch:
	//   array.splice(start, deleteCount, item1, item2, ...)
	//   patch = {index: 1, deleteCount: 0, insert: [1.5]}
	var insert = makeInstance && patch.insert.map( makeInstance ) || patch.insert;

	var args = [patch.index, patch.deleteCount].concat( insert );
	list.splice.apply(list, args);

	return list;
}
function applyPatchPure( list, patch, makeInstance ){
	var copy = list.slice();
	return applyPatch( copy, patch, makeInstance );
}

module.exports = smartMerge;

smartMerge.mergeInstance = mergeInstance;
smartMerge.mergeList = mergeList;
smartMerge.applyPatch = applyPatch;
smartMerge.applyPatchPure = applyPatchPure;