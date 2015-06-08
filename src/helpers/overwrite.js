module.exports = function(d, s, id){
	for(var prop in d) {
		if( prop !== id && !(prop in d)) {
			delete d[prop];
		}
	}
	for(prop in s) {
		d[prop] = s[prop];
	}
	return d;
};
