/**
 * @module can-connect/can/tag can/tag
 * @parent can-connect.modules
 * 
 * Makes either getList or getInstance
 * @param {String} tagName
 * @param {Object} connection
 * 
 * ```
 * connect.tag("order-model", connection);
 * ```
 * 
 * ```
 * <order-model getList="{type=orderType}">
 *   {{#isPending}}Loading{{/isPending}}
 *   {{#isResolved}}
 *     Data: {{value}}
 *   {{/isResolved}}
 * </order-model>
 * ```
 * 
 */
var connect = require("can-connect");

var can = require('can/util/util');
require('can/compute/compute');
require('can/view/bindings/bindings');
require("../can");
var mustacheCore = require( "can/view/stache/mustache_core");

connect.tag = function(tagName, connection){
	
	var removeBrackets = function(value, open, close){
		open = open || "{";
		close = close || "}";

		if(value[0] === open && value[value.length-1] === close) {
			return value.substr(1, value.length - 2);
		}
		return value;
	};


	can.view.tag(tagName, function(el, tagData){
		var getList = el.getAttribute("getList") || el.getAttribute("get-list");
		var getInstance = el.getAttribute("get");
		
		var attrValue = getList || getInstance;
		var method = getList ? "getList" : "get";
		
		
		var attrInfo = mustacheCore.expressionData('tmp ' + removeBrackets(attrValue));
		// -> {hash: {foo: 'bar', zed: 5, abc: {get: 'myValue'}}}
	
		
		var addedToPageData = false;
		var addToPageData = can.__notObserve(function(set, promise){
			if(!addedToPageData) {
				var root = tagData.scope.attr("@root");
				if( root && root.pageData ) {
					if(method === "get"){
						set = connection.id(set);
					}
					root.pageData(connection.name, set, promise);
				} 
			}
			addedToPageData = true;
		});
	
		var request = can.compute(function(){
			
			var hash = {};
			can.each(attrInfo.hash, function(val, key) {
				if (val && val.hasOwnProperty("get")) {
					hash[key] = tagData.scope.read(val.get, {}).value;
				} else {
					hash[key] = val;
				}
			});
			var promise = connection[method](hash);
			addToPageData(hash, promise);
			return promise;
		});
		
		can.data(can.$(el), "viewModel", request);
		
		var nodeList = can.view.nodeLists.register([], undefined, true);
		
		var frag = tagData.subtemplate ?
					tagData.subtemplate( tagData.scope.add(request), tagData.options, nodeList ) :
					document.createDocumentFragment();

		// Append the resulting document fragment to the element
		can.appendChild(el, frag);
		
		// update the nodeList with the new children so the mapping gets applied
		can.view.nodeLists.update(nodeList, el.childNodes);
		
		// add to pageData
		
		can.one.call(el, 'removed', function() {
			can.view.nodeLists.unregister(nodeList);
		});
	});
};

module.exports = connect.tag;


		