var can = require("can/util/util");

// Overwrite promise so it works right.
can.isPromise = can.isDeferred = function(obj){
  return obj && (
     ( window.Promise && (obj instanceof Promise) ) ||
     ( can.isFunction(obj.then) && can.isFunction( obj["catch"] || obj.fail ) )
  );
};
