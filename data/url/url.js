/**
 * @module {connect.Behavior} can-connect/data/url/url
 * @parent can-connect.behaviors
 * @group can-connect/data/url/url.data-methods data methods
 * @group can-connect/data/url/url.option options
 *
 * @option {connect.Behavior}
 *
 * Uses the [can-connect/data/url/url.url] option to implement the behavior of
 * [can-connect/connection.getListData],
 * [can-connect/connection.getData],
 * [can-connect/connection.createData],
 * [can-connect/connection.updateData], and
 * [can-connect/connection.destroyData] to make an AJAX request
 * to urls.
 *
 * @body
 *
 * ## Use
 *
 * The `data/url` behavior implements many of the [can-connect/DataInterface]
 * methods to send instance data to a URL.
 *
 * For example, the following `todoConnection`:
 *
 * ```js
 * var todoConnection = connect([
 *   require("can-connect/data/url/url")
 * ],{
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
 * 2. GET and DELETE request data is put in the URL using [can-util/js/param/param].
 * 3. POST and PUT requests put data that is not templated in the URL in POST or PUT body
 *    as JSON-encoded data.  To use form-encoded requests instead, add the property
 *    `contentType:'application/x-www-form-urlencoded'` to your [can-connect/data/url/url.url].
 * 4. If a provided URL doesn't include the method, the following default methods are provided:
 *    - `getListData` - `GET`
 *    - `getData` - `GET`
 *    - `createData` - `POST`
 *    - `updateData` - `PUT`
 *    - `destroyData` - `DELETE`
 *
 * If [can-connect/data/url/url.url] is provided as a string like:
 *
 * ```js
 * var todoConnection = connect([
 *   require("can-connect/data/url/url")
 * ],{
 *   url: "/todos"
 * });
 * ```
 *
 * This does the same thing as the first `todoConnection` example.
 */
var isArray = require("can-util/js/is-array/is-array");
var assign = require("can-util/js/assign/assign");
var each = require("can-util/js/each/each");
var ajax = require("can-util/dom/ajax/ajax");
var string = require("can-util/js/string/string");
var getIdProps = require("../../helpers/get-id-props");
var dev = require("can-util/js/dev/dev");
var connect = require("can-connect");

var makePromise = require("can-util/js/make-promise/make-promise");

// # can-connect/data/url/url
// For each pair, create a function that checks the url object
// and creates an ajax request.
module.exports = connect.behavior("data/url", function(baseConnection) {


	var behavior = {};
	each(pairs, function(reqOptions, name) {
		behavior[name] = function(params) {

			if(typeof this.url === "object") {
				if(typeof this.url[reqOptions.prop] === "function") {

					return makePromise(this.url[reqOptions.prop](params));
				}
				else if(this.url[reqOptions.prop]) {
					return makePromise(makeAjax(this.url[reqOptions.prop], params, reqOptions.type, this.ajax || ajax, findContentType(this.url), reqOptions));
				}
			}

			var resource = typeof this.url === "string" ? this.url : this.url.resource;
			if( resource ) {
				var idProps = getIdProps(this);
				return makePromise(makeAjax( createURLFromResource(resource, idProps[0] ,
					reqOptions.prop ),
					params, reqOptions.type,
					this.ajax || ajax,
					findContentType(this.url),
					reqOptions));
			}

			return baseConnection[name].call(this, params);
		};
	});

	return behavior;
});
/**
 * @property {String|Object} can-connect/data/url/url.url url
 * @parent can-connect/data/url/url.option
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
 *
 * Finally, you can provide your own method to totally control how the request is made:
 *
 * ```
 * url: {
 *   resource: "/services/todo",
 *   getListData: "GET /services/todos",
 *   getData: function(param){
 *     return new Promise(function(resolve, reject){
 *       $.get("/services/todo", {identifier: param.id}).then(resolve, reject);
 *     });
 *   }
 * }
 * ```
 */


 /**
  * @property {function} can-connect/data/url/url.ajax ajax
  * @parent can-connect/data/url/url.option
  *
  * Specify the ajax functionality that should be used to make the request.
  *
  * @option {function} Provides an alternate function to be used to make
  * ajax requests.  By default [can-util/dom/ajax/ajax] provides the ajax
  * functionality. jQuery's ajax method can be substituted as follows:
  *
  * ```js
  * connect([
  *   require("can-connect/data/url/url")
  * ],{
  *   url: "/things",
  *   ajax: $.ajax
  * });
  * ```
  *
  *   @param {Object} settings Configuration options for the AJAX request.
  *   @return {Promise} A Promise that resolves to the data.
  */

// ## pairs
// The functions that will be created mapped to an object with:
// - prop - the property to look for in connection.url for a url
// - type - the default http method if one is not provided in the url
var pairs = {
	/**
	 * @function can-connect/data/url/url.getListData getListData
	 * @parent can-connect/data/url/url.data-methods
	 *
	 * @signature `getListData(set)`
	 *
	 *   Retrieves list data for a particular set given the [can-connect/data/url/url.url] settings.
	 *   If `url.getListData` is a function, that function will be called.  If `url.getListData` is a
	 *   string, a request to that string will be made. If `url` is a string, a `GET` request is made to
	 *   `url`.
	 *
	 *   @param {can-set/Set} set A object that represents the set of data needed to be loaded.
	 *   @return {Promise<can-connect.listData>} A promise that resolves to the ListData format.
	 */
	getListData: {prop: "getListData", type: "GET"},
	/**
	 * @function can-connect/data/url/url.getData getData
	 * @parent can-connect/data/url/url.data-methods
	 *
	 * @signature `getData(params)`
	 *
	 *   Retrieves raw instance data given the [can-connect/data/url/url.url] settings.
	 *   If `url.getData` is a function, that function will be called.  If `url.getData` is a
	 *   string, a request to that string will be made. If `url` is a string, a `GET` request is made to
	 *   `url+"/"+IDPROP`.
	 *
	 *   @param {Object} params A object that represents the set of data needed to be loaded.
	 *   @return {Promise<Object>} A promise that resolves to the instance data.
	 */
	getData: {prop: "getData", type: "GET"},
	/**
	 * @function can-connect/data/url/url.createData createData
	 * @parent can-connect/data/url/url.data-methods
	 *
	 * @signature `createData(instanceData, cid)`
	 *
	 *   Creates instance data given the serialized form of the data and
	 *   the [can-connect/data/url/url.url] settings.
	 *   If `url.createData` is a function, that function will be called.  If `url.createData` is a
	 *   string, a request to that string will be made. If `url` is a string, a `POST` request is made to
	 *   `url`.
	 *
	 *   @param {Object} instanceData The serialized data of the instance.
	 *   @param {Number} cid A unique id that represents the instance that is being created.
	 *   @return {Promise<Object>} A promise that resolves to the newly created instance data.
	 */
	createData: {prop: "createData", type: "POST"},
	/**
	 * @function can-connect/data/url/url.updateData updateData
	 * @parent can-connect/data/url/url.data-methods
	 *
	 * @signature `updateData(instanceData)`
	 *
	 * Updates instance data given the serialized form of the data and
	 *   the [can-connect/data/url/url.url] settings.
	 *   If `url.updateData` is a function, that function will be called.  If `url.updateData` is a
	 *   string, a request to that string will be made. If `url` is a string, a `PUT` request is made to
	 *   `url+"/"+IDPROP`.
	 *
	 *   @param {Object} instanceData The serialized data of the instance.
	 *   @return {Promise<Object>} A promise that resolves to the updated instance data.
	 */
	updateData: {prop: "updateData", type: "PUT"},
	/**
	 * @function can-connect/data/url/url.destroyData destroyData
	 * @parent can-connect/data/url/url.data-methods
	 *
	 * @signature `destroyData(instanceData)`
	 *
	 * Deletes instance data given the serialized form of the data and
	 *   the [can-connect/data/url/url.url] settings.
	 *   If `url.destroyData` is a function, that function will be called.  If `url.destroyData` is a
	 *   string, a request to that string will be made. If `url` is a string, a `DELETE` request is made to
	 *   `url+"/"+IDPROP`.
	 *
	 *   @param {Object} instanceData The serialized data of the instance.
	 *   @return {Promise<Object>} A promise that resolves to the deleted instance data.
	 */
	destroyData: {prop: "destroyData", type: "DELETE", includeData: false}
};

var findContentType = function( url ) {
	if ( typeof url === 'object' && url.contentType ) {
		var acceptableType = url.contentType === 'application/x-www-form-urlencoded' ||
			url.contentType === 'application/json';
		if ( acceptableType ) {
			return url.contentType;
		} else {
			//!steal-remove-start
			dev.warn("Unacceptable contentType on can-connect request. " +
				"Use 'application/json' or 'application/x-www-form-urlencoded'");
			//!steal-remove-end
		}
	}
	return 'application/json';
};

var makeAjax = function ( ajaxOb, data, type, ajax, contentType, reqOptions ) {

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
		assign(params, ajaxOb);
	}

	// If the `data` argument is a plain object, copy it into `params`.
	params.data = typeof data === "object" && !isArray(data) ?
		assign(params.data || {}, data) : data;

	// Substitute in data for any templated parts of the URL.
	params.url = string.sub(params.url, params.data, true);

	// Default to JSON encoding, if contentType is not form-urlencoded
	var encodeJSON = contentType !== 'application/x-www-form-urlencoded' &&
		(type && (type === 'POST' || type === 'PUT'));
	if (encodeJSON) {
		params.data = JSON.stringify(params.data);
		params.contentType = contentType;
	}

	if(reqOptions.includeData === false) {
		delete params.data;
	}

	return ajax(assign({
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
