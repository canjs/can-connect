var connect = require("./can-connect");
var can = require('can/util/util');
require('can/compute/compute');
require('can/view/bindings/bindings');
var mustacheCore = require( "can/view/stache/mustache_core");


/**
 * Makes a findAll
 * @param {Object} tagName
 * @param {Object} connection
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
		
		
		var attrInfo = mustacheCore.expressionData('tmp ' + removeBrackets(el.getAttribute("findAll")));
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
			return connection.findAll(hash);
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


		