var isArray = require("can-connect/helpers/").isArray;
/**
 * @module {connect.Behavior} can-connect/data-url data-url
 * @parent can-connect.behaviors
 * @group can-connect/data-url.data-methods Data Methods
 * @group can-connect/data-url.option Options
 *
 * @option {connect.Behavior}
 *
 * Uses the [can-connect/data-url.url] option to implement the behavior of
 * [connection.getListData],
 * [connection.getData],
 * [connection.createData],
 * [connection.updateData], and
 * [connection.destroyData] to make an AJAX request
 * to urls.
 *
 * @body
 *
 * ## Use
 *
 * The `data-url` behavior implements many of the `data interface`
 * methods to send instance data to a URL.
 *
 * For example, the following `todoConnection`:
 *
 * ```js
 * var todoConnection = can.connect(["data-url"],{
 *   url: {
 *     getListData: "GET /todos",
 *     getData: "GET /todos/{id}",
 *     createData: "POST /todos",
 *     updateData: "PUT /todos/{id}",
 *     destroyData: "DELETE /todos/{id}"
 *   }
 * });
 * ```
 *
 * Will make the following request when the following
 * methods are called:
 *
 * ```
 * // GET /todos?due=today
 * todoConnection.getListData({due: "today"});
 *
 * // GET /todos/5
 * todosConnection.getData({id: 5})
 *
 * // POST /todos \
 * // name=take out trash
 * todosConnection.createData({
 *   name: "take out trash"
 * });
 *
 * // PUT /todos/5 \
 * // name=do the dishes
 * todosConnection.updateData({
 *   name: "do the dishes",
 *   id: 5
 * });
 *
 * // DELETE /todos/5
 * todosConnection.destroyData({
 *   id: 5
 * });
 * ```
 *
 * There's a few things to notice:
 *
 * 1. URL values can include simple templates like `{id}`
 *    that replace that part of the URL with values in the data
 *    passed to the method.
 * 2. GET and DELETE request data is put in the URL using [jQuery.param](http://api.jquery.com/jquery.param/).
 * 3. POST and PUT requests put data that is not templated in the URL in POST or PUT body
 *    as form encoded data.
 * 4. If a provided URL doesn't include the method, the following default methods are provided:
 *    - `getListData` - `GET`
 *    - `getData` - `GET`
 *    - `createData` - `POST`
 *    - `updateData` - `PUT`
 *    - `destroyData` - `DELETE`
 *
 * If [connection.url] is provided as a string like:
 *
 * ```js
 * var todoConnection = can.connect(["data-url"],{
 *   url: "/todos"
 * });
 * ```
 *
 * This does the same thing as the first `todoConnection` example.
 */
var connect = require("can-connect");
var helpers = require("can-connect/helpers/");
var ajax = require("can-connect/helpers/ajax");

// # can-connect/data-url
// For each pair, create a function that checks the url object
// and creates an ajax request.
module.exports = connect.behavior("data-url",function(baseConnect){


	var behavior = {};
	helpers.each(pairs, function(reqOptions, name){
		behavior[name] = function(params){

			if(typeof this.url === "object") {

				if(typeof this.url[reqOptions.prop] === "function"){
					return this.url[reqOptions.prop](params);
				}
				else if(this.url[reqOptions.prop]) {
					return makeAjax(this.url[reqOptions.prop], params, reqOptions.type, this.ajax || ajax);
				}
			}
			var resource = typeof this.url === "string" ? this.url : this.url.resource;
			if( resource && this.idProp ) {

				return makeAjax( createURLFromResource(resource, this.idProp , reqOptions.prop ),  params, reqOptions.type, this.ajax || ajax  );
			}

			return baseConnect[name].call(this, params);

		};
	});

	return behavior;
});
/**
 * @property {String|Object} can-connect/data-url.url url
 * @parent can-connect/data-url.option
 *
 * Specify the url and methods that should be used for the "Data Methods".
 *
 * @option {String} If a string is provided, it's assumed to be a RESTful interface. For example,
 * if the following is provided:
 *
 * ```
 * url: "/services/todos"
 * ```
 *
 * ... the following methods and requests are used:
 *
 *  - `getListData` - `GET /services/todos`
 *  - `getData` - `GET /services/todos/{id}`
 *  - `createData` - `POST /services/todos`
 *  - `updateData` - `PUT /services/todos/{id}`
 *  - `destroyData` - `DELETE /services/todos/{id}`
 *
 * @option {Object} If an object is provided, it can customize each method and URL directly
 * like:
 *
 * ```
 * url: {
 *   getListData: "GET /services/todos",
 *   getData: "GET /services/todo/{id}",
 *   createData: "POST /services/todo",
 *   updateData: "PUT /services/todo/{id}",
 *   destroyData: "DELETE /services/todo/{id}"
 * }
 * ```
 *
 * You can provide a `resource` property that works like providing `url` as a string, but overwrite
 * other values like:
 *
 * ```
 * url: {
 *   resource: "/services/todo",
 *   getListData: "GET /services/todos"
 * }
 * ```
 */

// ## pairs
// The functions that will be created mapped to an object with:
// - prop - the property to look for in connection.url for a url
// - type - the default http method if one is not provided in the url
var pairs = {
	/**
	 * @function can-connect/data-url.getListData getListData
	 * @parent can-connect/data-url.data-methods
	 */
	getListData: {prop: "getListData", type: "GET"},
	/**
	 * @function can-connect/data-url.getData getData
	 * @parent can-connect/data-url.data-methods
	 */
	getData: {prop: "getData", type: "GET"},
	/**
	 * @function can-connect/data-url.createData createData
	 * @parent can-connect/data-url.data-methods
	 */
	createData: {prop: "createData", type: "POST"},
	/**
	 * @function can-connect/data-url.updateData updateData
	 * @parent can-connect/data-url.data-methods
	 */
	updateData: {prop: "updateData", type: "PUT"},
	/**
	 * @function can-connect/data-url.destroyData destroyData
	 * @parent can-connect/data-url.data-methods
	 */
	destroyData: {prop: "destroyData", type: "DELETE"}
};

var makeAjax = function ( ajaxOb, data, type, ajax ) {

	var params = {};

	// A string here would be something like `"GET /endpoint"`.
	if (typeof ajaxOb === 'string') {
		// Split on spaces to separate the HTTP method and the URL.
		var parts = ajaxOb.split(/\s+/);
		params.url = parts.pop();
		if (parts.length) {
			params.type = parts.pop();
		}
	} else {
		// If the first argument is an object, just load it into `params`.
		helpers.extend(params, ajaxOb);
	}

	// If the `data` argument is a plain object, copy it into `params`.
	params.data = typeof data === "object" && !isArray(data) ?
		helpers.extend(params.data || {}, data) : data;

	// Substitute in data for any templated parts of the URL.
	params.url = helpers.sub(params.url, params.data, true);
	return ajax(helpers.extend({
		type: type || 'post',
		dataType: 'json'
	}, params));
};

var createURLFromResource = function(resource, idProp, name) {

	var url = resource.replace(/\/+$/, "");
	if (name === "getListData" || name === "createData") {
		return url;
	} else {
		return url + "/{" + idProp + "}";
	}
};



