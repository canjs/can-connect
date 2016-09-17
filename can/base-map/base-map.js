var connect = require("can-connect");

var constructor = require("../../constructor/");
var canMap = require("../map/");
var canRef = require("../ref/");
var constructorStore = require("../../constructor/store/");
var dataCallbacks = require("../../data/callbacks/");
var callbacksCache = require("../../data/callbacks-cache/");
var dataParse = require("../../data/parse/");
var dataUrl = require("../../data/url/");
var realTime = require("../../real-time/");
var callbacksOnce = require("../../constructor/callbacks-once/");


var $ = require("jquery");

connect.baseMap = function(options){

	var behaviors = [
		constructor,
		canMap,
		canRef,
		constructorStore,
		dataCallbacks,
		dataParse,
		dataUrl,
		realTime,
		callbacksOnce
	];

	// Handles if jQuery isn't provided.
	if($ && $.ajax) {
		options.ajax = $.ajax;
	}
	
	return connect(behaviors,options);
};

module.exports = connect.baseMap;
