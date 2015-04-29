module.exports = function(set){
	var sorted = {};
	Object.keys(set).sort().forEach(function(prop){
		sorted[prop] = set[prop];
	});
	return JSON.stringify(sorted);
};
