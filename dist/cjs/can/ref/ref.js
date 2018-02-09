/*can-connect@1.5.17#can/ref/ref*/
var connect = require('../../can-connect.js');
var getIdProps = require('../../helpers/get-id-props.js');
var WeakReferenceMap = require('../../helpers/weak-reference-map.js');
var Observation = require('can-observation');
var constructorStore = require('../../constructor/store/store.js');
var define = require('can-define');
var makeRef = function (connection) {
    var idProp = getIdProps(connection)[0];
    var Ref = function (id, value) {
        if (typeof id === 'object') {
            value = id;
            id = value[idProp];
        }
        var storeRef = Ref.store.get(id);
        if (storeRef) {
            if (value && !storeRef._value) {
                if (value instanceof connection.Map) {
                    storeRef._value = value;
                } else {
                    storeRef._value = connection.hydrateInstance(value);
                }
            }
            return storeRef;
        }
        this[idProp] = id;
        if (value) {
            if (value instanceof connection.Map) {
                this._value = value;
            } else {
                this._value = connection.hydrateInstance(value);
            }
        }
        if (constructorStore.requests.count() > 0) {
            if (!Ref._requestInstances[id]) {
                Ref.store.addReference(id, this);
                Ref._requestInstances[id] = this;
            }
        }
    };
    Ref.store = new WeakReferenceMap();
    Ref._requestInstances = {};
    Ref.type = function (ref) {
        if (ref && typeof ref !== 'object') {
            return new Ref(ref);
        } else {
            return new Ref(ref[idProp], ref);
        }
    };
    var defs = {
        promise: {
            get: function () {
                if (this._value) {
                    return Promise.resolve(this._value);
                } else {
                    var props = {};
                    props[idProp] = this[idProp];
                    return connection.Map.get(props);
                }
            }
        },
        _state: {
            get: function (lastSet, resolve) {
                if (resolve) {
                    this.promise.then(function () {
                        resolve('resolved');
                    }, function () {
                        resolve('rejected');
                    });
                }
                return 'pending';
            }
        },
        value: {
            get: function (lastSet, resolve) {
                if (this._value) {
                    return this._value;
                } else if (resolve) {
                    this.promise.then(function (value) {
                        resolve(value);
                    });
                }
            }
        },
        reason: {
            get: function (lastSet, resolve) {
                if (this._value) {
                    return undefined;
                } else {
                    this.promise.catch(function (value) {
                        resolve(value);
                    });
                }
            }
        }
    };
    defs[idProp] = {
        type: '*',
        set: function () {
            this._value = undefined;
        }
    };
    define(Ref.prototype, defs);
    Ref.prototype.unobservedId = Observation.ignore(function () {
        return this[idProp];
    });
    Ref.prototype.isResolved = function () {
        return !!this._value || this._state === 'resolved';
    };
    Ref.prototype.isRejected = function () {
        return this._state === 'rejected';
    };
    Ref.prototype.isPending = function () {
        return !this._value && (this._state !== 'resolved' || this._state !== 'rejected');
    };
    Ref.prototype.serialize = function () {
        return this[idProp];
    };
    var baseEventSetup = Ref.prototype._eventSetup;
    Ref.prototype._eventSetup = function () {
        Ref.store.addReference(this.unobservedId(), this);
        return baseEventSetup.apply(this, arguments);
    };
    var baseTeardown = Ref.prototype._eventTeardown;
    Ref.prototype._eventTeardown = function () {
        Ref.store.deleteReference(this.unobservedId(), this);
        return baseTeardown.apply(this, arguments);
    };
    constructorStore.requests.on('end', function () {
        for (var id in Ref._requestInstances) {
            Ref.store.deleteReference(id);
        }
        Ref._requestInstances = {};
    });
    return Ref;
};
module.exports = connect.behavior('can/ref', function (baseConnection) {
    return {
        init: function () {
            baseConnection.init.apply(this, arguments);
            this.Map.Ref = makeRef(this);
        }
    };
});
//# sourceMappingURL=ref.js.map