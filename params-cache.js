
// options controlling how long it will be cached for
can.connect.paramsCache = {
	instanceFindAll: function(findAllData){
		var cachedRequests = {};
		return function( params ) {
			var key = lib.sortedParamsKey(params);
			// is this not cached?
			if(! cachedRequests[key] ) {
				var self = this;
				// make the request for data, save deferred
				cachedRequests[key] = findAllData(params);
			}
			// get the saved request
			var def = cachedRequests[key];
			return def;
		};
	}
};

can.connect.yqlCache = {
	
}
