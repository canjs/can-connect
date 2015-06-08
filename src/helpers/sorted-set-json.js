module.exports = function(set){
	if(set == null) {
		return set
	} else {
		var sorted = {};
		Object.keys(set).sort().forEach(function(prop){
			sorted[prop] = set[prop];
		});
		return JSON.stringify(sorted);
	}
	
};
