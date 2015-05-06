var connect = require("./can-connect");
var can = require('can/util/util');
require('can/compute/compute');
require('can/view/bindings/bindings');
var mustacheCore = require( "can/view/stache/mustache_core");


/**
 * Makes either findAll or findOne
 * @param {String} tagName
 * @param {Object} connection
 * 
 * ```
 * connect.tag("order-model", connection);
 * ```
 * 
 * ```
 * <order-model findAll="{type=orderType}">
 *   {{#isPending}}Loading{{/isPending}}
 *   {{#isResolved}}
 *     Data: {{value}}
 *   {{/isResolved}}
 * </order-model>
 * ```
 * 
 */
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
		var findAll = el.getAttribute("findAll") || el.getAttribute("find-all");
		var findOne = el.getAttribute("findOne") || el.getAttribute("find-one");
		
		var attrValue = findAll || findOne;
		var method = findAll ? "findAll" : "findOne";
		
		
		var attrInfo = mustacheCore.expressionData('tmp ' + removeBrackets(attrValue));
		// -> {hash: {foo: 'bar', zed: 5, abc: {get: 'myValue'}}}

		var request = can.compute(function(){
			
			var hash = {};
			can.each(attrInfo.hash, function(val, key) {
				if (val && val.hasOwnProperty("get")) {
					hash[key] = tagData.scope.read(val.get, {}).value;
				} else {
					hash[key] = val;
				}
			});
			return connection[method](hash);
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
		
		
		can.one.call(el, 'removed', function() {
			can.view.nodeLists.unregister(nodeList);
		});
	});
};

module.exports = connect.tag;


		