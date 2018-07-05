"use strict";
var deepAssign = require("can-util/js/deep-assign/deep-assign");

module.exports = function(data) {
	return Array.isArray(data) ? data.slice(0) : deepAssign({}, data);
};
