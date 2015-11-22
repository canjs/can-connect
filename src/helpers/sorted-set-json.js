var helpers = require("./helpers");
var forEach = helpers.forEach;
var keys = helpers.keys;

module.exports = function(set){
	var sorted = {};
    if(typeof set !== 'undefined' && set !== null) {
        forEach.call(keys(set).sort(), function (prop) {
            sorted[prop] = set[prop];
        });

    }
    return JSON.stringify(sorted);
};
