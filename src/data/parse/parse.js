var isArray = require("can-connect/helpers/").isArray;

/**
 * @module {connect.Behavior} can-connect/data-parse data-parse
 * @parent can-connect.behaviors
 *
 * Extract response data into a format needed for other extensions.
 *
 * @signature `dataParse(baseConnection)`
 *
 *   Adds the data parse connection behavior to another connection.
 *
 *   @param {{}} baseConnection
 *
 * @body
 *
 * ## Use
 *
 * `data-parse` is used to modify the response data of "data interface" methods to comply with what
 * is expected by "instance interface" methods.  For example, if a service was returning list data
 * at the `/services/todos` url like:
 *
 * ```
 * {
 *   todos: [
 *     {todo: {id: 0, name: "dishes"}},
 *     {todo: {id: 2, name: "lawn"}}
 *   ]
 * }
 * ```
 *
 * That service does not return [can-connect.listData] in the right format which should look like:
 *
 * ```
 * {
 *   data: [
 *     {id: 0, name: "dishes"},
 *     {id: 2, name: "lawn"}
 *   ]
 * }
 * ```
 *
 * To correct this, you can configure `data-parse` to use the [connection.parseListProp] and [connection.parseInstanceProp]
 * as follows:
 *
 * ```
 * connect(["data-parse","data-url"],{
 *  parseListProp: "todos",
 *  parseInstanceProp: "todo"
 * })
 * ```
 *
 */
var connect = require("can-connect");
var helpers = require("can-connect/helpers/");


module.exports = connect.behavior("data-parse",function(baseConnect){

	var behavior = {
		/**
		 * @function connection.parseListData parseListData
		 * @parent can-connect/data-parse
		 *
		 * @description Given the response of [connection.getListData] returns it in the
		 * [can-connect.listData] format.
		 *
		 * @signature `connection.parseListData(responseData, xhr, headers)`
		 *
		 *   This function will use [connection.parseListProp] to find the array like data
		 *   for each instance to be created.  It will then use [connection.parseInstanceData]
		 *   on each item in the array like data.  Finally, it will return data in the
		 *   [can-connect.listData] format.
		 *
		 *   @param {Object} responseData The response data from the AJAX request
		 *
		 *   @return {can-connect.listData} An object like `{data: [props, props, ...]}`
		 */
		parseListData: function( responseData ) {

			// call any base parseListData
			if(baseConnect.parseListData) {
			   responseData = baseConnect.parseListData.apply(this, arguments);
			}

			var result;
			if( isArray(responseData) ) {
				result = {data: responseData};
			} else {
				var prop = this.parseListProp || 'data';

				responseData.data = helpers.getObject(prop, responseData);
				result = responseData;
				if(prop !== "data") {
					delete responseData[prop];
				}
				if(!isArray(result.data)) {
					throw new Error('Could not get any raw data while converting using .parseListData');
				}

			}
			var arr = [];
			for(var i =0 ; i < result.data.length; i++) {
				arr.push( this.parseInstanceData(result.data[i]) );
			}
			result.data = arr;
			return result;
		},
		/**
		 * @function connection.parseInstanceData parseInstanceData
		 * @parent can-connect/data-parse
		 *
		 * @description Returns the properties that should be used to [connection.hydrateInstance make an instance]
		 * given the results of [connection.getData], [connection.createData], [connection.updateData],
		 * and [connection.destroyData].
		 *
		 * @param {Object} responseData
		 * @return {Object} The data that should be passed to [connection.hydrateInstance].
		 */
		parseInstanceData: function( props ) {
			// call any base parseInstanceData
			if(baseConnect.parseInstanceData) {
				// It's possible this might be looking for a property that only exists in some
				// responses. So if it doesn't return anything, go back to using props.
			   props = baseConnect.parseInstanceData.apply(this, arguments) || props;
			}
			return this.parseInstanceProp ? helpers.getObject(this.parseInstanceProp, props) || props : props;
		}
		/**
		 * @property {String} connection.parseListProp parseListProp
		 * @parent can-connect/data-parse
		 *
		 * The property to find the array-like data that represents each instance item.
		 *
		 * @option {String} [connection.parseListData] uses this property to find an array-like data struture
		 * on the result of [connection.getListData].
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * Set `parseListProp` if your response data does not look like: `{data: [props, props]}`.
		 *
		 * For example, if [connection.getListData] returns data like:
		 *
		 * ```
		 * {
		 * 	  todos: [{id: 1, name: "dishes"}, {id: 2, name: "lawn"}]
		 * }
		 * ```
		 *
		 * Set `parseListProp` to `"todos"` like:
		 *
		 * ```
		 * can.connect(["data-parse","data-url"],{
		 *   url : "/todos",
		 *   parseListProp: "todos"
		 * });
		 * ```
		 *
		 */
		/**
		 * @property {String} connection.parseInstanceProp parseInstanceProp
		 * @parent can-connect/data-parse
		 *
		 * The property to find the data that represents an instance item.
		 *
		 * @option {String} [connection.parseInstanceData] uses this property's value to
		 * [connection.hydrateInstance make an instance].
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * Set `parseInstanceData` if your response data does not directly contain the data you would like to pass to
		 * [connection.hydrateInstance].
		 *
		 * For example, if [connection.getData] returns data like:
		 *
		 * ```
		 * {
		 *   todo: {
		 * 	   id: 1,
		 *     name: "dishes"
		 *   }
		 * }
		 * ```
		 *
		 * Set `parseInstanceProp` to `"todo"` like:
		 *
		 * ```
		 * can.connect(["data-parse","data-url"],{
		 *   url : "/todos",
		 *   parseInstanceProp: "todo"
		 * });
		 * ```
		 */

	};

	helpers.each(pairs, function(parseFunction, name){
		behavior[name] = function(params){
			var self = this;
			return baseConnect[name].call(this, params).then(function(){
				return self[parseFunction].apply(self, arguments);
			});
		};
	});

	return behavior;

});

var pairs = {
	getListData: "parseListData",
	getData: "parseInstanceData",
	createData: "parseInstanceData",
	updateData: "parseInstanceData",
	destroyData: "parseInstanceData"
};
