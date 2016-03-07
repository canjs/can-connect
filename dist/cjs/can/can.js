/*can-connect@0.3.5#can/can*/
var can = require('can/util/util');
can.isPromise = can.isDeferred = function (obj) {
    return obj && (window.Promise && obj instanceof Promise || can.isFunction(obj.then) && can.isFunction(obj['catch'] || obj.fail));
};
//# sourceMappingURL=can.js.map