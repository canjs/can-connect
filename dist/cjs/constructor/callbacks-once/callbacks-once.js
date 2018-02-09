/*can-connect@1.5.17#constructor/callbacks-once/callbacks-once*/
var connect = require('../../can-connect.js');
var sortedSetJSON = require('../../helpers/sorted-set-json.js');
var forEach = [].forEach;
var callbacks = [
    'createdInstance',
    'updatedInstance',
    'destroyedInstance'
];
var callbacksOnceBehavior = connect.behavior('constructor/callbacks-once', function (baseConnection) {
    var behavior = {};
    forEach.call(callbacks, function (name) {
        behavior[name] = function (instance, data) {
            var lastSerialized = this.getInstanceMetaData(instance, 'last-data-' + name);
            var serialize = sortedSetJSON(data);
            if (lastSerialized !== serialize) {
                var result = baseConnection[name].apply(this, arguments);
                this.addInstanceMetaData(instance, 'last-data-' + name, serialize);
                return result;
            }
        };
    });
    return behavior;
});
module.exports = callbacksOnceBehavior;
//# sourceMappingURL=callbacks-once.js.map