/*can-connect@0.6.0-pre.18#constructor/callbacks-once/callbacks-once*/
var connect = require('../../can-connect.js');
var sortedSetJSON = require('../../helpers/sorted-set-json.js');
var forEach = [].forEach;
var callbacks = [
    'createdInstance',
    'updatedInstance',
    'destroyedInstance'
];
module.exports = connect.behavior('constructor/callbacks-once', function (baseConnect) {
    var behavior = {};
    forEach.call(callbacks, function (name) {
        behavior[name] = function (instance, data) {
            var lastSerialized = this.getInstanceMetaData(instance, 'last-data');
            var serialize = sortedSetJSON(data), serialized = sortedSetJSON(this.serializeInstance(instance));
            if (lastSerialized !== serialize && serialized !== serialize) {
                var result = baseConnect[name].apply(this, arguments);
                this.addInstanceMetaData(instance, 'last-data', serialize);
                return result;
            }
        };
    });
    return behavior;
});
//# sourceMappingURL=callbacks-once.js.map