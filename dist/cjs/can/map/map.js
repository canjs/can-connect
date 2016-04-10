/*can-connect@0.5.3#can/map/map*/
require('when/es6-shim/Promise');
require('../can.js');
var can = require('can/util/util');
var connect = require('../../can-connect.js');
var List = require('can/list/list');
var Map = require('can/map/map');
module.exports = connect.behavior('can-map', function (baseConnect) {
    var behavior = {
        init: function () {
            this.Map = this.Map || Map.extend({});
            this.List = this.List || List.extend({});
            overwrite(this, this.Map, mapOverwrites, mapStaticOverwrites);
            overwrite(this, this.List, listPrototypeOverwrites, listStaticOverwrites);
            baseConnect.init.apply(this, arguments);
        },
        id: function (instance) {
            if (instance instanceof can.Map) {
                var ids = [], algebra = this.algebra;
                if (algebra && algebra.clauses && algebra.clauses.id) {
                    for (var prop in algebra.clauses.id) {
                        ids.push(readObservabe(instance, prop));
                    }
                }
                if (this.idProp && !ids.length) {
                    ids.push(readObservabe(instance, this.idProp));
                }
                if (!ids.length) {
                    ids.push(readObservabe(instance, 'id'));
                }
                return ids.length > 1 ? ids.join('@|@') : ids[0];
            } else {
                return baseConnect.id(instance);
            }
        },
        serializeInstance: function (instance) {
            return instance.serialize();
        },
        serializeList: function (list) {
            return list.serialize();
        },
        instance: function (props) {
            var _Map = this.Map || Map;
            return new _Map(props);
        },
        list: function (listData, set) {
            var _List = this.List || this.Map && this.Map.List || List;
            var list = new _List(listData.data);
            can.each(listData, function (val, prop) {
                if (prop !== 'data') {
                    list.attr(prop, val);
                }
            });
            list.__listSet = set;
            return list;
        },
        updatedList: function () {
            can.batch.start();
            var res = baseConnect.updatedList.apply(this, arguments);
            can.batch.stop();
            return res;
        },
        save: function (instance) {
            instance._saving = true;
            can.batch.trigger(instance, '_saving', [
                true,
                false
            ]);
            var done = function () {
                instance._saving = false;
                can.batch.trigger(instance, '_saving', [
                    false,
                    true
                ]);
            };
            var base = baseConnect.save.apply(this, arguments);
            base.then(done, done);
            return base;
        },
        destroy: function (instance) {
            instance._destroying = true;
            can.batch.trigger(instance, '_destroying', [
                true,
                false
            ]);
            var done = function () {
                instance._destroying = false;
                can.batch.trigger(instance, '_destroying', [
                    false,
                    true
                ]);
            };
            var base = baseConnect.destroy.apply(this, arguments);
            base.then(done, done);
            return base;
        }
    };
    can.each([
        'created',
        'updated',
        'destroyed'
    ], function (funcName) {
        behavior[funcName + 'Instance'] = function (instance, props) {
            var constructor = instance.constructor;
            if (props && typeof props === 'object') {
                instance.attr(can.isFunction(props.attr) ? props.attr() : props, this.constructor.removeAttr || false);
            }
            can.dispatch.call(instance, {
                type: funcName,
                target: instance
            });
            can.dispatch.call(constructor, funcName, [instance]);
        };
    });
    return behavior;
});
var callCanReadingOnIdRead = true;
var mapStaticOverwrites = {
    getList: function (base, connection) {
        return function (set) {
            return connection.getList(set);
        };
    },
    findAll: function (base, connection) {
        return function (set) {
            return connection.getList(set);
        };
    },
    get: function (base, connection) {
        return function (params) {
            return connection.get(params);
        };
    },
    findOne: function (base, connection) {
        return function (params) {
            return connection.get(params);
        };
    }
};
var mapOverwrites = {
    _bindsetup: function (base, connection) {
        return function () {
            callCanReadingOnIdRead = false;
            connection.addInstanceReference(this);
            callCanReadingOnIdRead = true;
            return base.apply(this, arguments);
        };
    },
    _bindteardown: function (base, connection) {
        return function () {
            callCanReadingOnIdRead = false;
            connection.deleteInstanceReference(this);
            callCanReadingOnIdRead = true;
            return base.apply(this, arguments);
        };
    },
    ___set: function (base, connection) {
        return function (prop, val) {
            base.apply(this, arguments);
            if (prop === connection.idProp && this._bindings) {
                connection.addInstanceReference(this);
            }
        };
    },
    isNew: function (base, connection) {
        return function () {
            var id = connection.id(this);
            return !(id || id === 0);
        };
    },
    isSaving: function (base, connection) {
        return function () {
            can.__observe(this, '_saving');
            return !!this._saving;
        };
    },
    isDestroying: function (base, connection) {
        return function () {
            can.__observe(this, '_destroying');
            return !!this._destroying;
        };
    },
    save: function (base, connection) {
        return function (success, error) {
            var promise = connection.save(this);
            promise.then(success, error);
            return promise;
        };
    },
    destroy: function (base, connection) {
        return function (success, error) {
            var promise;
            if (this.isNew()) {
                promise = Promise.resolve(this);
                connection.destroyedInstance(this, {});
            } else {
                promise = connection.destroy(this);
            }
            promise.then(success, error);
            return promise;
        };
    }
};
var listPrototypeOverwrites = {
    setup: function (base, connection) {
        return function (params) {
            if (can.isPlainObject(params) && !can.isArray(params)) {
                this.__listSet = params;
                base.apply(this);
                this.replace(can.isDeferred(params) ? params : connection.getList(params));
            } else {
                base.apply(this, arguments);
            }
            this._init = 1;
            this.bind('destroyed', can.proxy(this._destroyed, this));
            delete this._init;
        };
    },
    _destroyed: function () {
        return function (ev, attr) {
            if (/\w+/.test(attr)) {
                var index;
                while ((index = this.indexOf(ev.target)) > -1) {
                    this.splice(index, 1);
                }
            }
        };
    },
    _bindsetup: function (base, connection) {
        return function () {
            connection.addListReference(this);
            return base.apply(this, arguments);
        };
    },
    _bindteardown: function (base, connection) {
        return function () {
            connection.deleteListReference(this);
            return base.apply(this, arguments);
        };
    }
};
var listStaticOverwrites = {
    _bubbleRule: function (base, connection) {
        return function (eventName, list) {
            var bubbleRules = base(eventName, list);
            bubbleRules.push('destroyed');
            return bubbleRules;
        };
    }
};
var readObservabe = function (instance, prop) {
    if (callCanReadingOnIdRead) {
        can.__observe(instance, prop);
    }
    return instance.__get(prop);
};
var overwrite = function (connection, Constructor, prototype, statics) {
    var prop;
    for (prop in prototype) {
        Constructor.prototype[prop] = prototype[prop](Constructor.prototype[prop], connection);
    }
    if (statics) {
        for (prop in statics) {
            Constructor[prop] = statics[prop](Constructor[prop], connection);
        }
    }
};
//# sourceMappingURL=map.js.map