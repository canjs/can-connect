// return wrapped can-connect behavior mixin that validates interface of the input behavior being extended
// deprecate this and use can-validate-interface decorator once available

var makeInterfaceValidator = require('can-validate-interface');

module.exports = function(extendingBehavior, interfaces){
	var validatedBehaviour;

	// return unwrapped function in production
	//!steal-remove-start
	validatedBehaviour = validateArgumentInterface(extendingBehavior, 0, interfaces, function(errors, baseBehavior) {
		throw new BehaviorInterfaceError(baseBehavior, extendingBehavior, errors);
	});

	// copy properties on behavior to validator wrapped behavior
	Object.keys(extendingBehavior).forEach(function (k) {
		validatedBehaviour[k] = extendingBehavior[k];
	});
	// add interfaces for building behavior ordering
	validatedBehaviour.__interfaces = interfaces;
	//!steal-remove-end

	return validatedBehaviour || extendingBehavior;
};

function validateArgumentInterface(func, argIndex, interfaces, errorHandler) {
	return function() {
		var errors = makeInterfaceValidator(interfaces)(arguments[argIndex]);
		if (errors && errorHandler) {
			errorHandler(errors, arguments[argIndex]);
		}

		return func.apply(this, arguments);
	}
}

// change to 'BehaviourInterfaceError extends Error' once we drop support for pre-ES2015
function BehaviorInterfaceError(baseBehavior, extendingBehavior, missingProps) {
	var extendingName = extendingBehavior.behaviorName || 'anonymous behavior',
		baseName = baseBehavior.__behaviorName || 'anonymous behavior',
		message = 'can-connect: Extending behaviour "' + extendingName + '" found base behaviour "' + baseName
			+ '" was missing required properties: ' + JSON.stringify(missingProps.related);

	Object.defineProperty(this, 'name', {
		enumerable: false,
		writable: false,
		value: 'BehaviorInterfaceError'
	});

	Object.defineProperty(this, 'message', {
		enumerable: false,
		writable: true,
		value: message
	});

	Object.defineProperty(this, 'stack', {
		enumerable: false,
		writable: false,
		value: (new Error(message)).stack
	});
}

if (typeof Object.setPrototypeOf === 'function') {
	Object.setPrototypeOf(BehaviorInterfaceError.prototype, Error.prototype);
} else {
	BehaviorInterfaceError.prototype = Object.create(Error.prototype, {
		constructor: { value: BehaviorInterfaceError }
	});
}