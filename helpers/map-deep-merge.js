// TODO: This implementation deeply depends on `can-define/map/` and `can-define/list/`.
// Track the issue `https://github.com/canjs/canjs/issues/2931` to figure out how to apply smartMerge
// to regular objects and arrays.

var DefineList = require('can-define/list/list');
var diff = require('can-util/js/diff/diff');

/**
 * @module {function} can-connect/helpers/map-deep-merge mapDeepMerge
 * @parent can-connect.modules
 *
 * Perform a smart merge of deeply nested maps and lists.
 *
 * @signature `mapDeepMerge( instance, data )`
 *
 *   Merges changes into the `can-define/map/map` or `can-define/list/list` instance considering the nested structure.
 *   Dispatches update events for the exact changes that needs to be applied.
 *
 *   @param {can-define/map/map | can-define/map/list} instance An instance to apply a merge to.
 *   @param {Object | Array} data An object or array with the updated data.
 *
 * @body
 *
 * ## Use
 *
 * This method is especially helpful when is used with `can-connect` models that contain nested data and when
 * the data is live-bound to a template. It makes the update only fire the required minimum changes.
 *
 * ## With can-define/map/map
 *
 * Lets say we have a `ContributionMonth` map that contains a list of OS projects and an author:
 *
 * ```js
 *  var DefineMap = require("can-define/map/map");
 *
 *  var Author = DefineMap.extend({});
 *  Author.algebra = new set.Algebra( set.props.id("id") );
 *
 *  var OSProject = DefineMap.extend({});
 *  OSProject.algebra = new set.Algebra( set.props.id("id") );
 *
 *  var ContributionMonth = DefineMap.extend({
 *    author: Author,
 *    osProjects: OSProject.List
 *  });
 *
 * 	var myMonth = new ContributionMonth({
 * 	    id: 1,
 * 	    month: "Feb",
 * 	    osProjects: [ { id: 1, title: "canjs" }, {id: 2, title: "jQuery++"} ],
 * 	    author: {id: 5, name: "ilya"}
 * 	});
 * ```
 *
 * And we receive the following updated data:
 *
 * ```js
 *  var updatedData = {
 *      id: 1,
 *      month: "February",
 *      osProjects: [ { id: 1, title: "CanJS" }, {id: 3, title: "StealJS"}, {id: 2, title: "jQuery++"} ],
 *      author: {id: 6, name: "ilya"}
 *  };
 * ```
 *
 * To make our template engine apply only the minimun changes we need the map to dispatch only the following updates:
 *
 * ```js
 *  contributionMonth.name = "February";                    		// 1 - a property update
 *  contributionMonth.osProjects[0].name = "CanJS";         		// 2 - a property update on an item of a list
 *  contributionMonth.osProjects.splice(1,0, new OSProject({id: 3, name: "StealJS"}) )     // 3 - item insertion
 *  contributionMonth.author = hydrateInstance( {id: 6, name: "ilya"} )                    // 4 - a map replacement (`id` is different)
 * ```
 *
 * To have this setup we now can update `myMonth` with `updatedData` using our `smartMerge`:
 *
 * ```js
 * var smartMerge = require("can-connect/helpers/map-deep-merge");
 *
 * smartMerge( myMonth, updatedData );
 * ```
 *
 * ### With can-connect
 *
 * We can use our `ContributionMonth` with `can-connect` by creating a new behavior which will perform item update using
 * `can-connect/helpers/map-deep-merge` helper:
 *
 * ```js
 * var connect = require("can-connect");
 * var smartMerge = require("can-connect/helpers/map-deep-merge");
 *
 * var canMapMergeBehaviour = {
 *     updatedInstance: function(instance, props){
 *         smartMerge( instance, props );
 *         canMap.callbackInstanceEvents("updated", instance);
 *     }
 * };
 *
 * connect([dataUrl, constructor, constructorStore, canMap, canMapMergeBehaviour], {
 *     Map: ContributionMonth,
 *     url: "localhost:8080/contribution-month"
 * });
 *
 * var item = new ContributionMonth(origData);
 *
 * item.save();
 * ```
 *
 * Now when we receive the `updatedData` on the save response from server we will get only the minimum changes dispatched.
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