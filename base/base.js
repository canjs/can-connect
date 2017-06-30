var connect = require("can-connect/connect");
/**
 * @module can-connect/base/base base
 * @parent can-connect.behaviors
 *
 * The first behavior added to every `can-connect` connection. Defines how to uniquely identify instances and lists.
 *
 * @signature `base(connectionOptions)`
 *
 * @body
 *
 * ## Use
 *
 * The `base` behavior is added automatically to every connection created by `connect`. So even if we do:
 *
 * ```
 * var connection = connect([],{});
 * ```
 *
 * The connection still has the identification functionality provided by `base`:
 *
 * ```
 * connection.id({id: 1, ...}) //-> 1
 * ```
 *
 * See the [can-connect/base/base.id id] and [can-connect/base/base.listSet listSet] methods for more specifics on
 * how ids are determined.
 */
module.exports = connect.behavior("base",function(baseConnection){
	return {
		/**
		 * @function can-connect/base/base.id id
		 * @parent can-connect/base/base
		 *
		 * Uniquely identify an instance or raw instance data.
		 *
		 * @signature `connection.id(instance)`
		 *
		 *   Returns the instance id as determined by [can-connect/base/base.algebra]'s id values if they exist, else return
		 *   the instance value indicated by [can-connect/base/base.idProp] if it exists, otherwise the return the value of
		 *   `instance.id`.
		 *
		 *   @param {Instance|Object} instance An instance or raw properties for an instance.
		 *
		 *   @return {String|Number} A string or number uniquely representing `instance`.
		 *
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * Many extensions, such as the [can-connect/constructor/store/store], need to have a unique identifier for an
		 * instance or instance data.  This `connection.id` method should return that.
		 *
		 * Typically, an item's id is a simply property value on the object. For example, "Todo" data might look like:
		 *
		 * ```js
		 * {_id: 5, name: "do the dishes"}
		 * ```
		 *
		 * In this case, [can-connect/base/base.algebra]'s `id` comparator should be set to "_id":
		 *
		 * ```js
		 * var algebra = new set.Algebra({
		 *   set.comparators.id("_id")
	 	 * });
		 *
		 * connect([...],{algebra: algebra});
		 * ```
		 *
		 * However, some data records may have compound ids.  For example, "Class Assignment" data may be uniquely
		 * identified by a combination of two properties, the `studentId` and the `classId`. For this kind of setup, you
		 * can provide your own id function as follows:
		 *
		 * ```js
		 * var customIdBehavior = {
		 *   id: function(assignment){
		 *     return assignment.studentId + "-" + assignment.classId;
		 *   }
		 * }
		 *
		 * var classAssignmentConnection = connect(
		 *   [...behaviors..., customIdBehavior],
		 *   {
		 *     url: "/class_assignments"
		 *   }
		 * );
		 * ```
		 */
		id: function(instance){
			var ids = [],
				algebra = this.algebra;

			if(algebra && algebra.clauses && algebra.clauses.id) {
				for(var prop in algebra.clauses.id) {
					ids.push(instance[prop]);
				}
			}

			if(this.idProp && !ids.length) {
				ids.push(instance[this.idProp]);
			}

			if(!ids.length) {
				ids.push(instance.id);
			}

			// Join with something unlikely to be matched.
			// TODO: provide a way to supply join
			return ids.length > 1 ? ids.join("@|@"): ids[0];
		},

		/**
		 * @property {String} can-connect/base/base.idProp idProp
		 * @parent can-connect/base/base
		 *
		 * Specifies the property that uniquely identifies an instance.
		 *
		 * @deprecated {0.5.3} Instead of specifying idProp users should set an [can-set.props.id id property] on the
		 * [can-connect/base/base.algebra] included in the connection configuration options.
		 *
		 *
		 * @option {String} The name of the property that uniquely identifies an instance.  Defaults to `"id"`.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var todoConnect = connect([
		 *   require("can-connect/data/url/url")
		 * ],{
		 *   idProp: "_id"
		 * });
		 *
		 * todoConnect.id({_id: 5}) // -> 5
		 * ```
		 *
		 */
		idProp: baseConnection.idProp || "id",

		/**
		 * @function can-connect/base/base.listSet listSet
		 * @parent can-connect/base/base
		 *
		 * Uniquely identify the set a list represents.
		 *
		 * @signature `connection.listSet(list)`
		 *
		 *   Returns the [can-connect/base/base.listSetProp] if it exists. By default, this will check for `list.__listSet`.
		 *
		 *   @param {can-connect.List} list A list instance.
		 *
		 *   @return {Object} An object that can be passed to `JSON.stringify` to represent the list.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * Many extensions, such as the [can-connect/constructor/store/store], need to have a unique identifier for a list.
		 * This `connection.listSet` method should return that.
		 *
		 * Typically, a list's set identifier is a property on the list object.  As example, a list of Todos might look like
		 * the following:
		 *
		 * ```
		 * var dueTodos = todoConnection.getList({due: "today"});
		 * dueTodos; // [{_id: 5, name: "do dishes", due:"today"}, {_id: 6, name: "walk dog", due:"today"}, ...]
		 * dueTodos.__listSet; // {due: "today"}
		 * todoConnection.listSet(dueTodos); // {due: "today"}
		 * ```
		 *
		 * In the above example the [can-connect/base/base.listSetProp] would be the default `"__listSet"`.
		 */
		listSet: function(list){
			return list[this.listSetProp];
		},

		/**
		 * @property {String} can-connect/base/base.listSetProp listSetProp
		 * @parent can-connect/base/base
		 *
		 * Specifies the property that uniquely identifies a list.
		 *
		 * @option {String} The name of the property that uniquely identifies
		 * the list.  Defaults to `"__listSet"`.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var connection = connect([
		 *   require("can-connect/data/url/url")
		 * ],{
		 *   listSetProp: "set"
		 * });
		 *
		 * var list = [{id: 1, ...}, {id: 2, ...}]
		 * list.set = {complete: true};
		 *
		 * connection.listSet(list) //-> {complete: true}
		 * ```
		 *
		 */
		listSetProp: "__listSet",

		init: function(){}

		/**
		 * @property {can-set.Algebra} can-connect/base/base.algebra algebra
		 * @parent can-connect/base/base
		 *
		 * `can-set` set algebra used for list comparison and membership calculations.
		 *
		 * @option {can-set.Algebra} A `can-set` [can-set.Algebra set algebra] that is used by many behaviors to compare the
		 * set definition objects passed to [can-connect/connection.getListData] and [can-connect/connection.getList]. By
		 * default no algebra is provided.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var algebra = new set.Algebra(set.props.range("start","end"));
		 *
		 * connect([...behaviors...],{
		 *   algebra: algebra
		 * });
		 * ```
		 */

			/**
		 * @property {can-connect/DataInterface} can-connect/base/base.cacheConnection cacheConnection
		 * @parent can-connect/base/base
		 *
		 * An underlying `can-connect` connection used when fetching data from a cache.
		 *
		 * @option {can-connect/DataInterface} A connection that provides access to a cache via [can-connect/DataInterface]
		 * requests. Several behaviors including [can-connect/fall-through-cache/fall-through-cache] expect this property.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var cacheConnection = connect([
		 *   require("can-connect/data/memory-cache/memory-cache")
		 * ],{});
		 *
		 * var todoConnection = connect([...behaviors...],{
		 *   cacheConnection: cacheConnection
		 * });
		 * ```
		 */
	};
});
