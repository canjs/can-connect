/*[global-shim-start]*/
(function (exports, global){
	var origDefine = global.define;

	var get = function(name){
		var parts = name.split("."),
			cur = global,
			i;
		for(i = 0 ; i < parts.length; i++){
			if(!cur) {
				break;
			}
			cur = cur[parts[i]];
		}
		return cur;
	};
	var modules = (global.define && global.define.modules) ||
		(global._define && global._define.modules) || {};
	var ourDefine = global.define = function(moduleName, deps, callback){
		var module;
		if(typeof deps === "function") {
			callback = deps;
			deps = [];
		}
		var args = [],
			i;
		for(i =0; i < deps.length; i++) {
			args.push( exports[deps[i]] ? get(exports[deps[i]]) : ( modules[deps[i]] || get(deps[i]) )  );
		}
		// CJS has no dependencies but 3 callback arguments
		if(!deps.length && callback.length) {
			module = { exports: {} };
			var require = function(name) {
				return exports[name] ? get(exports[name]) : modules[name];
			};
			args.push(require, module.exports, module);
		}
		// Babel uses the exports and module object.
		else if(!args[0] && deps[0] === "exports") {
			module = { exports: {} };
			args[0] = module.exports;
			if(deps[1] === "module") {
				args[1] = module;
			}
		}

		global.define = origDefine;
		var result = callback ? callback.apply(null, args) : undefined;
		global.define = ourDefine;

		// Favor CJS module.exports over the return value
		modules[moduleName] = module && module.exports ? module.exports : result;
	};
	global.define.orig = origDefine;
	global.define.modules = modules;
	global.define.amd = true;
	global.System = {
		define: function(__name, __code){
			global.define = origDefine;
			eval("(function() { " + __code + " \n }).call(global);");
			global.define = ourDefine;
		},
		orig: global.System
	};
})({},window)
/*can-connect@0.2.7#helpers/helpers*/
define('can-connect/helpers/helpers', function (require, exports, module) {
    require('when/es6-shim/Promise');
    var strReplacer = /\{([^\}]+)\}/g, isContainer = function (current) {
            return /^f|^o/.test(typeof current);
        };
    var helpers;
    module.exports = helpers = {
        extend: function (d, s) {
            for (var name in s) {
                d[name] = s[name];
            }
            return d;
        },
        deferred: function () {
            var def = {};
            def.promise = new Promise(function (resolve, reject) {
                def.resolve = resolve;
                def.reject = reject;
            });
            return def;
        },
        each: function (obj, cb) {
            for (var prop in obj) {
                cb(obj[prop], prop);
            }
            return obj;
        },
        getObject: function (prop, data, remove) {
            var res = data[prop];
            if (remove) {
                delete data[prop];
            }
            return res;
        },
        sub: function (str, data, remove) {
            var obs = [];
            str = str || '';
            obs.push(str.replace(strReplacer, function (whole, inside) {
                var ob = helpers.getObject(inside, data, remove);
                if (ob === undefined || ob === null) {
                    obs = null;
                    return '';
                }
                if (isContainer(ob) && obs) {
                    obs.push(ob);
                    return '';
                }
                return '' + ob;
            }));
            return obs === null ? obs : obs.length <= 1 ? obs[0] : obs;
        }
    };
});
/*can-connect@0.2.7#can-connect*/
define('can-connect', function (require, exports, module) {
    var helpers = require('can-connect/helpers/helpers');
    var connect = function (behaviors, options) {
        behaviors = behaviors.map(function (behavior, index) {
            var sortedIndex;
            if (typeof behavior === 'string') {
                sortedIndex = connect.order.indexOf(behavior);
                behavior = behaviorsMap[behavior];
            } else if (behavior.isBehavior) {
            } else {
                behavior = connect.behavior(behavior);
            }
            return {
                originalIndex: index,
                sortedIndex: sortedIndex,
                behavior: behavior
            };
        }).sort(function (b1, b2) {
            if (b1.sortedIndex != null && b2.sortedIndex != null) {
                return b1.sortedIndex - b2.sortedIndex;
            }
            return b1.originalIndex - b2.originalIndex;
        }).map(function (b) {
            return b.behavior;
        });
        var behavior = core(connect.behavior('options', function () {
                return options;
            })());
        behaviors.forEach(function (behave) {
            behavior = behave(behavior);
        });
        if (behavior.init) {
            behavior.init();
        }
        return behavior;
    };
    connect.order = [
        'data-localstorage-cache',
        'data-url',
        'data-parse',
        'cache-requests',
        'data-combine-requests',
        'constructor',
        'constructor-store',
        'can-map',
        'fall-through-cache',
        'data-inline-cache',
        'data-worker',
        'data-callbacks-cache',
        'data-callbacks',
        'constructor-callbacks-once'
    ];
    connect.behavior = function (name, behavior) {
        if (typeof name !== 'string') {
            behavior = name;
            name = undefined;
        }
        var behaviorMixin = function (base) {
            var Behavior = function () {
            };
            Behavior.name = name;
            Behavior.prototype = base;
            var newBehavior = new Behavior();
            var res = typeof behavior === 'function' ? behavior.apply(newBehavior, arguments) : behavior;
            helpers.extend(newBehavior, res);
            newBehavior.__behaviorName = name;
            return newBehavior;
        };
        if (name) {
            behaviorMixin.name = name;
            behaviorsMap[name] = behaviorMixin;
        }
        behaviorMixin.isBehavior = true;
        return behaviorMixin;
    };
    var behaviorsMap = {};
    var core = connect.behavior('base', function (base) {
            return {
                id: function (instance) {
                    return instance[this.idProp || 'id'];
                },
                idProp: base.idProp || 'id',
                listSet: function (list) {
                    return list[this.listSetProp];
                },
                listSetProp: '__listSet',
                init: function () {
                }
            };
        });
    connect.base = core;
    module.exports = connect;
});
/*can-connect@0.2.7#helpers/get-items*/
define('can-connect/helpers/get-items', function (require, exports, module) {
    module.exports = function (data) {
        if (Array.isArray(data)) {
            return data;
        } else {
            return data.data;
        }
    };
});
/*can-connect@0.2.7#cache-requests/cache-requests*/
define('can-connect/cache-requests/cache-requests', function (require, exports, module) {
    var connect = require('can-connect');
    require('when/es6-shim/Promise');
    var getItems = require('can-connect/helpers/get-items');
    var canSet = require('can-set');
    module.exports = connect.behavior('cache-requests', function (base) {
        return {
            getDiff: function (params, availableSets) {
                var minSets, self = this;
                availableSets.forEach(function (set) {
                    var curSets;
                    var difference = canSet.difference(params, set, self.algebra);
                    if (typeof difference === 'object') {
                        curSets = {
                            needed: difference,
                            cached: canSet.intersection(params, set, self.algebra),
                            count: canSet.count(difference, self.algebra)
                        };
                    } else if (canSet.subset(params, set, self.algebra)) {
                        curSets = {
                            cached: params,
                            count: 0
                        };
                    }
                    if (curSets) {
                        if (!minSets || curSets.count < minSets.count) {
                            minSets = curSets;
                        }
                    }
                });
                if (!minSets) {
                    return { needed: params };
                } else {
                    return {
                        needed: minSets.needed,
                        cached: minSets.cached
                    };
                }
            },
            getUnion: function (params, diff, neededItems, cachedItems) {
                return { data: canSet.getUnion(diff.needed, diff.cached, getItems(neededItems), getItems(cachedItems), this.algebra) };
            },
            getListData: function (set) {
                var self = this;
                return this.cacheConnection.getSets(set).then(function (sets) {
                    var diff = self.getDiff(set, sets);
                    if (!diff.needed) {
                        return self.cacheConnection.getListData(diff.cached);
                    } else if (!diff.cached) {
                        return base.getListData(diff.needed).then(function (data) {
                            return self.cacheConnection.updateListData(getItems(data), diff.needed).then(function () {
                                return data;
                            });
                        });
                    } else {
                        var cachedPromise = self.cacheConnection.getListData(diff.cached);
                        var needsPromise = base.getListData(diff.needed);
                        var savedPromise = needsPromise.then(function (data) {
                                return self.cacheConnection.updateListData(getItems(data), diff.needed).then(function () {
                                    return data;
                                });
                            });
                        var combinedPromise = Promise.all([
                                cachedPromise,
                                needsPromise
                            ]).then(function (result) {
                                var cached = result[0], needed = result[1];
                                return self.getUnion(set, diff, needed, cached);
                            });
                        return Promise.all([
                            combinedPromise,
                            savedPromise
                        ]).then(function (data) {
                            return data[0];
                        });
                    }
                });
            }
        };
    });
});
/*can-connect@0.2.7#can/can*/
define('can-connect/can/can', function (require, exports, module) {
    var can = require('can/util/util');
    can.isPromise = can.isDeferred = function (obj) {
        return obj && (window.Promise && obj instanceof Promise || can.isFunction(obj.then) && can.isFunction(obj['catch'] || obj.fail));
    };
});
/*can-connect@0.2.7#can/map/map*/
define('can-connect/can/map/map', function (require, exports, module) {
    require('when/es6-shim/Promise');
    require('can-connect/can/can');
    var can = require('can/util/util');
    var connect = require('can-connect');
    var Map = require('can/map/map');
    var List = require('can/list/list');
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
                    var idProp = this.idProp;
                    if (instance instanceof can.Map) {
                        if (callCanReadingOnIdRead) {
                            can.__observe(instance, idProp);
                        }
                        return instance.__get(idProp);
                    } else {
                        return instance[idProp];
                    }
                },
                serializeInstance: function (instance) {
                    return instance.serialize();
                },
                serializeList: function (list) {
                    return list.serialize();
                },
                instance: function (props) {
                    return new (this.Map || Map)(props);
                },
                list: function (listData, set) {
                    var list = new (this.List || this.Map && this.Map.List || List)(listData.data);
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
    var overwrite = function (connection, Constructor, prototype, statics) {
        for (var prop in prototype) {
            Constructor.prototype[prop] = prototype[prop](Constructor.prototype[prop], connection);
        }
        if (statics) {
            for (var prop in statics) {
                Constructor[prop] = statics[prop](Constructor[prop], connection);
            }
        }
    };
});
/*can-connect@0.2.7#helpers/weak-reference-map*/
define('can-connect/helpers/weak-reference-map', function (require, exports, module) {
    var helpers = require('can-connect/helpers/helpers');
    var WeakReferenceMap = function () {
        this.set = {};
    };
    helpers.extend(WeakReferenceMap.prototype, {
        has: function (key) {
            return !!this.set[key];
        },
        addReference: function (key, item) {
            var data = this.set[key];
            if (!data) {
                data = this.set[key] = {
                    item: item,
                    referenceCount: 0,
                    key: key
                };
            }
            data.referenceCount++;
        },
        deleteReference: function (key) {
            var data = this.set[key];
            if (data) {
                data.referenceCount--;
                if (data.referenceCount === 0) {
                    delete this.set[key];
                }
            }
        },
        get: function (key) {
            var data = this.set[key];
            if (data) {
                return data.item;
            }
        },
        forEach: function (cb) {
            for (var id in this.set) {
                cb(this.set[id].item, id);
            }
        }
    });
    module.exports = WeakReferenceMap;
});
/*can-connect@0.2.7#helpers/overwrite*/
define('can-connect/helpers/overwrite', function (require, exports, module) {
    module.exports = function (d, s, id) {
        for (var prop in d) {
            if (prop !== id && !(prop in s)) {
                delete d[prop];
            }
        }
        for (prop in s) {
            d[prop] = s[prop];
        }
        return d;
    };
});
/*can-connect@0.2.7#helpers/id-merge*/
define('can-connect/helpers/id-merge', function (require, exports, module) {
    module.exports = function (list, update, id, make) {
        var listIndex = 0, updateIndex = 0;
        while (listIndex < list.length && updateIndex < update.length) {
            var listItem = list[listIndex], updateItem = update[updateIndex], lID = id(listItem), uID = id(updateItem);
            if (id(listItem) === id(updateItem)) {
                listIndex++;
                updateIndex++;
                continue;
            }
            if (updateIndex + 1 < update.length && id(update[updateIndex + 1]) === lID) {
                list.splice(listIndex, 0, make(update[updateIndex]));
                listIndex++;
                updateIndex++;
                continue;
            } else if (listIndex + 1 < list.length && id(list[listIndex + 1]) === uID) {
                list.splice(listIndex, 1);
                listIndex++;
                updateIndex++;
                continue;
            } else {
                list.splice.apply(list, [
                    listIndex,
                    list.length - listIndex
                ].concat(update.slice(updateIndex).map(make)));
                return list;
            }
        }
        if (updateIndex === update.length && listIndex === list.length) {
            return;
        }
        list.splice.apply(list, [
            listIndex,
            list.length - listIndex
        ].concat(update.slice(updateIndex).map(make)));
        return;
    };
});
/*can-connect@0.2.7#constructor/constructor*/
define('can-connect/constructor/constructor', function (require, exports, module) {
    var connect = require('can-connect');
    var WeakReferenceMap = require('can-connect/helpers/weak-reference-map');
    var overwrite = require('can-connect/helpers/overwrite');
    var idMerge = require('can-connect/helpers/id-merge');
    var helpers = require('can-connect/helpers/helpers');
    module.exports = connect.behavior('constructor', function (baseConnect) {
        var behavior = {
                cidStore: new WeakReferenceMap(),
                _cid: 0,
                get: function (params) {
                    var self = this;
                    return this.getData(params).then(function (data) {
                        return self.hydrateInstance(data);
                    });
                },
                getList: function (set) {
                    var self = this;
                    return this.getListData(set).then(function (data) {
                        return self.hydrateList(data, set);
                    });
                },
                hydrateList: function (listData, set) {
                    if (Array.isArray(listData)) {
                        listData = { data: listData };
                    }
                    var arr = [];
                    for (var i = 0; i < listData.data.length; i++) {
                        arr.push(this.hydrateInstance(listData.data[i]));
                    }
                    listData.data = arr;
                    if (this.list) {
                        return this.list(listData, set);
                    } else {
                        var list = listData.data.slice(0);
                        list[this.listSetProp || '__listSet'] = set;
                        return list;
                    }
                },
                hydrateInstance: function (props) {
                    if (this.instance) {
                        return this.instance(props);
                    } else {
                        return helpers.extend({}, props);
                    }
                },
                save: function (instance) {
                    var serialized = this.serializeInstance(instance);
                    var id = this.id(instance);
                    var self = this;
                    if (id === undefined) {
                        var cid = this._cid++;
                        this.cidStore.addReference(cid, instance);
                        return this.createData(serialized, cid).then(function (data) {
                            if (data !== undefined) {
                                self.createdInstance(instance, data);
                            }
                            self.cidStore.deleteReference(cid, instance);
                            return instance;
                        });
                    } else {
                        return this.updateData(serialized).then(function (data) {
                            if (data !== undefined) {
                                self.updatedInstance(instance, data);
                            }
                            return instance;
                        });
                    }
                },
                destroy: function (instance) {
                    var serialized = this.serializeInstance(instance), self = this;
                    return this.destroyData(serialized).then(function (data) {
                        if (data !== undefined) {
                            self.destroyedInstance(instance, data);
                        }
                        return instance;
                    });
                },
                createdInstance: function (instance, props) {
                    helpers.extend(instance, props);
                },
                updatedInstance: function (instance, data) {
                    overwrite(instance, data, this.idProp);
                },
                updatedList: function (list, listData, set) {
                    var instanceList = [];
                    for (var i = 0; i < listData.data.length; i++) {
                        instanceList.push(this.hydrateInstance(listData.data[i]));
                    }
                    idMerge(list, instanceList, this.id.bind(this), this.hydrateInstance.bind(this));
                },
                destroyedInstance: function (instance, data) {
                    overwrite(instance, data, this.idProp);
                },
                serializeInstance: function (instance) {
                    return helpers.extend({}, instance);
                },
                serializeList: function (list) {
                    var self = this;
                    return list.map(function (instance) {
                        return self.serializeInstance(instance);
                    });
                },
                isNew: function (instance) {
                    var id = this.id(instance);
                    return !(id || id === 0);
                }
            };
        return behavior;
    });
});
/*can-connect@0.2.7#helpers/sorted-set-json*/
define('can-connect/helpers/sorted-set-json', function (require, exports, module) {
    module.exports = function (set) {
        if (set == null) {
            return set;
        } else {
            var sorted = {};
            Object.keys(set).sort().forEach(function (prop) {
                sorted[prop] = set[prop];
            });
            return JSON.stringify(sorted);
        }
    };
});
/*can-connect@0.2.7#constructor/callbacks-once/callbacks-once*/
define('can-connect/constructor/callbacks-once/callbacks-once', function (require, exports, module) {
    var connect = require('can-connect');
    var sortedSetJSON = require('can-connect/helpers/sorted-set-json');
    var callbacks = [
            'createdInstance',
            'updatedInstance',
            'destroyedInstance'
        ];
    module.exports = connect.behavior('constructor-callbacks-once', function (baseConnect) {
        var behavior = {};
        callbacks.forEach(function (name) {
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
});
/*can-connect@0.2.7#constructor/store/store*/
define('can-connect/constructor/store/store', function (require, exports, module) {
    var connect = require('can-connect');
    var WeakReferenceMap = require('can-connect/helpers/weak-reference-map');
    var sortedSetJSON = require('can-connect/helpers/sorted-set-json');
    module.exports = connect.behavior('constructor-store', function (baseConnect) {
        var behavior = {
                instanceStore: new WeakReferenceMap(),
                listStore: new WeakReferenceMap(),
                _requestInstances: {},
                _requestLists: {},
                _pendingRequests: 0,
                _finishedRequest: function () {
                    this._pendingRequests--;
                    if (this._pendingRequests === 0) {
                        for (var id in this._requestInstances) {
                            this.instanceStore.deleteReference(id);
                        }
                        this._requestInstances = {};
                        for (var id in this._requestLists) {
                            this.listStore.deleteReference(id);
                        }
                        this._requestLists = {};
                    }
                },
                addInstanceReference: function (instance, id) {
                    this.instanceStore.addReference(id || this.id(instance), instance);
                },
                addInstanceMetaData: function (instance, name, value) {
                    var data = this.instanceStore.set[this.id(instance)];
                    if (data) {
                        data[name] = value;
                    }
                },
                getInstanceMetaData: function (instance, name) {
                    var data = this.instanceStore.set[this.id(instance)];
                    if (data) {
                        return data[name];
                    }
                },
                deleteInstanceMetaData: function (instance, name) {
                    var data = this.instanceStore.set[this.id(instance)];
                    delete data[name];
                },
                deleteInstanceReference: function (instance) {
                    this.instanceStore.deleteReference(this.id(instance), instance);
                },
                addListReference: function (list, set) {
                    var id = sortedSetJSON(set || this.listSet(list));
                    if (id) {
                        this.listStore.addReference(id, list);
                    }
                },
                deleteListReference: function (list, set) {
                    var id = sortedSetJSON(set || this.listSet(list));
                    if (id) {
                        this.listStore.deleteReference(id, list);
                    }
                },
                hydratedInstance: function (instance) {
                    if (this._pendingRequests > 0) {
                        var id = this.id(instance);
                        if (!this._requestInstances[id]) {
                            this.addInstanceReference(instance);
                            this._requestInstances[id] = instance;
                        }
                    }
                },
                hydrateInstance: function (props) {
                    var id = this.id(props);
                    if ((id || id === 0) && this.instanceStore.has(id)) {
                        var storeInstance = this.instanceStore.get(id);
                        this.updatedInstance(storeInstance, props);
                        return storeInstance;
                    }
                    var instance = baseConnect.hydrateInstance.call(this, props);
                    this.hydratedInstance(instance);
                    return instance;
                },
                hydratedList: function (list, set) {
                    if (this._pendingRequests > 0) {
                        var id = sortedSetJSON(set || this.listSet(list));
                        if (id) {
                            if (!this._requestLists[id]) {
                                this.addListReference(list, set);
                                this._requestLists[id] = list;
                            }
                        }
                    }
                },
                hydrateList: function (listData, set) {
                    set = set || this.listSet(listData);
                    var id = sortedSetJSON(set);
                    if (id && this.listStore.has(id)) {
                        var storeList = this.listStore.get(id);
                        this.updatedList(storeList, listData, set);
                        return storeList;
                    }
                    var list = baseConnect.hydrateList.call(this, listData, set);
                    this.hydratedList(list, set);
                    return list;
                },
                getList: function (params) {
                    var self = this;
                    self._pendingRequests++;
                    var promise = baseConnect.getList.call(this, params);
                    promise.then(function (instances) {
                        self._finishedRequest();
                    }, function () {
                        self._finishedRequest();
                    });
                    return promise;
                },
                get: function (params) {
                    var self = this;
                    self._pendingRequests++;
                    var promise = baseConnect.get.call(this, params);
                    promise.then(function (instance) {
                        self._finishedRequest();
                    }, function () {
                        self._finishedRequest();
                    });
                    return promise;
                },
                save: function (instance) {
                    var self = this;
                    self._pendingRequests++;
                    var updating = !this.isNew(instance);
                    if (updating) {
                        this.addInstanceReference(instance);
                    }
                    var promise = baseConnect.save.call(this, instance);
                    promise.then(function (instances) {
                        if (updating) {
                            self.deleteInstanceReference(instance);
                        }
                        self._finishedRequest();
                    }, function () {
                        self._finishedRequest();
                    });
                    return promise;
                },
                destroy: function (instance) {
                    var self = this;
                    self._pendingRequests++;
                    var promise = baseConnect.destroy.call(this, instance);
                    promise.then(function (instance) {
                        self._finishedRequest();
                    }, function () {
                        self._finishedRequest();
                    });
                    return promise;
                }
            };
        return behavior;
    });
});
/*can-connect@0.2.7#data/callbacks/callbacks*/
define('can-connect/data/callbacks/callbacks', function (require, exports, module) {
    var connect = require('can-connect');
    var helpers = require('can-connect/helpers/helpers');
    var pairs = {
            getListData: 'gotListData',
            createData: 'createdData',
            updateData: 'updatedData',
            destroyData: 'destroyedData'
        };
    var returnArg = function (item) {
        return item;
    };
    module.exports = connect.behavior('data-callbacks', function (baseConnect) {
        var behavior = {};
        helpers.each(pairs, function (callbackName, name) {
            behavior[name] = function (params, cid) {
                var self = this;
                return baseConnect[name].call(this, params).then(function (data) {
                    if (self[callbackName]) {
                        return self[callbackName].call(self, data, params, cid);
                    } else {
                        return data;
                    }
                });
            };
        });
        return behavior;
    });
});
/*can-connect@0.2.7#data/callbacks-cache/callbacks-cache*/
define('can-connect/data/callbacks-cache/callbacks-cache', function (require, exports, module) {
    var connect = require('can-connect');
    var idMerge = require('can-connect/helpers/id-merge');
    var helpers = require('can-connect/helpers/helpers');
    var pairs = {
            createdData: 'createData',
            updatedData: 'updateData',
            destroyedData: 'destroyData'
        };
    module.exports = connect.behavior('data-callbacks-cache', function (baseConnect) {
        var behavior = {};
        helpers.each(pairs, function (cacheCallback, dataCallbackName) {
            behavior[dataCallbackName] = function (data, set, cid) {
                this.cacheConnection[cacheCallback](helpers.extend({}, data));
                return baseConnect[dataCallbackName].call(this, data, set, cid);
            };
        });
        return behavior;
    });
});
/*can-connect@0.2.7#data/combine-requests/combine-requests*/
define('can-connect/data/combine-requests/combine-requests', function (require, exports, module) {
    var connect = require('can-connect');
    var canSet = require('can-set');
    var getItems = require('can-connect/helpers/get-items');
    module.exports = connect.behavior('data-combine-requests', function (base) {
        var pendingRequests;
        return {
            unionPendingRequests: function (pendingRequests) {
                var self = this;
                pendingRequests.sort(function (pReq1, pReq2) {
                    if (canSet.subset(pReq1.set, pReq2.set, self.algebra)) {
                        return 1;
                    } else if (canSet.subset(pReq2.set, pReq1.set, self.algebra)) {
                        return -1;
                    }
                });
                var combineData = [];
                var current;
                var self = this;
                doubleLoop(pendingRequests, {
                    start: function (pendingRequest) {
                        current = {
                            set: pendingRequest.set,
                            pendingRequests: [pendingRequest]
                        };
                        combineData.push(current);
                    },
                    iterate: function (pendingRequest) {
                        var combined = canSet.union(current.set, pendingRequest.set, self.algebra);
                        if (combined) {
                            current.set = combined;
                            current.pendingRequests.push(pendingRequest);
                            return true;
                        }
                    }
                });
                return Promise.resolve(combineData);
            },
            getSubset: function (set, unionSet, data) {
                return canSet.getSubset(set, unionSet, data, this.algebra);
            },
            time: 1,
            getListData: function (set) {
                var self = this;
                if (!pendingRequests) {
                    pendingRequests = [];
                    setTimeout(function () {
                        var combineDataPromise = self.unionPendingRequests(pendingRequests);
                        pendingRequests = null;
                        combineDataPromise.then(function (combinedData) {
                            combinedData.forEach(function (combined) {
                                base.getListData(combined.set).then(function (data) {
                                    if (combined.pendingRequests.length === 1) {
                                        combined.pendingRequests[0].deferred.resolve(data);
                                    } else {
                                        combined.pendingRequests.forEach(function (pending) {
                                            pending.deferred.resolve({ data: self.getSubset(pending.set, combined.set, getItems(data)) });
                                        });
                                    }
                                });
                            });
                        });
                    }, this.time || 1);
                }
                var deferred = {};
                var promise = new Promise(function (resolve, reject) {
                        deferred.resolve = resolve;
                        deferred.reject = reject;
                    });
                pendingRequests.push({
                    deferred: deferred,
                    set: set
                });
                return promise;
            }
        };
    });
    var doubleLoop = function (arr, callbacks) {
        var i = 0;
        while (i < arr.length) {
            callbacks.start(arr[i]);
            var j = i + 1;
            while (j < arr.length) {
                if (callbacks.iterate(arr[j]) === true) {
                    arr.splice(j, 1);
                } else {
                    j++;
                }
            }
            i++;
        }
    };
});
/*can-connect@0.2.7#data/inline-cache/inline-cache*/
define('can-connect/data/inline-cache/inline-cache', function (require, exports, module) {
    var connect = require('can-connect');
    var sortedSetJSON = require('can-connect/helpers/sorted-set-json');
    module.exports = connect.behavior('data-inline-cache', function (baseConnect) {
        if (typeof INLINE_CACHE === 'undefined') {
            return {};
        }
        var getData = function (id) {
            var type = INLINE_CACHE[this.name];
            if (type) {
                var data = type[id];
                if (data) {
                    delete type[id];
                    return data;
                }
            }
        };
        return {
            getListData: function (set) {
                var id = sortedSetJSON(set);
                var data = getData.call(this, id);
                if (data !== undefined) {
                    if (this.cacheConnection) {
                        this.cacheConnection.updateListData(data, set);
                    }
                    return Promise.resolve(data);
                } else {
                    return baseConnect.getListData.apply(this, arguments);
                }
            },
            getData: function (params) {
                var id = this.id(params);
                var data = getData.call(this, id);
                if (data !== undefined) {
                    if (this.cacheConnection) {
                        this.cacheConnection.updateData(data);
                    }
                    return Promise.resolve(data);
                } else {
                    return baseConnect.getData.apply(this, arguments);
                }
            }
        };
        return behavior;
    });
});
/*can-connect@0.2.7#data/localstorage-cache/localstorage-cache*/
define('can-connect/data/localstorage-cache/localstorage-cache', function (require, exports, module) {
    var getItems = require('can-connect/helpers/get-items');
    var connect = require('can-connect');
    var sortedSetJSON = require('can-connect/helpers/sorted-set-json');
    var canSet = require('can-set');
    require('when/es6-shim/Promise');
    var indexOf = function (connection, props, items) {
        var id = connection.id(props);
        for (var i = 0; i < items.length; i++) {
            if (id == connection.id(items[i])) {
                return i;
            }
        }
        return -1;
    };
    var setAdd = function (set, items, item, algebra) {
        return items.concat([item]);
    };
    module.exports = connect.behavior('data-localstorage-cache', function (baseConnect) {
        var behavior = {
                _sets: null,
                _instances: {},
                getSetData: function () {
                    if (!this._sets) {
                        var sets = this._sets = {};
                        var self = this;
                        (JSON.parse(localStorage.getItem(this.name + '-sets')) || []).forEach(function (set) {
                            var setKey = sortedSetJSON(set);
                            if (localStorage.getItem(self.name + '/set/' + setKey)) {
                                sets[setKey] = {
                                    set: set,
                                    setKey: setKey
                                };
                            }
                        });
                    }
                    return this._sets;
                },
                _getSets: function () {
                    var sets = [];
                    var setData = this.getSetData();
                    for (var setKey in setData) {
                        sets.push(setData[setKey].set);
                    }
                    return sets;
                },
                getInstance: function (id) {
                    var res = localStorage.getItem(this.name + '/instance/' + id);
                    if (res) {
                        return JSON.parse(res);
                    }
                },
                getInstances: function (ids) {
                    var self = this;
                    return ids.map(function (id) {
                        return self.getInstance(id);
                    });
                },
                removeSet: function (setKey, noUpdate) {
                    var sets = this.getSetData();
                    localStorage.removeItem(this.name + '/set/' + setKey);
                    delete sets[setKey];
                    if (noUpdate !== true) {
                        this.updateSets();
                    }
                },
                updateSets: function () {
                    var sets = this._getSets();
                    localStorage.setItem(this.name + '-sets', JSON.stringify(sets));
                },
                updateSet: function (setDatum, items, newSet) {
                    var newSetKey = newSet ? sortedSetJSON(newSet) : setDatum.setKey;
                    if (newSet) {
                        if (newSetKey !== setDatum.setKey) {
                            var sets = this.getSetData();
                            var oldSetKey = setDatum.setKey;
                            sets[newSetKey] = setDatum;
                            setDatum.setKey = newSetKey;
                            this.removeSet(oldSetKey);
                        }
                    }
                    setDatum.items = items;
                    var self = this;
                    var ids = items.map(function (item) {
                            var id = self.id(item);
                            localStorage.setItem(self.name + '/instance/' + id, JSON.stringify(item));
                            return id;
                        });
                    localStorage.setItem(this.name + '/set/' + newSetKey, JSON.stringify(ids));
                },
                addSet: function (set, data) {
                    var items = getItems(data);
                    var sets = this.getSetData();
                    var setKey = sortedSetJSON(set);
                    sets[setKey] = {
                        setKey: setKey,
                        items: items,
                        set: set
                    };
                    var self = this;
                    var ids = items.map(function (item) {
                            var id = self.id(item);
                            localStorage.setItem(self.name + '/instance/' + id, JSON.stringify(item));
                            return id;
                        });
                    localStorage.setItem(this.name + '/set/' + setKey, JSON.stringify(ids));
                    this.updateSets();
                },
                _eachSet: function (cb) {
                    var sets = this.getSetData();
                    var self = this;
                    var loop = function (setDatum, setKey) {
                        return cb(setDatum, setKey, function () {
                            if (!('items' in setDatum)) {
                                var ids = JSON.parse(localStorage.getItem(self.name + '/set/' + setKey));
                                setDatum.items = self.getInstances(ids);
                            }
                            return setDatum.items;
                        });
                    };
                    for (var setKey in sets) {
                        var setDatum = sets[setKey];
                        var result = loop(setDatum, setKey);
                        if (result !== undefined) {
                            return result;
                        }
                    }
                },
                clear: function () {
                    var sets = this.getSetData();
                    for (var setKey in sets) {
                        localStorage.removeItem(this.name + '/set/' + setKey);
                    }
                    localStorage.removeItem(this.name + '-sets');
                    var i = 0;
                    while (i < localStorage.length) {
                        if (localStorage.key(i).indexOf(this.name + '/instance/') === 0) {
                            localStorage.removeItem(localStorage.key(i));
                        } else {
                            i++;
                        }
                    }
                    this._instances = {};
                    this._sets = null;
                },
                getSets: function () {
                    return Promise.resolve(this._getSets());
                },
                getListData: function (set) {
                    var setKey = sortedSetJSON(set);
                    var setDatum = this.getSetData()[setKey];
                    if (setDatum) {
                        var localData = localStorage.getItem(this.name + '/set/' + setKey);
                        if (localData) {
                            return Promise.resolve({ data: this.getInstances(JSON.parse(localData)) });
                        }
                    }
                    return Promise.reject({
                        message: 'no data',
                        error: 404
                    });
                },
                getData: function (params) {
                    var id = this.id(params);
                    var res = localStorage.getItem(this.name + '/instance/' + id);
                    if (res) {
                        return Promise.resolve(JSON.parse(res));
                    } else {
                        return new Promise.reject({
                            message: 'no data',
                            error: 404
                        });
                    }
                },
                updateListData: function (data, set) {
                    var items = getItems(data);
                    var sets = this.getSetData();
                    var self = this;
                    for (var setKey in sets) {
                        var setDatum = sets[setKey];
                        var union = canSet.union(setDatum.set, set, this.algebra);
                        if (union) {
                            return this.getListData(setDatum.set).then(function (setData) {
                                self.updateSet(setDatum, canSet.getUnion(setDatum.set, set, getItems(setData), items, this.algebra), union);
                            });
                        }
                    }
                    this.addSet(set, data);
                    return Promise.resolve();
                },
                createData: function (props) {
                    var self = this;
                    this._eachSet(function (setDatum, setKey, getItems) {
                        if (canSet.subset(props, setDatum.set, this.algebra)) {
                            self.updateSet(setDatum, setAdd(setDatum.set, getItems(), props, this.algebra), setDatum.set);
                        }
                    });
                    var id = this.id(props);
                    localStorage.setItem(this.name + '/instance/' + id, JSON.stringify(props));
                    return Promise.resolve({});
                },
                updateData: function (props) {
                    var self = this;
                    this._eachSet(function (setDatum, setKey, getItems) {
                        var items = getItems();
                        var index = indexOf(self, props, items);
                        if (canSet.subset(props, setDatum.set, this.algebra)) {
                            if (index == -1) {
                                self.updateSet(setDatum, setAdd(setDatum.set, getItems(), props, this.algebra));
                            } else {
                                items.splice(index, 1, props);
                                self.updateSet(setDatum, items);
                            }
                        } else if (index != -1) {
                            items.splice(index, 1);
                            self.updateSet(setDatum, items);
                        }
                    });
                    var id = this.id(props);
                    localStorage.setItem(this.name + '/instance/' + id, JSON.stringify(props));
                    return Promise.resolve({});
                },
                destroyData: function (props) {
                    var self = this;
                    this._eachSet(function (setDatum, setKey, getItems) {
                        var items = getItems();
                        var index = indexOf(self, props, items);
                        if (index != -1) {
                            items.splice(index, 1);
                            self.updateSet(setDatum, items);
                        }
                    });
                    var id = this.id(props);
                    localStorage.removeItem(this.name + '/instance/' + id);
                    return Promise.resolve({});
                }
            };
        return behavior;
    });
});
/*can-connect@0.2.7#data/memory-cache/memory-cache*/
define('can-connect/data/memory-cache/memory-cache', function (require, exports, module) {
    var getItems = require('can-connect/helpers/get-items');
    require('when/es6-shim/Promise');
    var connect = require('can-connect');
    var sortedSetJSON = require('can-connect/helpers/sorted-set-json');
    var canSet = require('can-set');
    var overwrite = require('can-connect/helpers/overwrite');
    var helpers = require('can-connect/helpers/helpers');
    var indexOf = function (connection, props, items) {
        var id = connection.id(props);
        for (var i = 0; i < items.length; i++) {
            if (id == connection.id(items[i])) {
                return i;
            }
        }
        return -1;
    };
    var setAdd = function (set, items, item, algebra) {
        return items.concat([item]);
    };
    module.exports = connect.behavior('data-memory-cache', function (baseConnect) {
        var behavior = {
                _sets: {},
                getSetData: function () {
                    return this._sets;
                },
                _getListData: function (set) {
                    var setsData = this.getSetData();
                    var setData = setsData[sortedSetJSON(set)];
                    if (setData) {
                        return setData.items;
                    }
                },
                _instances: {},
                getInstance: function (id) {
                    return this._instances[id];
                },
                removeSet: function (setKey, noUpdate) {
                    var sets = this.getSetData();
                    delete sets[setKey];
                    if (noUpdate !== true) {
                        this.updateSets();
                    }
                },
                updateSets: function () {
                },
                updateInstance: function (props) {
                    var id = this.id(props);
                    if (!(id in this._instances)) {
                        this._instances[id] = props;
                    } else {
                        overwrite(this._instances[id], props, this.idProp);
                    }
                    return this._instances[id];
                },
                updateSet: function (setDatum, items, newSet) {
                    var newSetKey = newSet ? sortedSetJSON(newSet) : setDatum.setKey;
                    if (newSet) {
                        if (newSetKey !== setDatum.setKey) {
                            var sets = this.getSetData();
                            var oldSetKey = setDatum.setKey;
                            sets[newSetKey] = setDatum;
                            setDatum.setKey = newSetKey;
                            setDatum.set = helpers.extend({}, newSet);
                            this.removeSet(oldSetKey);
                        }
                    }
                    setDatum.items = items;
                    var self = this;
                    var ids = items.forEach(function (item) {
                            self.updateInstance(item);
                        });
                },
                addSet: function (set, data) {
                    var items = getItems(data);
                    var sets = this.getSetData();
                    var setKey = sortedSetJSON(set);
                    sets[setKey] = {
                        setKey: setKey,
                        items: items,
                        set: helpers.extend({}, set)
                    };
                    var self = this;
                    var ids = items.forEach(function (item) {
                            self.updateInstance(item);
                        });
                    this.updateSets();
                },
                _eachSet: function (cb) {
                    var sets = this.getSetData();
                    var self = this;
                    var loop = function (setDatum, setKey) {
                        return cb(setDatum, setKey, function () {
                            return setDatum.items;
                        });
                    };
                    for (var setKey in sets) {
                        var setDatum = sets[setKey];
                        var result = loop(setDatum, setKey);
                        if (result !== undefined) {
                            return result;
                        }
                    }
                },
                _getSets: function () {
                    var sets = [], setsData = this.getSetData();
                    for (var prop in setsData) {
                        sets.push(setsData[prop].set);
                    }
                    return sets;
                },
                getSets: function () {
                    return Promise.resolve(this._getSets());
                },
                clear: function () {
                    this._instances = {};
                    this._sets = {};
                },
                getListData: function (set) {
                    var sets = this._getSets();
                    for (var i = 0; i < sets.length; i++) {
                        var checkSet = sets[i];
                        if (canSet.subset(set, checkSet, this.algebra)) {
                            var items = canSet.getSubset(set, checkSet, this._getListData(checkSet), this.algebra);
                            return Promise.resolve({ data: items });
                        }
                    }
                    return Promise.reject({
                        message: 'no data',
                        error: 404
                    });
                },
                updateListData: function (data, set) {
                    var items = getItems(data);
                    var sets = this.getSetData();
                    var self = this;
                    for (var setKey in sets) {
                        var setDatum = sets[setKey];
                        var union = canSet.union(setDatum.set, set, this.algebra);
                        if (union) {
                            var getSet = helpers.extend({}, setDatum.set);
                            return this.getListData(getSet).then(function (setData) {
                                self.updateSet(setDatum, canSet.getUnion(getSet, set, getItems(setData), items, self.algebra), union);
                            });
                        }
                    }
                    this.addSet(set, data);
                    return Promise.resolve();
                },
                getData: function (params) {
                    var id = this.id(params);
                    var res = this.getInstance(id);
                    if (res) {
                        return Promise.resolve(res);
                    } else {
                        return Promise.reject({
                            message: 'no data',
                            error: 404
                        });
                    }
                },
                createData: function (props) {
                    var self = this;
                    var instance = this.updateInstance(props);
                    this._eachSet(function (setDatum, setKey, getItems) {
                        if (canSet.subset(instance, setDatum.set, this.algebra)) {
                            self.updateSet(setDatum, setAdd(setDatum.set, getItems(), instance, this.algebra), setDatum.set);
                        }
                    });
                    return Promise.resolve({});
                },
                updateData: function (props) {
                    var self = this;
                    var instance = this.updateInstance(props);
                    this._eachSet(function (setDatum, setKey, getItems) {
                        var items = getItems();
                        var index = indexOf(self, instance, items);
                        if (canSet.subset(instance, setDatum.set, this.algebra)) {
                            if (index == -1) {
                                self.updateSet(setDatum, setAdd(setDatum.set, getItems(), instance, this.algebra));
                            } else {
                                items.splice(index, 1, instance);
                                self.updateSet(setDatum, items);
                            }
                        } else if (index != -1) {
                            items.splice(index, 1);
                            self.updateSet(setDatum, items);
                        }
                    });
                    return Promise.resolve({});
                },
                destroyData: function (props) {
                    var self = this;
                    this._eachSet(function (setDatum, setKey, getItems) {
                        var items = getItems();
                        var index = indexOf(self, props, items);
                        if (index != -1) {
                            items.splice(index, 1);
                            self.updateSet(setDatum, items);
                        }
                    });
                    var id = this.id(props);
                    delete this._instances[id];
                    return Promise.resolve({});
                }
            };
        return behavior;
    });
});
/*can-connect@0.2.7#data/parse/parse*/
define('can-connect/data/parse/parse', function (require, exports, module) {
    var connect = require('can-connect');
    var helpers = require('can-connect/helpers/helpers');
    module.exports = connect.behavior('data-parse', function (baseConnect) {
        var behavior = {
                parseListData: function (responseData, xhr, headers) {
                    var result;
                    if (Array.isArray(responseData)) {
                        result = { data: responseData };
                    } else {
                        var prop = this.parseListProp || 'data';
                        responseData.data = helpers.getObject(prop, responseData);
                        result = responseData;
                        if (prop !== 'data') {
                            delete responseData[prop];
                        }
                        if (!Array.isArray(result.data)) {
                            throw new Error('Could not get any raw data while converting using .models');
                        }
                    }
                    var arr = [];
                    for (var i = 0; i < result.data.length; i++) {
                        arr.push(this.parseInstanceData(result.data[i], xhr, headers));
                    }
                    result.data = arr;
                    return result;
                },
                parseInstanceData: function (props) {
                    return this.parseInstanceProp ? helpers.getObject(this.parseInstanceProp, props) || props : props;
                }
            };
        helpers.each(pairs, function (parseFunction, name) {
            behavior[name] = function (params) {
                var self = this;
                return baseConnect[name].call(this, params).then(function () {
                    return self[parseFunction].apply(self, arguments);
                });
            };
        });
        return behavior;
    });
    var pairs = {
            getListData: 'parseListData',
            getData: 'parseInstanceData',
            createData: 'parseInstanceData',
            updateData: 'parseInstanceData',
            destroyData: 'parseInstanceData'
        };
});
/*can-connect@0.2.7#helpers/ajax*/
define('can-connect/helpers/ajax', function (require, exports, module) {
    require('when/es6-shim/Promise');
    var helpers = require('can-connect/helpers/helpers');
    var slice = [].slice;
    var xhrs = [
            function () {
                return new XMLHttpRequest();
            },
            function () {
                return new ActiveXObject('Microsoft.XMLHTTP');
            },
            function () {
                return new ActiveXObject('MSXML2.XMLHTTP.3.0');
            },
            function () {
                return new ActiveXObject('MSXML2.XMLHTTP');
            }
        ], _xhrf = null;
    var hasOwnProperty = Object.prototype.hasOwnProperty, nativeForEach = Array.prototype.forEach;
    var _each = function (o, fn, ctx) {
        if (o == null)
            return;
        if (nativeForEach && o.forEach === nativeForEach)
            o.forEach(fn, ctx);
        else if (o.length === +o.length) {
            for (var i = 0, l = o.length; i < l; i++)
                if (i in o && fn.call(ctx, o[i], i, o) === breaker)
                    return;
        } else {
            for (var key in o)
                if (hasOwnProperty.call(o, key))
                    if (fn.call(ctx, o[key], key, o) === breaker)
                        return;
        }
    };
    var _extend = function (o) {
        _each(slice.call(arguments, 1), function (a) {
            for (var p in a)
                if (a[p] !== void 0)
                    o[p] = a[p];
        });
        return o;
    };
    var $ = {};
    $.xhr = function () {
        if (_xhrf != null)
            return _xhrf();
        for (var i = 0, l = xhrs.length; i < l; i++) {
            try {
                var f = xhrs[i], req = f();
                if (req != null) {
                    _xhrf = f;
                    return req;
                }
            } catch (e) {
                continue;
            }
        }
        return function () {
        };
    };
    $._xhrResp = function (xhr) {
        switch (xhr.getResponseHeader('Content-Type').split(';')[0]) {
        case 'text/xml':
            return xhr.responseXML;
        case 'text/json':
        case 'application/json':
        case 'text/javascript':
        case 'application/javascript':
        case 'application/x-javascript':
            return JSON.parse(xhr.responseText);
        default:
            return xhr.responseText;
        }
    };
    $._formData = function (o) {
        var kvps = [], regEx = /%20/g;
        for (var k in o)
            kvps.push(encodeURIComponent(k).replace(regEx, '+') + '=' + encodeURIComponent(o[k].toString()).replace(regEx, '+'));
        return kvps.join('&');
    };
    module.exports = function (o) {
        var xhr = $.xhr(), timer, n = 0;
        var deferred = helpers.deferred();
        o = _extend({
            userAgent: 'XMLHttpRequest',
            lang: 'en',
            type: 'GET',
            data: null,
            dataType: 'application/x-www-form-urlencoded'
        }, o);
        if (o.timeout)
            timer = setTimeout(function () {
                xhr.abort();
                if (o.timeoutFn)
                    o.timeoutFn(o.url);
            }, o.timeout);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (timer)
                    clearTimeout(timer);
                if (xhr.status < 300) {
                    if (o.success)
                        o.success($._xhrResp(xhr));
                } else if (o.error)
                    o.error(xhr, xhr.status, xhr.statusText);
                if (o.complete)
                    o.complete(xhr, xhr.statusText);
                if (xhr.status == 200) {
                    deferred.resolve(JSON.parse(xhr.responseText));
                } else {
                    deferred.reject(JSON.parse(xhr.responseText));
                }
            } else if (o.progress)
                o.progress(++n);
        };
        var url = o.url, data = null;
        var isPost = o.type == 'POST' || o.type == 'PUT';
        if (!isPost && o.data)
            url += '?' + $._formData(o.data);
        xhr.open(o.type, url);
        if (isPost) {
            var isJson = o.dataType.indexOf('json') >= 0;
            data = isJson ? JSON.stringify(o.data) : $._formData(o.data);
            xhr.setRequestHeader('Content-Type', isJson ? 'application/json' : 'application/x-www-form-urlencoded');
        }
        xhr.send(data);
        return deferred.promise;
    };
});
/*can-connect@0.2.7#data/url/url*/
define('can-connect/data/url/url', function (require, exports, module) {
    var connect = require('can-connect');
    var helpers = require('can-connect/helpers/helpers');
    var ajax = require('can-connect/helpers/ajax');
    module.exports = connect.behavior('data-url', function (baseConnect) {
        var behavior = {};
        helpers.each(pairs, function (reqOptions, name) {
            behavior[name] = function (params) {
                if (typeof this.url === 'object') {
                    if (typeof this.url[reqOptions.prop] === 'function') {
                        return this.url[reqOptions.prop](params);
                    } else if (this.url[reqOptions.prop]) {
                        return makeAjax(this.url[reqOptions.prop], params, reqOptions.type, this.ajax || ajax);
                    }
                }
                var resource = typeof this.url === 'string' ? this.url : this.url.resource;
                if (resource && this.idProp) {
                    return makeAjax(createURLFromResource(resource, this.idProp, reqOptions.prop), params, reqOptions.type, this.ajax || ajax);
                }
                return baseConnect[name].call(this, params);
            };
        });
        return behavior;
    });
    var pairs = {
            getListData: {
                prop: 'getListData',
                type: 'GET'
            },
            getData: {
                prop: 'getData',
                type: 'GET'
            },
            createData: {
                prop: 'createData',
                type: 'POST'
            },
            updateData: {
                prop: 'updateData',
                type: 'PUT'
            },
            destroyData: {
                prop: 'destroyData',
                type: 'DELETE'
            }
        };
    var makeAjax = function (ajaxOb, data, type, ajax) {
        var params = {};
        if (typeof ajaxOb === 'string') {
            var parts = ajaxOb.split(/\s+/);
            params.url = parts.pop();
            if (parts.length) {
                params.type = parts.pop();
            }
        } else {
            helpers.extend(params, ajaxOb);
        }
        params.data = typeof data === 'object' && !Array.isArray(data) ? helpers.extend(params.data || {}, data) : data;
        params.url = helpers.sub(params.url, params.data, true);
        return ajax(helpers.extend({
            type: type || 'post',
            dataType: 'json'
        }, params));
    };
    var createURLFromResource = function (resource, idProp, name) {
        var url = resource.replace(/\/+$/, '');
        if (name === 'getListData' || name === 'createData') {
            return url;
        } else {
            return url + '/{' + idProp + '}';
        }
    };
});
/*can-connect@0.2.7#fall-through-cache/fall-through-cache*/
define('can-connect/fall-through-cache/fall-through-cache', function (require, exports, module) {
    var getItems = require('can-connect/helpers/get-items');
    var connect = require('can-connect');
    var canSet = require('can-set');
    var sortedSetJSON = require('can-connect/helpers/sorted-set-json');
    module.exports = connect.behavior('fall-through-cache', function (baseConnect) {
        var behavior = {
                hydrateList: function (listData, set) {
                    set = set || this.listSet(listData);
                    var id = sortedSetJSON(set);
                    var list = baseConnect.hydrateList.call(this, listData, set);
                    if (this._getHydrateListCallbacks[id]) {
                        this._getHydrateListCallbacks[id].shift()(list);
                        if (!this._getHydrateListCallbacks[id].length) {
                            delete this._getHydrateListCallbacks[id];
                        }
                    }
                    return list;
                },
                _getHydrateListCallbacks: {},
                _getHydrateList: function (set, callback) {
                    var id = sortedSetJSON(set);
                    if (!this._getHydrateListCallbacks[id]) {
                        this._getHydrateListCallbacks[id] = [];
                    }
                    this._getHydrateListCallbacks[id].push(callback);
                },
                getListData: function (set) {
                    var self = this;
                    return this.cacheConnection.getListData(set).then(function (data) {
                        self._getHydrateList(set, function (list) {
                            self.addListReference(list, set);
                            setTimeout(function () {
                                baseConnect.getListData.call(self, set).then(function (listData) {
                                    self.cacheConnection.updateListData(listData, set);
                                    self.updatedList(list, listData, set);
                                    self.deleteListReference(list, set);
                                }, function (e) {
                                    console.log('REJECTED', e);
                                });
                            }, 1);
                        });
                        return data;
                    }, function () {
                        var listData = baseConnect.getListData.call(self, set);
                        listData.then(function (listData) {
                            self.cacheConnection.updateListData(listData, set);
                        });
                        return listData;
                    });
                },
                hydrateInstance: function (props) {
                    var id = this.id(props);
                    var instance = baseConnect.hydrateInstance.apply(this, arguments);
                    if (this._getMakeInstanceCallbacks[id]) {
                        this._getMakeInstanceCallbacks[id].shift()(instance);
                        if (!this._getMakeInstanceCallbacks[id].length) {
                            delete this._getMakeInstanceCallbacks[id];
                        }
                    }
                    return instance;
                },
                _getMakeInstanceCallbacks: {},
                _getMakeInstance: function (id, callback) {
                    if (!this._getMakeInstanceCallbacks[id]) {
                        this._getMakeInstanceCallbacks[id] = [];
                    }
                    this._getMakeInstanceCallbacks[id].push(callback);
                },
                getData: function (params) {
                    var self = this;
                    return this.cacheConnection.getData(params).then(function (instanceData) {
                        self._getMakeInstance(self.id(instanceData) || self.id(params), function (instance) {
                            self.addInstanceReference(instance);
                            setTimeout(function () {
                                baseConnect.getData.call(self, params).then(function (instanceData2) {
                                    self.cacheConnection.updateData(instanceData2);
                                    self.updatedInstance(instance, instanceData2);
                                    self.deleteInstanceReference(instance);
                                }, function () {
                                    console.log('REJECTED', e);
                                });
                            }, 1);
                        });
                        return instanceData;
                    }, function () {
                        var listData = baseConnect.getData.call(self, params);
                        listData.then(function (instanceData) {
                            self.cacheConnection.updateData(instanceData);
                        });
                        return listData;
                    });
                }
            };
        return behavior;
    });
});
/*can-connect@0.2.7#real-time/real-time*/
define('can-connect/real-time/real-time', function (require, exports, module) {
    var connect = require('can-connect');
    var canSet = require('can-set');
    module.exports = connect.behavior('real-time', function (baseConnect) {
        return {
            createInstance: function (props) {
                var id = this.id(props);
                var instance = this.instanceStore.get(id);
                var promise;
                var serialized;
                if (instance) {
                    return this.updateInstance(props);
                } else {
                    instance = this.hydrateInstance(props);
                    serialized = this.serializeInstance(instance);
                    var self = this;
                    this.addInstanceReference(instance);
                    return Promise.resolve(this.createdData(props, serialized)).then(function () {
                        self.deleteInstanceReference(instance);
                        return instance;
                    });
                }
            },
            createdData: function (props, params, cid) {
                var instance;
                if (cid !== undefined) {
                    instance = this.cidStore.get(cid);
                } else {
                    instance = this.instanceStore.get(this.id(props));
                }
                this.addInstanceReference(instance, this.id(props));
                this.createdInstance(instance, props);
                create.call(this, this.serializeInstance(instance));
                this.deleteInstanceReference(instance);
                return undefined;
            },
            updatedData: function (props, params) {
                var instance = this.instanceStore.get(this.id(params));
                this.updatedInstance(instance, props);
                update.call(this, this.serializeInstance(instance));
                return undefined;
            },
            updateInstance: function (props) {
                var id = this.id(props);
                var instance = this.instanceStore.get(id);
                if (!instance) {
                    instance = this.hydrateInstance(props);
                }
                this.addInstanceReference(instance);
                var serialized = this.serializeInstance(instance), self = this;
                return Promise.resolve(this.updatedData(props, serialized)).then(function () {
                    self.deleteInstanceReference(instance);
                    return instance;
                });
            },
            destroyedData: function (props, params) {
                var id = this.id(params || props);
                var instance = this.instanceStore.get(id);
                if (!instance) {
                    instance = this.hydrateInstance(props);
                }
                var serialized = this.serializeInstance(instance);
                destroy.call(this, serialized);
                return undefined;
            },
            destroyInstance: function (props) {
                var id = this.id(props);
                var instance = this.instanceStore.get(id);
                if (!instance) {
                    instance = this.hydrateInstance(props);
                }
                this.addInstanceReference(instance);
                var serialized = this.serializeInstance(instance), self = this;
                return Promise.resolve(this.destroyedData(props, serialized)).then(function () {
                    self.deleteInstanceReference(instance);
                    return instance;
                });
            }
        };
    });
    var indexOf = function (connection, props, items) {
        var id = connection.id(props);
        for (var i = 0; i < items.length; i++) {
            if (id === connection.id(items[i])) {
                return i;
            }
        }
        return -1;
    };
    var setAdd = function (connection, set, items, item, algebra) {
        return items.concat([item]);
    };
    var create = function (props) {
        var self = this;
        this.listStore.forEach(function (list, id) {
            var set = JSON.parse(id);
            var index = indexOf(self, props, list);
            if (canSet.subset(props, set, self.algebra)) {
                if (index == -1) {
                    var items = self.serializeList(list);
                    self.updatedList(list, { data: setAdd(self, set, items, props, self.algebra) }, set);
                } else {
                }
            }
        });
    };
    var update = function (props) {
        var self = this;
        this.listStore.forEach(function (list, id) {
            var set = JSON.parse(id);
            var index = indexOf(self, props, list);
            if (canSet.subset(props, set, self.algebra)) {
                if (index == -1) {
                    var items = self.serializeList(list);
                    self.updatedList(list, { data: setAdd(self, set, items, props, self.algebra) }, set);
                }
            } else if (index != -1) {
                var items = self.serializeList(list);
                items.splice(index, 1);
                self.updatedList(list, { data: items }, set);
            }
        });
    };
    var destroy = function (props) {
        var self = this;
        this.listStore.forEach(function (list, id) {
            var set = JSON.parse(id);
            var index = indexOf(self, props, list);
            if (index != -1) {
                var items = self.serializeList(list);
                items.splice(index, 1);
                self.updatedList(list, { data: items }, set);
            }
        });
    };
});
/*can-connect@0.2.7#helpers/deparam*/
define('can-connect/helpers/deparam', function (require, exports, module) {
    var digitTest = /^\d+$/, keyBreaker = /([^\[\]]+)|(\[\])/g, paramTest = /([^?#]*)(#.*)?$/, prep = function (str) {
            return decodeURIComponent(str.replace(/\+/g, ' '));
        };
    module.exports = function (params) {
        var data = {}, pairs, lastPart;
        if (params && paramTest.test(params)) {
            pairs = params.split('&');
            pairs.forEach(function (pair) {
                var parts = pair.split('='), key = prep(parts.shift()), value = prep(parts.join('=')), current = data;
                if (key) {
                    parts = key.match(keyBreaker);
                    for (var j = 0, l = parts.length - 1; j < l; j++) {
                        if (!current[parts[j]]) {
                            current[parts[j]] = digitTest.test(parts[j + 1]) || parts[j + 1] === '[]' ? [] : {};
                        }
                        current = current[parts[j]];
                    }
                    lastPart = parts.pop();
                    if (lastPart === '[]') {
                        current.push(value);
                    } else {
                        current[lastPart] = value;
                    }
                }
            });
        }
        return data;
    };
});
/*can-connect@0.2.7#fixture/fixture*/
define('can-connect/fixture/fixture', function (require, exports, module) {
    var helpers = require('can-connect/helpers/helpers');
    var canSet = require('can-set');
    var deparam = require('can-connect/helpers/deparam');
    var helpers = require('can-connect/helpers/helpers');
    var can = {};
    var getUrl = function (url) {
        if (typeof steal !== 'undefined') {
            if (steal.joinURIs) {
                var base = steal.config('baseUrl');
                var joined = steal.joinURIs(base, url);
                return joined;
            }
            if (can.isFunction(steal.config)) {
                if (steal.System) {
                    return steal.joinURIs(steal.config('baseURL'), url);
                } else {
                    return steal.config().root.mapJoin(url).toString();
                }
            }
            return steal.root.join(url).toString();
        }
        return (can.fixture.rootUrl || '') + url;
    };
    var updateSettings = function (settings, originalOptions) {
            if (!can.fixture.on || settings.fixture === false) {
                return;
            }
            var log = function () {
            };
            settings.type = settings.type || settings.method || 'GET';
            var data = overwrite(settings);
            if (!settings.fixture) {
                if (window.location.protocol === 'file:') {
                    log('ajax request to ' + settings.url + ', no fixture found');
                }
                return;
            }
            if (typeof settings.fixture === 'string' && can.fixture[settings.fixture]) {
                settings.fixture = can.fixture[settings.fixture];
            }
            if (typeof settings.fixture === 'string') {
                var url = settings.fixture;
                if (/^\/\//.test(url)) {
                    url = getUrl(settings.fixture.substr(2));
                }
                if (data) {
                    url = helpers.sub(url, data);
                }
                delete settings.fixture;
                settings.url = url;
                settings.data = null;
                settings.type = 'GET';
                if (!settings.error) {
                    settings.error = function (xhr, error, message) {
                        throw 'fixtures.js Error ' + error + ' ' + message;
                    };
                }
            } else {
                if (settings.dataTypes) {
                    settings.dataTypes.splice(0, 0, 'fixture');
                }
                if (data && originalOptions) {
                    originalOptions.data = originalOptions.data || {};
                    helpers.extend(originalOptions.data, data);
                }
            }
        }, extractResponse = function (status, statusText, responses, headers) {
            if (typeof status !== 'number') {
                headers = statusText;
                responses = status;
                statusText = 'success';
                status = 200;
            }
            if (typeof statusText !== 'string') {
                headers = responses;
                responses = statusText;
                statusText = 'success';
            }
            if (status >= 400 && status <= 599) {
                this.dataType = 'text';
            }
            return [
                status,
                statusText,
                extractResponses(this, responses),
                headers
            ];
        }, extractResponses = function (settings, responses) {
            var next = settings.dataTypes ? settings.dataTypes[0] : settings.dataType || 'json';
            if (!responses || !responses[next]) {
                var tmp = {};
                tmp[next] = responses;
                responses = tmp;
            }
            return responses;
        };
    var XHR = XMLHttpRequest, g = typeof global !== 'undefined' ? global : window;
    g.XMLHttpRequest = function () {
        var headers = this._headers = {};
        this._xhr = {
            getAllResponseHeaders: function () {
                return headers;
            }
        };
    };
    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
        this._headers[name] = value;
    };
    XMLHttpRequest.prototype.open = function (type, url) {
        this.type = type;
        this.url = url;
    };
    XMLHttpRequest.prototype.getAllResponseHeaders = function () {
        return this._xhr.getAllResponseHeaders.apply(this._xhr, arguments);
    };
    [
        'response',
        'responseText',
        'responseType',
        'responseURL',
        'status',
        'statusText',
        'readyState'
    ].forEach(function (prop) {
        Object.defineProperty(XMLHttpRequest.prototype, prop, {
            get: function () {
                return this._xhr[prop];
            },
            set: function (newVal) {
                this._xhr[prop] = newVal;
            }
        });
    });
    XMLHttpRequest.prototype.send = function (data) {
        var settings = {
                url: this.url,
                data: data,
                headers: this._headers,
                type: this.type.toLowerCase()
            };
        if (!settings.data && settings.type === 'get' || settings.type === 'delete') {
            settings.data = deparam(settings.url.split('?')[1]);
            settings.url = settings.url.split('?')[0];
        }
        if (typeof settings.data === 'string') {
            try {
                settings.data = JSON.parse(settings.data);
            } catch (e) {
                settings.data = deparam(settings.data);
            }
        }
        var self = this;
        updateSettings(settings, settings);
        if (settings.fixture) {
            var timeout, stopped = false;
            timeout = setTimeout(function () {
                var success = function () {
                        var response = extractResponse.apply(settings, arguments), status = response[0];
                        if ((status >= 200 && status < 300 || status === 304) && stopped === false) {
                            self.readyState = 4;
                            self.status = status;
                            self.statusText = 'OK';
                            self.responseText = JSON.stringify(response[2][settings.dataType || 'json']);
                            self.onreadystatechange && self.onreadystatechange();
                            self.onload && self.onload();
                        } else {
                            self.readyState = 4;
                            self.status = status;
                            self.statusText = 'error';
                            self.responseText = typeof response[1] === 'string' ? response[1] : JSON.stringify(response[1]);
                            self.onreadystatechange && self.onreadystatechange();
                            self.onload && self.onload();
                        }
                    }, result = settings.fixture(settings, success, settings.headers, settings);
                if (result !== undefined) {
                    self.readyState = 4;
                    self.status = 200;
                    self.statusText = 'OK';
                    self.responseText = typeof result === 'string' ? result : JSON.stringify(result);
                    self.onreadystatechange && self.onreadystatechange();
                    self.onload && self.onload();
                }
            }, can.fixture.delay);
        } else {
            var xhr = new XHR();
            for (var prop in this) {
                if (!(prop in XMLHttpRequest.prototype)) {
                    xhr[prop] = this[prop];
                }
            }
            helpers.extend(xhr, settings);
            this._xhr = xhr;
            xhr.open(settings.type, settings.url);
            return xhr.send(data);
        }
    };
    var overwrites = [], find = function (settings, exact) {
            for (var i = 0; i < overwrites.length; i++) {
                if ($fixture._similar(settings, overwrites[i], exact)) {
                    return i;
                }
            }
            return -1;
        }, overwrite = function (settings) {
            var index = find(settings);
            if (index > -1) {
                settings.fixture = overwrites[index].fixture;
                return $fixture._getData(overwrites[index].url, settings.url);
            }
        }, getId = function (settings) {
            var id = settings.data.id;
            if (id === undefined && typeof settings.data === 'number') {
                id = settings.data;
            }
            if (id === undefined) {
                settings.url.replace(/\/(\d+)(\/|$|\.)/g, function (all, num) {
                    id = num;
                });
            }
            if (id === undefined) {
                id = settings.url.replace(/\/(\w+)(\/|$|\.)/g, function (all, num) {
                    if (num !== 'update') {
                        id = num;
                    }
                });
            }
            if (id === undefined) {
                id = Math.round(Math.random() * 1000);
            }
            return id;
        };
    var $fixture = can.fixture = function (settings, fixture) {
            if (fixture !== undefined) {
                if (typeof settings === 'string') {
                    var matches = settings.match(/(GET|POST|PUT|DELETE) (.+)/i);
                    if (!matches) {
                        settings = { url: settings };
                    } else {
                        settings = {
                            url: matches[2],
                            type: matches[1]
                        };
                    }
                }
                var index = find(settings, !!fixture);
                if (index > -1) {
                    overwrites.splice(index, 1);
                }
                if (fixture == null) {
                    return;
                }
                settings.fixture = fixture;
                overwrites.push(settings);
            } else {
                helpers.each(settings, function (fixture, url) {
                    $fixture(url, fixture);
                });
            }
        };
    var replacer = /\{([^\}]+)\}/g;
    helpers.extend(can.fixture, {
        _similar: function (settings, overwrite, exact) {
            if (exact) {
                return canSet.equal(settings, overwrite, {
                    fixture: function () {
                        return true;
                    }
                });
            } else {
                return canSet.subset(settings, overwrite, can.fixture._compare);
            }
        },
        _compare: {
            url: function (a, b) {
                return !!$fixture._getData(b, a);
            },
            fixture: function () {
                return true;
            },
            type: function (a, b) {
                return b ? a.toLowerCase() === b.toLowerCase() : false;
            },
            helpers: function () {
                return true;
            }
        },
        _getData: function (fixtureUrl, url) {
            var order = [], fixtureUrlAdjusted = fixtureUrl.replace('.', '\\.').replace('?', '\\?'), res = new RegExp(fixtureUrlAdjusted.replace(replacer, function (whole, part) {
                    order.push(part);
                    return '([^/]+)';
                }) + '$').exec(url), data = {};
            if (!res) {
                return null;
            }
            res.shift();
            order.forEach(function (name) {
                data[name] = res.shift();
            });
            return data;
        },
        store: function (count, make, filter) {
            var currentId = 0, findOne = function (id) {
                    for (var i = 0; i < items.length; i++) {
                        if (id == items[i].id) {
                            return items[i];
                        }
                    }
                }, methods = {}, types, items, reset;
            if (Array.isArray(count) && typeof count[0] === 'string') {
                types = count;
                count = make;
                make = filter;
                filter = arguments[3];
            } else if (typeof count === 'string') {
                types = [
                    count + 's',
                    count
                ];
                count = make;
                make = filter;
                filter = arguments[3];
            }
            if (typeof count === 'number') {
                items = [];
                reset = function () {
                    items = [];
                    for (var i = 0; i < count; i++) {
                        var item = make(i, items);
                        if (!item.id) {
                            item.id = i;
                        }
                        currentId = Math.max(item.id + 1, currentId + 1) || items.length;
                        items.push(item);
                    }
                    if (Array.isArray(types)) {
                        can.fixture['~' + types[0]] = items;
                        can.fixture['-' + types[0]] = methods.findAll;
                        can.fixture['-' + types[1]] = methods.findOne;
                        can.fixture['-' + types[1] + 'Update'] = methods.update;
                        can.fixture['-' + types[1] + 'Destroy'] = methods.destroy;
                        can.fixture['-' + types[1] + 'Create'] = methods.create;
                    }
                };
            } else {
                filter = make;
                var initialItems = count;
                reset = function () {
                    items = initialItems.slice(0);
                };
            }
            helpers.extend(methods, {
                findAll: function (request) {
                    request = request || {};
                    var retArr = items.slice(0);
                    request.data = request.data || {};
                    (request.data.order || []).slice(0).reverse().forEach(function (name) {
                        var split = name.split(' ');
                        retArr = retArr.sort(function (a, b) {
                            if (split[1].toUpperCase() !== 'ASC') {
                                if (a[split[0]] < b[split[0]]) {
                                    return 1;
                                } else if (a[split[0]] === b[split[0]]) {
                                    return 0;
                                } else {
                                    return -1;
                                }
                            } else {
                                if (a[split[0]] < b[split[0]]) {
                                    return -1;
                                } else if (a[split[0]] === b[split[0]]) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            }
                        });
                    });
                    (request.data.group || []).slice(0).reverse().forEach(function (name) {
                        var split = name.split(' ');
                        retArr = retArr.sort(function (a, b) {
                            return a[split[0]] > b[split[0]];
                        });
                    });
                    var offset = parseInt(request.data.offset, 10) || 0, limit = parseInt(request.data.limit, 10) || items.length - offset, i = 0;
                    for (var param in request.data) {
                        i = 0;
                        if (request.data[param] !== undefined && (param.indexOf('Id') !== -1 || param.indexOf('_id') !== -1)) {
                            while (i < retArr.length) {
                                if (request.data[param] != retArr[i][param]) {
                                    retArr.splice(i, 1);
                                } else {
                                    i++;
                                }
                            }
                        }
                    }
                    if (typeof filter === 'function') {
                        i = 0;
                        while (i < retArr.length) {
                            if (!filter(retArr[i], request)) {
                                retArr.splice(i, 1);
                            } else {
                                i++;
                            }
                        }
                    } else if (typeof filter === 'object') {
                        i = 0;
                        while (i < retArr.length) {
                            var subset = canSet.subset(retArr[i], request.data, filter);
                            if (!subset) {
                                retArr.splice(i, 1);
                            } else {
                                i++;
                            }
                        }
                    }
                    var responseData = {
                            'count': retArr.length,
                            'data': retArr.slice(offset, offset + limit)
                        };
                    [
                        'limit',
                        'offset'
                    ].forEach(function (prop) {
                        if (prop in request.data) {
                            responseData[prop] = request.data[prop];
                        }
                    });
                    return responseData;
                },
                findOne: function (request, response) {
                    var item = findOne(getId(request));
                    if (typeof item === 'undefined') {
                        return response(404, 'Requested resource not found');
                    }
                    response(item);
                },
                update: function (request, response) {
                    var id = getId(request), item = findOne(id);
                    if (typeof item === 'undefined') {
                        return response(404, 'Requested resource not found');
                    }
                    helpers.extend(item, request.data);
                    response({ id: id }, { location: request.url || '/' + getId(request) });
                },
                destroy: function (request, response) {
                    var id = getId(request), item = findOne(id);
                    if (typeof item === 'undefined') {
                        return response(404, 'Requested resource not found');
                    }
                    for (var i = 0; i < items.length; i++) {
                        if (items[i].id == id) {
                            items.splice(i, 1);
                            break;
                        }
                    }
                    return {};
                },
                create: function (settings, response) {
                    var item = typeof make === 'function' ? make(items.length, items) : {};
                    helpers.extend(item, settings.data);
                    if (!item.id) {
                        item.id = currentId++;
                    }
                    items.push(item);
                    response({ id: item.id }, { location: settings.url + '/' + item.id });
                }
            });
            reset();
            return helpers.extend({
                getId: getId,
                find: function (settings) {
                    return findOne(getId(settings));
                },
                reset: reset
            }, methods);
        },
        rand: function randomize(arr, min, max) {
            if (typeof arr === 'number') {
                if (typeof min === 'number') {
                    return arr + Math.floor(Math.random() * (min - arr));
                } else {
                    return Math.floor(Math.random() * arr);
                }
            }
            var rand = randomize;
            if (min === undefined) {
                return rand(arr, rand(arr.length + 1));
            }
            var res = [];
            arr = arr.slice(0);
            if (!max) {
                max = min;
            }
            max = min + Math.round(rand(max - min));
            for (var i = 0; i < max; i++) {
                res.push(arr.splice(rand(arr.length), 1)[0]);
            }
            return res;
        },
        xhr: function (xhr) {
            return helpers.extend({}, {
                abort: can.noop,
                getAllResponseHeaders: function () {
                    return '';
                },
                getResponseHeader: function () {
                    return '';
                },
                open: can.noop,
                overrideMimeType: can.noop,
                readyState: 4,
                responseText: '',
                responseXML: null,
                send: can.noop,
                setRequestHeader: can.noop,
                status: 200,
                statusText: 'OK'
            }, xhr);
        },
        on: true
    });
    can.fixture.delay = 200;
    can.fixture.rootUrl = getUrl('');
    can.fixture['-handleFunction'] = function (settings) {
        if (typeof settings.fixture === 'string' && can.fixture[settings.fixture]) {
            settings.fixture = can.fixture[settings.fixture];
        }
        if (typeof settings.fixture === 'function') {
            setTimeout(function () {
                if (settings.success) {
                    settings.success.apply(null, settings.fixture(settings, 'success'));
                }
                if (settings.complete) {
                    settings.complete.apply(null, settings.fixture(settings, 'complete'));
                }
            }, can.fixture.delay);
            return true;
        }
        return false;
    };
    can.fixture.overwrites = overwrites;
    can.fixture.make = can.fixture.store;
    module.exports = can.fixture;
});
/*can-connect@0.2.7#can/model/model*/
define('can-connect/can/model/model', function (require, exports, module) {
    var can = require('can/util/util'), Map = require('can/map/map'), List = require('can/list/list'), connect = require('can-connect'), persist = require('can-connect/data/url/url'), constructor = require('can-connect/constructor/constructor'), instanceStore = require('can-connect/constructor/store/store'), parseData = require('can-connect/data/parse/parse');
    require('can-connect/can/can');
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
/*can-connect@0.2.7#can/super-map/super-map*/
define('can-connect/can/super-map/super-map', function (require, exports, module) {
    var connect = require('can-connect');
    require('can-connect/constructor/constructor');
    require('can-connect/can/map/map');
    require('can-connect/can/can');
    require('can-connect/constructor/store/store');
    require('can-connect/constructor/callbacks-once/callbacks-once');
    require('can-connect/data/callbacks/callbacks');
    require('can-connect/data/callbacks-cache/callbacks-cache');
    require('can-connect/data/combine-requests/combine-requests');
    require('can-connect/data/inline-cache/inline-cache');
    require('can-connect/data/localstorage-cache/localstorage-cache');
    require('can-connect/data/parse/parse');
    require('can-connect/data/url/url');
    require('can-connect/fall-through-cache/fall-through-cache');
    require('can-connect/real-time/real-time');
    var Map = require('can/map/map');
    var List = require('can/list/list');
    connect.superMap = function (options) {
        var behaviors = [
                'constructor',
                'can-map',
                'constructor-store',
                'data-callbacks',
                'data-callbacks-cache',
                'data-combine-requests',
                'data-inline-cache',
                'data-parse',
                'data-url',
                'real-time',
                'constructor-callbacks-once'
            ];
        if (typeof localStorage !== 'undefined') {
            options.cacheConnection = connect(['data-localstorage-cache'], {
                name: options.name + 'Cache',
                idProp: options.idProp,
                algebra: options.algebra
            });
            behaviors.push('fall-through-cache');
        }
        options.ajax = $.ajax;
        return connect(behaviors, options);
    };
    module.exports = connect.superMap;
});
/*can-connect@0.2.7#can/tag/tag*/
define('can-connect/can/tag/tag', function (require, exports, module) {
    var connect = require('can-connect');
    var can = require('can/util/util');
    require('can/compute/compute');
    require('can/view/bindings/bindings');
    require('can-connect/can/can');
    var mustacheCore = require('can/view/stache/mustache_core');
    var convertToValue = function (arg) {
        if (typeof arg === 'function') {
            return convertToValue(arg());
        } else {
            return arg;
        }
    };
    connect.tag = function (tagName, connection) {
        var removeBrackets = function (value, open, close) {
            open = open || '{';
            close = close || '}';
            if (value[0] === open && value[value.length - 1] === close) {
                return value.substr(1, value.length - 2);
            }
            return value;
        };
        can.view.tag(tagName, function (el, tagData) {
            var getList = el.getAttribute('getList') || el.getAttribute('get-list');
            var getInstance = el.getAttribute('get');
            var attrValue = getList || getInstance;
            var method = getList ? 'getList' : 'get';
            var attrInfo = mustacheCore.expressionData('tmp ' + removeBrackets(attrValue));
            var addedToPageData = false;
            var addToPageData = can.__notObserve(function (set, promise) {
                    if (!addedToPageData) {
                        var root = tagData.scope.attr('@root');
                        if (root && root.pageData) {
                            if (method === 'get') {
                                set = connection.id(set);
                            }
                            root.pageData(connection.name, set, promise);
                        }
                    }
                    addedToPageData = true;
                });
            var request = can.compute(function () {
                    var hash = {};
                    if (typeof attrInfo.hash === 'object') {
                        can.each(attrInfo.hash, function (val, key) {
                            if (val && val.hasOwnProperty('get')) {
                                hash[key] = tagData.scope.read(val.get, {}).value;
                            } else {
                                hash[key] = val;
                            }
                        });
                    } else {
                        can.each(attrInfo.hash(tagData.scope, tagData.options, {}), function (val, key) {
                            hash[key] = convertToValue(val);
                        });
                    }
                    var promise = connection[method](hash);
                    addToPageData(hash, promise);
                    return promise;
                });
            can.data(can.$(el), 'viewModel', request);
            var nodeList = can.view.nodeLists.register([], undefined, true);
            var frag = tagData.subtemplate ? tagData.subtemplate(tagData.scope.add(request), tagData.options, nodeList) : document.createDocumentFragment();
            can.appendChild(el, frag);
            can.view.nodeLists.update(nodeList, el.childNodes);
            can.one.call(el, 'removed', function () {
                can.view.nodeLists.unregister(nodeList);
            });
        });
    };
    module.exports = connect.tag;
});
/*can-connect@0.2.7#all*/
define('can-connect/all', function (require, exports, module) {
    var connect = window.connect = require('can-connect');
    connect.cacheRequests = require('can-connect/cache-requests/cache-requests');
    connect.canMap = require('can-connect/can/map/map');
    connect.constructor = require('can-connect/constructor/constructor');
    connect.constructorCallbacksOnce = require('can-connect/constructor/callbacks-once/callbacks-once');
    connect.constructorStore = require('can-connect/constructor/store/store');
    connect.dataCallbacks = require('can-connect/data/callbacks/callbacks');
    connect.dataCallbacksCache = require('can-connect/data/callbacks-cache/callbacks-cache');
    connect.dataCombineRequests = require('can-connect/data/combine-requests/combine-requests');
    connect.dataInlineCache = require('can-connect/data/inline-cache/inline-cache');
    connect.dataLocalStorageCache = require('can-connect/data/localstorage-cache/localstorage-cache');
    connect.dataMemoryCache = require('can-connect/data/memory-cache/memory-cache');
    connect.dataParse = require('can-connect/data/parse/parse');
    connect.dataUrl = require('can-connect/data/url/url');
    connect.fallThroughCache = require('can-connect/fall-through-cache/fall-through-cache');
    connect.realTime = require('can-connect/real-time/real-time');
    connect.fixture = require('can-connect/fixture/fixture');
    connect.Model = require('can-connect/can/model/model');
    connect.superMap = require('can-connect/can/super-map/super-map');
    require('can-connect/can/tag/tag');
});
/*[global-shim-end]*/
(function (){
	window._define = window.define;
	window.define = window.define.orig;
	window.System = window.System.orig;
})();
//# sourceMappingURL=all.js.map