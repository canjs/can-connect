/*can-connect@0.5.0-pre.2#can/model/model*/
define(function (require, exports, module) {
    var can = require('can/util'), Map = require('can/map'), List = require('can/list'), connect = require('../../can-connect'), persist = require('../../data/url/url'), constructor = require('../../constructor/constructor'), instanceStore = require('../../constructor/store/store'), parseData = require('../../data/parse/parse');
    require('../can');
    require('when/es6-shim/Promise');
    var callCanReadingOnIdRead = true;
    var getBaseValue = function (prop) {
        if (typeof prop === 'function' && 'base' in prop) {
            return prop.base;
        } else {
            return prop;
        }
    };
    var resolveSingleExport = function (originalPromise) {
        var promise = originalPromise.then(function (first) {
                return first;
            });
        promise.abort = function () {
            originalPromise.abort();
        };
        return promise;
    };
    var mapBehavior = connect.behavior(function (baseConnect) {
            var behavior = {
                    id: function (inst) {
                        if (inst instanceof can.Map) {
                            if (callCanReadingOnIdRead) {
                                can.__observe(inst, inst.constructor.id);
                            }
                            return inst.__get(inst.constructor.id);
                        } else {
                            return inst[this.constructor.id];
                        }
                    },
                    listSet: function () {
                        return undefined;
                    },
                    idProp: baseConnect.constructor.id,
                    serializeInstance: function (instance) {
                        return instance.serialize();
                    },
                    findAll: function (params, success, error) {
                        var promise = resolveSingleExport(baseConnect.getList.call(this, params));
                        promise.then(success, error);
                        return promise;
                    },
                    findOne: function (params, success, error) {
                        var promise = resolveSingleExport(baseConnect.get.call(this, params));
                        promise.then(success, error);
                        return promise;
                    },
                    parseInstanceData: function (props) {
                        if (typeof this.parseModel === 'function') {
                            return this.parseModel.apply(this.constructor, arguments);
                        } else {
                            return baseConnect.parseInstanceData.apply(baseConnect, arguments);
                        }
                    },
                    parseListData: function (props) {
                        if (typeof this.parseModels === 'function') {
                            return this.parseModels.apply(this.constructor, arguments);
                        } else {
                            return baseConnect.parseListData.apply(baseConnect, arguments);
                        }
                    }
                };
            can.each([
                'created',
                'updated',
                'destroyed'
            ], function (funcName) {
                behavior[funcName + 'Instance'] = function (instance, attrs) {
                    var constructor = instance.constructor;
                    if (attrs && typeof attrs === 'object') {
                        instance.attr(can.isFunction(attrs.attr) ? attrs.attr() : attrs, this.constructor.removeAttr || false);
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
    can.Model = can.Map.extend({
        setup: function (base, fullName, staticProps, protoProps) {
            if (typeof fullName !== 'string') {
                protoProps = staticProps;
                staticProps = fullName;
            }
            if (!protoProps) {
                protoProps = staticProps;
            }
            this.store = {};
            can.Map.setup.apply(this, arguments);
            if (!can.Model) {
                return;
            }
            if (staticProps && staticProps.List) {
                this.List = staticProps.List;
                this.List.Map = this;
            } else {
                this.List = base.List.extend({ Map: this }, {});
            }
            var self = this;
            var staticMethods = [
                    'findAll',
                    'findOne',
                    'create',
                    'update',
                    'destroy'
                ];
            var parseMethods = {
                    parseModel: 'parseInstanceData',
                    parseModels: 'parseListData'
                };
            var connectionOptions = {
                    url: {
                        getListData: getBaseValue(this.findAll),
                        getData: getBaseValue(this.findOne),
                        createData: getBaseValue(this.create),
                        updateData: getBaseValue(this.update),
                        destroyData: getBaseValue(this.destroy),
                        resource: this.resource
                    },
                    idProp: this.id,
                    parseInstanceProp: typeof getBaseValue(this.parseModel) === 'string' ? getBaseValue(this.parseModel) : undefined,
                    parseListProp: typeof getBaseValue(this.parseModels) === 'string' ? getBaseValue(this.parseModels) : undefined,
                    instance: function (values) {
                        return new self(values);
                    },
                    list: function (listData) {
                        var list = new self.List(listData.data);
                        can.each(listData, function (val, prop) {
                            if (prop !== 'data') {
                                list.attr(prop, val);
                            }
                        });
                        return list;
                    },
                    constructor: this,
                    parseModel: getBaseValue(this.parseModel),
                    parseModels: getBaseValue(this.parseModels),
                    ajax: function () {
                        var promiseLike = $.ajax.apply($, arguments);
                        return new Promise(function (resolve, reject) {
                            promiseLike.then(resolve, reject);
                        });
                    }
                };
            this.connection = mapBehavior(instanceStore(constructor(parseData(persist(connectionOptions)))));
            this.store = this.connection.instanceStore;
            can.each(staticMethods, function (name) {
                if (self.connection[name]) {
                    var fn = can.proxy(self.connection[name], self.connection);
                    fn.base = self[name];
                    can.Construct._overwrite(self, base, name, fn);
                }
            });
            can.each(parseMethods, function (connectionName, name) {
                var fn = can.proxy(self.connection[connectionName], self.connection);
                fn.base = self[name];
                can.Construct._overwrite(self, base, name, fn);
            });
        },
        models: function (raw, oldList) {
            var args = can.makeArray(arguments);
            args[0] = this.connection.parseListData.apply(this.connection, arguments);
            var list = this.connection.hydrateList.apply(this.connection, args);
            if (oldList instanceof can.List) {
                return oldList.replace(list);
            } else {
                return list;
            }
        },
        model: function (raw) {
            var args = can.makeArray(arguments);
            args[0] = this.connection.parseInstanceData.apply(this.connection, arguments);
            var instance = this.connection.hydrateInstance.apply(this.connection, arguments);
            return instance;
        }
    }, {
        isNew: function () {
            var id = this.constructor.connection.id(this);
            return !(id || id === 0);
        },
        save: function (success, error) {
            var promise = resolveSingleExport(this.constructor.connection.save(this));
            promise.then(success, error);
            return promise;
        },
        destroy: function (success, error) {
            var promise;
            if (this.isNew()) {
                promise = can.Deferred().resolve(this);
                this.constructor.connection.destroyedInstance(this, {});
            } else {
                promise = this.constructor.connection.destroy(this);
            }
            promise.then(success, error);
            return promise;
        },
        _bindsetup: function () {
            callCanReadingOnIdRead = false;
            this.constructor.connection.addInstanceReference(this);
            callCanReadingOnIdRead = true;
            return can.Map.prototype._bindsetup.apply(this, arguments);
        },
        _bindteardown: function () {
            callCanReadingOnIdRead = false;
            this.constructor.connection.deleteInstanceReference(this);
            callCanReadingOnIdRead = true;
            return can.Map.prototype._bindteardown.apply(this, arguments);
        },
        ___set: function (prop, val) {
            can.Map.prototype.___set.call(this, prop, val);
            if (prop === this.constructor.id && this._bindings) {
                this.constructor.connection.addInstanceReference(this);
            }
        }
    });
    var ML = can.Model.List = can.List.extend({
            _bubbleRule: function (eventName, list) {
                var bubbleRules = can.List._bubbleRule(eventName, list);
                bubbleRules.push('destroyed');
                return bubbleRules;
            }
        }, {
            setup: function (params) {
                if (can.isPlainObject(params) && !can.isArray(params)) {
                    can.List.prototype.setup.apply(this);
                    this.replace(can.isDeferred(params) ? params : this.constructor.Map.findAll(params));
                } else {
                    can.List.prototype.setup.apply(this, arguments);
                }
                this._init = 1;
                this.bind('destroyed', can.proxy(this._destroyed, this));
                delete this._init;
            },
            _destroyed: function (ev, attr) {
                if (/\w+/.test(attr)) {
                    var index;
                    while ((index = this.indexOf(ev.target)) > -1) {
                        this.splice(index, 1);
                    }
                }
            }
        });
    module.exports = can.Model;
});
//# sourceMappingURL=model.js.map