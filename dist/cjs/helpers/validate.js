/*can-connect@1.3.11#helpers/validate*/
var makeInterfaceValidator = require('can-validate-interface');
module.exports = function (extendingBehavior, interfaces) {
    var validatedBehaviour = validateArgumentInterface(extendingBehavior, 0, interfaces, function (errors, baseBehavior) {
        throw new BehaviorInterfaceError(baseBehavior, extendingBehavior, errors);
    });
    Object.keys(extendingBehavior).forEach(function (k) {
        validatedBehaviour[k] = extendingBehavior[k];
    });
    validatedBehaviour.__interfaces = interfaces;
    return validatedBehaviour;
};
function validateArgumentInterface(func, argIndex, interfaces, errorHandler) {
    return function () {
        var errors = makeInterfaceValidator(interfaces)(arguments[argIndex]);
        if (errors && errorHandler) {
            errorHandler(errors, arguments[argIndex]);
        }
        return func.apply(this, arguments);
    };
}
function BehaviorInterfaceError(baseBehavior, extendingBehavior, missingProps) {
    var extendingName = extendingBehavior.behaviorName || 'anonymous behavior', baseName = baseBehavior.__behaviorName || 'anonymous behavior', message = 'can-connect: Extending behavior "' + extendingName + '" found base behavior "' + baseName + '" was missing required properties: ' + JSON.stringify(missingProps.related);
    this.name = 'BehaviorInterfaceError';
    this.message = message;
    this.stack = new Error().stack;
}
BehaviorInterfaceError.prototype = Object.create(Error.prototype);
BehaviorInterfaceError.prototype.constructor = BehaviorInterfaceError;
//# sourceMappingURL=validate.js.map