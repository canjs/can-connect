var digitTest = /^\d+$/,
	keyBreaker = /([^\[\]]+)|(\[\])/g,
	paramTest = /([^?#]*)(#.*)?$/,
	prep = function (str) {
		return decodeURIComponent(str.replace(/\+/g, ' '));
	};

module.exports = function (params) {
	var data = {}, pairs, lastPart;
	if (params && paramTest.test(params)) {
		pairs = params.split('&');
		var pair;
		for(var i = 0, len = pairs.length; i < len; i++) {
			pair = pairs[i];
			var parts = pair.split('='),
				key = prep(parts.shift()),
				value = prep(parts.join('=')),
				current = data;
			if (key) {
				parts = key.match(keyBreaker);
				for (var j = 0, l = parts.length - 1; j < l; j++) {
					if (!current[parts[j]]) {
						// If what we are pointing to looks like an `array`
						current[parts[j]] = digitTest.test(parts[j + 1]) || parts[j + 1] === '[]' ? [] : {};
					}
					current = current[parts[j]];
				}
				lastPart = parts.pop();
				if (lastPart === '[]') {
					current.push(value);
				} else {
					current[lastPart] = value;
				}
			}
		}
	}
	return data;
};
