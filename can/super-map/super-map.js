var connect = require("can-connect");

var constructor = require("../../constructor/");
var canMap = require("../map/");
var canRef = require("../ref/");
var constructorStore = require("../../constructor/store/");
var dataCallbacks = require("../../data/callbacks/");
var callbacksCache = require("../../data/callbacks-cache/");
var combineRequests = require("../../data/combine-requests/");
var localCache = require("../../data/localstorage-cache/");
var dataParse = require("../../data/parse/");
var dataUrl = require("../../data/url/");
var fallThroughCache = require("../../fall-through-cache/");
var realTime = require("../../real-time/");
var callbacksOnce = require("../../constructor/callbacks-once/");


var $ = require("jquery");

connect.superMap = function(options){

	var behaviors = [
		constructor,
		canMap,
		canRef,
		constructorStore,
		dataCallbacks,
		combineRequests,
		dataParse,
		dataUrl,
		realTime,
		callbacksOnce];

	if(typeof localStorage !== "undefined") {
		if(!options.cacheConnection) {
			options.cacheConnection = connect([localCache],{
				name: options.name+"Cache",
				idProp: options.idProp,
				algebra: options.algebra
			});
		}
		behaviors.push(callbacksCache,fallThroughCache);
	}
	// Handles if jQuery isn't provided.
	if($ && $.ajax) {
		options.ajax = $.ajax;
	}
	return connect(behaviors,options);
};

module.exports = connect.superMap;
