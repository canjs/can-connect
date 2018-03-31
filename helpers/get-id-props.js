module.exports = function(connection) {
	if(connection.algebra) {
		return connection.algebra.getIdentityKeys();
	} else {
		return ['id'];
	}
};
