var isArray = require("can-util/js/is-array/is-array");
var deepAssign = require("can-util/js/deep-assign/deep-assign");

module.exports = function(data) {
	return isArray(data) ? data.slice(0) : deepAssign({}, data);
};
