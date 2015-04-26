var can = require("can/util/util");

module.exports = function (def, thisArg, func) {
	// The piped result will be available through a new Deferred.
	var d = new can.Deferred();
	def.then(function () {
		var args = can.makeArray(arguments),
			success = true;

		try {
			// Pipe the results through the function.
			args[0] = func.apply(thisArg, args);
		} catch (e) {
			success = false;
			// The function threw an error, so reject the Deferred.
			d.rejectWith(d, [e].concat(args));
		}
		if (success) {
			// Resolve the new Deferred with the piped value.
			d.resolveWith(d, args);
		}
	}, function () {
		// Pass on the rejection if the original Deferred never resolved.
		d.rejectWith(this, arguments);
	});

	// `can.ajax` returns a Deferred with an abort method to halt the AJAX call.
	if (typeof def.abort === 'function') {
		d.abort = function () {
			return def.abort();
		};
	}

	// Return the new (piped) Deferred.
	return d;
};