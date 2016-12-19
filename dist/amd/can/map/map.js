/*can-connect@1.0.18#can/map/map*/
define(function (require, exports, module) {
    'use strict';
    var each = require('can-util/js/each');
    var connect = require('../../can-connect');
    var canBatch = require('can-event/batch');
    var canEvent = require('can-event');
    var Observation = require('can-observation');
    var isPlainObject = require('can-util/js/is-plain-object');
    var isArray = require('can-util/js/is-array');
    var types = require('can-types');
    var each = require('can-util/js/each');
    var isFunction = require('can-util/js/is-function');
    var dev = require('can-util/js/dev');
    var setExpando = function (map, prop, value) {
        if ('attr' in map) {
            map[prop] = value;
        } else {
            map._data[prop] = value;
        }
    };
    var getExpando = function (map, prop) {
        if ('attr' in map) {
            return map[prop];
        } else {
            return map._data[prop];
        }
    };
    module.exports = connect.behavior('can/map', function (baseConnection) {
        var behavior = {
            init: function () {
                this.Map = this.Map || types.DefaultMap.extend({});
                this.List = this.List || types.DefaultList.extend({});
                overwrite(this, this.Map, mapOverwrites, mapStaticOverwrites);
                overwrite(this, this.List, listPrototypeOverwrites, listStaticOverwrites);
                baseConnection.init.apply(this, arguments);
            },
            id: function (instance) {
                if (!isPlainObject(instance)) {
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
                    return baseConnection.id(instance);
                }
            },
            serializeInstance: function (instance) {
                return instance.serialize();
            },
            serializeList: function (list) {
                return list.serialize();
            },
            instance: function (props) {
                var _Map = this.Map || types.DefaultMap;
                return new _Map(props);
            },
            list: function (listData, set) {
                var _List = this.List || this.Map && this.Map.List || types.DefaultList;
                var list = new _List(listData.data);
                each(listData, function (val, prop) {
                    if (prop !== 'data') {
                        list[list.set ? 'set' : 'attr'](prop, val);
                    }
                });
                list.__listSet = set;
                return list;
            },
            updatedList: function () {
                canBatch.start();
                var res = baseConnection.updatedList.apply(this, arguments);
                canBatch.stop();
                return res;
            },
            save: function (instance) {
                setExpando(instance, '_saving', true);
                canEvent.dispatch.call(instance, '_saving', [
                    true,
                    false
                ]);
                var done = function () {
                    setExpando(instance, '_saving', false);
                    canEvent.dispatch.call(instance, '_saving', [
                        false,
                        true
                    ]);
                };
                var base = baseConnection.save.apply(this, arguments);
                base.then(done, done);
                return base;
            },
            destroy: function (instance) {
                setExpando(instance, '_destroying', true);
                canEvent.dispatch.call(instance, '_destroying', [
                    true,
                    false
                ]);
                var done = function () {
                    setExpando(instance, '_destroying', false);
                    canEvent.dispatch.call(instance, '_destroying', [
                        false,
                        true
                    ]);
                };
                var base = baseConnection.destroy.apply(this, arguments);
                base.then(done, done);
                return base;
            }
        };
        each([
            'created',
            'updated',
            'destroyed'
        ], function (funcName) {
            behavior[funcName + 'Instance'] = function (instance, props) {
                var constructor = instance.constructor;
                if (props && typeof props === 'object') {
                    if ('set' in instance) {
                        instance.set(isFunction(props.get) ? props.get() : props, this.constructor.removeAttr || false);
                    } else if ('attr' in instance) {
                        instance.attr(isFunction(props.attr) ? props.attr() : props, this.constructor.removeAttr || false);
                    } else {
                        canBatch.start();
                        each(props, function (value, prop) {
                            instance[prop] = value;
                        });
                        canBatch.stop();
                    }
                }
                canEvent.dispatch.call(instance, {
                    type: funcName,
                    target: instance
                });
                canEvent.dispatch.call(constructor, funcName, [instance]);
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
        _eventSetup: function (base, connection) {
            return function () {
                callCanReadingOnIdRead = false;
                connection.addInstanceReference(this);
                callCanReadingOnIdRead = true;
                return base.apply(this, arguments);
            };
        },
        _eventTeardown: function (base, connection) {
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
                Observation.add(this, '_saving');
                return !!getExpando(this, '_saving');
            };
        },
        isDestroying: function (base, connection) {
            return function () {
                Observation.add(this, '_destroying');
                return !!getExpando(this, '_destroying');
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
                if (isPlainObject(params) && !isArray(params)) {
                    this.__listSet = params;
                    base.apply(this);
                    this.replace(types.isPromise(params) ? params : connection.getList(params));
                } else {
                    base.apply(this, arguments);
                }
            };
        },
        _eventSetup: function (base, connection) {
            return function () {
                connection.addListReference(this);
                if (base) {
                    return base.apply(this, arguments);
                }
            };
        },
        _eventTeardown: function (base, connection) {
            return function () {
                connection.deleteListReference(this);
                if (base) {
                    return base.apply(this, arguments);
                }
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
        if ('__get' in instance) {
            if (callCanReadingOnIdRead) {
                Observation.add(instance, prop);
            }
            return instance.__get(prop);
        } else {
            if (callCanReadingOnIdRead) {
                return instance[prop];
            } else {
                return Observation.ignore(function () {
                    return instance[prop];
                })();
            }
        }
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
});
//# sourceMappingURL=map.js.map