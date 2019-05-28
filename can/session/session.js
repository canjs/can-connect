"use strict";

var connect = require("../../connect");
var singleton = require('can-define-singleton');
var reflect = require("can-reflect");

module.exports = connect.behavior("can/session", function(higherBehaviors) {
	return {
		init: function() {
			higherBehaviors.init.apply(this, arguments);

			singleton(this.Map);
		},
		get: function() {
			return higherBehaviors.get(reflect.serialize(this.sessionParams));
		}
	};
});
