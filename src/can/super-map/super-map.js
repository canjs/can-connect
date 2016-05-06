var connect = require("can-connect");

require("../../constructor/");
require("../map/");
require("../../constructor/store/");
require("../../constructor/callbacks-once/");
require("../../data/callbacks/");
require("../../data/callbacks-cache/");
require("../../data/combine-requests/");
require("../../data/inline-cache/");
require("../../data/localstorage-cache/");
require("../../data/parse/");
require("../../data/url/");
require("../../fall-through-cache/");
require("../../real-time/");

var $ = require("jquery");

connect.superMap = function(options){

	var behaviors = [
		"constructor",
		"can-map",
		"constructor-store",
		"data-callbacks",
		"data-combine-requests",
		"data-inline-cache",
		"data-parse",
		"data-url",
		"real-time",
		"constructor-callbacks-once"];

	if(typeof localStorage !== "undefined") {
		if(!options.cacheConnection) {
			options.cacheConnection = connect(["data-localstorage-cache"],{
				name: options.name+"Cache",
				idProp: options.idProp,
				algebra: options.algebra
			});
		}
		behaviors.push("data-callbacks-cache","fall-through-cache");
	}
	options.ajax = $.ajax;

	return connect(behaviors,options);
};

module.exports = connect.superMap;
