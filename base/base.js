var connect = require("can-connect/connect");
/**
 * @module can-connect/base/base
 * @parent can-connect.behaviors
 *
 * The base behavior added to every `connect` behavior.
 *
 * @signature `base(options)`
 *
 * @body
 *
 * ## Use
 *
 * The `"base"` behavior is added automatically to every connection created by `connect`. So even we do:
 *
 * ```
 * var connection = connect([],{});
 * ```
 *
 * The connection still has `"base"` functionality:
 *
 * ```
 * connection.id({id: 1}) //-> 1
 * ```
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
		 *   Returns the [can-connect/base/base.idProp] if it exists, otherwise the [can-connect/base/base.algebra]'s
		 *   id values, otherwise the `id` property.
		 *
		 *   @param {Instance|Object} instance The instance or raw `props` for an instance.
		 *
		 *   @return {String|Number} A string or number uniquely representing `instance`.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * Many extensions, such as the [can-connect/constructor/store/store], need
		 * to have a unique identifier for an instance or instance data.  The
		 * `connection.id` method should return that.
		 *
		 * Typically, an item's `id` is a simply propertly value on the object.
		 * For example, `todo` data might look like:
		 *
		 * ```js
		 * {_id: 5, name: "do the dishes"}
		 * ```
		 *
		 * In this case, [can-connect/base/base.algebra]'s `id` comparator should be set to
		 * "_id" like:
		 *
		 * ```js
		 * var algebra = new set.Algebra({
		 *   set.comparators.id("_id")
	 	 * });
		 * connect([...],{algebra: algebra});
		 * ```
		 *
		 * However,
		 * some data sources have compound ids.  For example, "Class Assignment"
		 * connection might be represented by two properties, the `studentId` and the
		 * `classId`.  For this kind of setup, you can provide your own id function as
		 * follows:
		 *
		 * ```js
		 * var classAssignmentConnection = connect(['data-url'],{
		 *   url: "/class_assignments",
		 *   id: function(classAssignment){
		 *     return classAssignment.studentId+"-"+classAssignment.classId;
		 *   }
		 * });
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
		 * @deprecated {0.5.3} Instead of specifying the idProp it should be
		 * set on the algebra passed to the connection.
		 *
		 * Specifies the property that uniquely identifies an instance.
		 *
		 * @option {String} The name of the property that uniquely identifies
		 * an instance.  Defaults to `"id"`.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * connect([
		 *   require("can-connect/data/url/url")
		 * ],{
		 *   idProp: "_id"
		 * });
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
		 *   Returns the [can-connect/base/base.listSetProp] if it exists.
		 *
		 *   @param {can-connect.List} list A list instance.
		 *
		 *   @return {Object} An object that can be passed to `JSON.stringify`
		 *   to represent the list.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * Many extensions, such as the [can-connect/constructor/store/store], need
		 * to have a unique identifier for a list.  The
		 * `connection.listSet` method should return that.
		 *
		 * Typically, an item's `set` is an expando property added to
		 * a list.  For example, a list of todos might looks like todos
		 * after the following has run:
		 *
		 * ```
		 * var todos = [{_id: 5, name: "do the dishes"}]
		 * todos.set = {due: 'today'};
		 * ```
		 *
		 * In this case [can-connect/base/base.listSetProp] should be set to `"set"`.
		 *
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
		 * @option {can-set.Algebra} A set algebra that is used by
		 * many behaviors to compare the `set` objects passed to
		 * [can-connect/connection.getListData] and [can-connect/connection.getList]. By
		 * default no algebra is provided.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * ```
		 * var algebra = new set.Algebra(set.props.range("start","end"));
		 *
		 * connect([...behavior names...],{
		 *   algebra: algebra
		 * });
		 * ```
		 */
		/**
		 * @property {can-connect/DataInterface} can-connect/base/base.cacheConnection cacheConnection
		 * @parent can-connect/base/base
		 *
		 * A connection used for caching.
		 *
		 * @option {can-connect/DataInterface} A connection that can be used for
		 * [can-connect/DataInterface] requests. Several behaviors
		 * look for this property.
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
		 * connect([...behavior names...],{
		 *   cacheConnection: cacheConnection
		 * });
		 * ```
		 */
	};
});
