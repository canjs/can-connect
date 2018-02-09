/*[global-shim-start]*/
(function(exports, global, doEval) {
	// jshint ignore:line
	var origDefine = global.define;

	var get = function(name) {
		var parts = name.split("."),
			cur = global,
			i;
		for (i = 0; i < parts.length; i++) {
			if (!cur) {
				break;
			}
			cur = cur[parts[i]];
		}
		return cur;
	};
	var set = function(name, val) {
		var parts = name.split("."),
			cur = global,
			i,
			part,
			next;
		for (i = 0; i < parts.length - 1; i++) {
			part = parts[i];
			next = cur[part];
			if (!next) {
				next = cur[part] = {};
			}
			cur = next;
		}
		part = parts[parts.length - 1];
		cur[part] = val;
	};
	var useDefault = function(mod) {
		if (!mod || !mod.__esModule) return false;
		var esProps = { __esModule: true, default: true };
		for (var p in mod) {
			if (!esProps[p]) return false;
		}
		return true;
	};

	var hasCjsDependencies = function(deps) {
		return (
			deps[0] === "require" && deps[1] === "exports" && deps[2] === "module"
		);
	};

	var modules =
		(global.define && global.define.modules) ||
		(global._define && global._define.modules) ||
		{};
	var ourDefine = (global.define = function(moduleName, deps, callback) {
		var module;
		if (typeof deps === "function") {
			callback = deps;
			deps = [];
		}
		var args = [],
			i;
		for (i = 0; i < deps.length; i++) {
			args.push(
				exports[deps[i]]
					? get(exports[deps[i]])
					: modules[deps[i]] || get(deps[i])
			);
		}
		// CJS has no dependencies but 3 callback arguments
		if (hasCjsDependencies(deps) || (!deps.length && callback.length)) {
			module = { exports: {} };
			args[0] = function(name) {
				return exports[name] ? get(exports[name]) : modules[name];
			};
			args[1] = module.exports;
			args[2] = module;
		} else if (!args[0] && deps[0] === "exports") {
			// Babel uses the exports and module object.
			module = { exports: {} };
			args[0] = module.exports;
			if (deps[1] === "module") {
				args[1] = module;
			}
		} else if (!args[0] && deps[0] === "module") {
			args[0] = { id: moduleName };
		}

		global.define = origDefine;
		var result = callback ? callback.apply(null, args) : undefined;
		global.define = ourDefine;

		// Favor CJS module.exports over the return value
		result = module && module.exports ? module.exports : result;
		modules[moduleName] = result;

		// Set global exports
		var globalExport = exports[moduleName];
		if (globalExport && !get(globalExport)) {
			if (useDefault(result)) {
				result = result["default"];
			}
			set(globalExport, result);
		}
	});
	global.define.orig = origDefine;
	global.define.modules = modules;
	global.define.amd = true;
	ourDefine("@loader", [], function() {
		// shim for @@global-helpers
		var noop = function() {};
		return {
			get: function() {
				return { prepareGlobal: noop, retrieveGlobal: noop };
			},
			global: global,
			__exec: function(__load) {
				doEval(__load.source, global);
			}
		};
	});
})(
	{ jquery: "jQuery" },
	typeof self == "object" && self.Object == Object ? self : window,
	function(__$source__, __$global__) {
		// jshint ignore:line
		eval("(function() { " + __$source__ + " \n }).call(__$global__);");
	}
);

/*can-connect@1.5.17#connect*/
define('can-connect/connect', [
    'require',
    'exports',
    'module',
    'can-util/js/assign/assign'
], function (require, exports, module) {
    var assign = require('can-util/js/assign/assign');
    var connect = function (behaviors, options) {
        behaviors = behaviors.map(function (behavior, index) {
            var sortedIndex = -1;
            if (typeof behavior === 'string') {
                sortedIndex = connect.order.indexOf(behavior);
                behavior = behaviorsMap[behavior];
            } else if (behavior.isBehavior) {
                sortedIndex = connect.order.indexOf(behavior.behaviorName);
            } else {
                behavior = connect.behavior(behavior);
            }
            return {
                originalIndex: index,
                sortedIndex: sortedIndex,
                behavior: behavior
            };
        });
        behaviors.sort(function (b1, b2) {
            if (~b1.sortedIndex && ~b2.sortedIndex) {
                return b1.sortedIndex - b2.sortedIndex;
            }
            return b1.originalIndex - b2.originalIndex;
        });
        behaviors = behaviors.map(function (b) {
            return b.behavior;
        });
        var behavior = connect.base(connect.behavior('options', function () {
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
        'data/localstorage-cache',
        'data/url',
        'data/parse',
        'cache-requests',
        'data/combine-requests',
        'constructor',
        'constructor/store',
        'can/map',
        'can/ref',
        'fall-through-cache',
        'data/worker',
        'real-time',
        'data/callbacks-cache',
        'data/callbacks',
        'constructor/callbacks-once'
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
            assign(newBehavior, res);
            newBehavior.__behaviorName = name;
            return newBehavior;
        };
        if (name) {
            behaviorMixin.behaviorName = name;
            behaviorsMap[name] = behaviorMixin;
        }
        behaviorMixin.isBehavior = true;
        return behaviorMixin;
    };
    var behaviorsMap = {};
    module.exports = connect;
});
/*can-connect@1.5.17#base/base*/
define('can-connect/base/base', [
    'require',
    'exports',
    'module',
    'can-connect/connect'
], function (require, exports, module) {
    var connect = require('can-connect/connect');
    module.exports = connect.behavior('base', function (baseConnection) {
        return {
            id: function (instance) {
                var ids = [], algebra = this.algebra;
                if (algebra && algebra.clauses && algebra.clauses.id) {
                    for (var prop in algebra.clauses.id) {
                        ids.push(instance[prop]);
                    }
                }
                if (this.idProp && !ids.length) {
                    ids.push(instance[this.idProp]);
                }
                if (!ids.length) {
                    ids.push(instance.id);
                }
                return ids.length > 1 ? ids.join('@|@') : ids[0];
            },
            idProp: baseConnection.idProp || 'id',
            listSet: function (list) {
                return list[this.listSetProp];
            },
            listSetProp: '__listSet',
            init: function () {
            }
        };
    });
});
/*can-connect@1.5.17#can-connect*/
define('can-connect', [
    'require',
    'exports',
    'module',
    'can-connect/connect',
    'can-connect/base/base',
    'can-namespace'
], function (require, exports, module) {
    var connect = require('can-connect/connect');
    var base = require('can-connect/base/base');
    var ns = require('can-namespace');
    connect.base = base;
    module.exports = ns.connect = connect;
});
/*can-connect@1.5.17#helpers/get-items*/
define('can-connect/helpers/get-items', function (require, exports, module) {
    module.exports = function (data) {
        if (Array.isArray(data)) {
            return data;
        } else {
            return data.data;
        }
    };
});
/*can-connect@1.5.17#helpers/validate*/
define('can-connect/helpers/validate', [
    'require',
    'exports',
    'module',
    'can-validate-interface'
], function (require, exports, module) {
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
        var extendingName = extendingBehavior.behaviorName || 'anonymous behavior', baseName = baseBehavior.__behaviorName || 'anonymous behavior', message = 'can-connect: Extending behavior "' + extendingName + '" found base behavior "' + baseName + '" was missing required properties: ' + JSON.stringify(missingProps.related), instance = new Error(message);
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
        }
        return instance;
    }
    BehaviorInterfaceError.prototype = Object.create(Error.prototype, { constructor: { value: Error } });
    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(BehaviorInterfaceError, Error);
    } else {
        BehaviorInterfaceError.__proto__ = Error;
    }
});
/*can-connect@1.5.17#cache-requests/cache-requests*/
define('can-connect/cache-requests/cache-requests', [
    'require',
    'exports',
    'module',
    'can-connect',
    'can-connect/helpers/get-items',
    'can-set'
], function (require, exports, module) {
    var connect = require('can-connect');
    var getItems = require('can-connect/helpers/get-items');
    var canSet = require('can-set');
    var forEach = [].forEach;
    var cacheRequestsBehaviour = connect.behavior('cache-requests', function (baseConnection) {
        return {
            getDiff: function (params, availableSets) {
                var minSets, self = this;
                forEach.call(availableSets, function (set) {
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
                set = set || {};
                var self = this;
                return this.cacheConnection.getSets(set).then(function (sets) {
                    var diff = self.getDiff(set, sets);
                    if (!diff.needed) {
                        return self.cacheConnection.getListData(diff.cached);
                    } else if (!diff.cached) {
                        return baseConnection.getListData(diff.needed).then(function (data) {
                            return self.cacheConnection.updateListData(getItems(data), diff.needed).then(function () {
                                return data;
                            });
                        });
                    } else {
                        var cachedPromise = self.cacheConnection.getListData(diff.cached);
                        var needsPromise = baseConnection.getListData(diff.needed);
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
    module.exports = cacheRequestsBehaviour;
});
/*can-connect@1.5.17#helpers/weak-reference-map*/
define('can-connect/helpers/weak-reference-map', [
    'require',
    'exports',
    'module',
    'can-util/js/assign/assign'
], function (require, exports, module) {
    var assign = require('can-util/js/assign/assign');
    var WeakReferenceMap = function () {
        this.set = {};
    };
    assign(WeakReferenceMap.prototype, {
        has: function (key) {
            return !!this.set[key];
        },
        addReference: function (key, item, referenceCount) {
            if (typeof key === 'undefined') {
                throw new Error('can-connect: You must provide a key to store a value in a WeakReferenceMap');
            }
            var data = this.set[key];
            if (!data) {
                data = this.set[key] = {
                    item: item,
                    referenceCount: 0,
                    key: key
                };
            }
            data.referenceCount += referenceCount || 1;
        },
        referenceCount: function (key) {
            var data = this.set[key];
            if (data) {
                return data.referenceCount;
            }
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
/*can-connect@1.5.17#helpers/overwrite*/
define('can-connect/helpers/overwrite', function (require, exports, module) {
    module.exports = function (d, s, id) {
        for (var prop in d) {
            if (d.hasOwnProperty(prop) && !(prop.substr(0, 2) === '__') && prop !== id && !(prop in s)) {
                delete d[prop];
            }
        }
        for (prop in s) {
            d[prop] = s[prop];
        }
        return d;
    };
});
/*can-connect@1.5.17#helpers/id-merge*/
define('can-connect/helpers/id-merge', function (require, exports, module) {
    var map = [].map;
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
                ].concat(map.call(update.slice(updateIndex), make)));
                return list;
            }
        }
        if (updateIndex === update.length && listIndex === list.length) {
            return;
        }
        list.splice.apply(list, [
            listIndex,
            list.length - listIndex
        ].concat(map.call(update.slice(updateIndex), make)));
        return;
    };
});
/*can-connect@1.5.17#constructor/constructor*/
define('can-connect/constructor/constructor', [
    'require',
    'exports',
    'module',
    'can-util/js/make-array/make-array',
    'can-util/js/assign/assign',
    'can-connect',
    'can-connect/helpers/weak-reference-map',
    'can-connect/helpers/overwrite',
    'can-connect/helpers/id-merge'
], function (require, exports, module) {
    var makeArray = require('can-util/js/make-array/make-array');
    var assign = require('can-util/js/assign/assign');
    var connect = require('can-connect');
    var WeakReferenceMap = require('can-connect/helpers/weak-reference-map');
    var overwrite = require('can-connect/helpers/overwrite');
    var idMerge = require('can-connect/helpers/id-merge');
    module.exports = connect.behavior('constructor', function (baseConnection) {
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
                set = set || {};
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
                    copyMetadata(listData, list);
                    return list;
                }
            },
            hydrateInstance: function (props) {
                if (this.instance) {
                    return this.instance(props);
                } else {
                    return assign({}, props);
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
                assign(instance, props);
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
                copyMetadata(listData, list);
            },
            destroyedInstance: function (instance, data) {
                overwrite(instance, data, this.idProp);
            },
            serializeInstance: function (instance) {
                return assign({}, instance);
            },
            serializeList: function (list) {
                var self = this;
                return makeArray(list).map(function (instance) {
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
    function copyMetadata(listData, list) {
        for (var prop in listData) {
            if (prop !== 'data') {
                if (typeof list.set === 'function') {
                    list.set(prop, listData[prop]);
                } else if (typeof list.attr === 'function') {
                    list.attr(prop, listData[prop]);
                } else {
                    list[prop] = listData[prop];
                }
            }
        }
    }
});
/*can-connect@1.5.17#helpers/sorted-set-json*/
define('can-connect/helpers/sorted-set-json', function (require, exports, module) {
    var forEach = [].forEach;
    var keys = Object.keys;
    module.exports = function (set) {
        if (set == null) {
            return set;
        } else {
            var sorted = {};
            forEach.call(keys(set).sort(), function (prop) {
                sorted[prop] = set[prop];
            });
            return JSON.stringify(sorted);
        }
    };
});
/*can-connect@1.5.17#constructor/callbacks-once/callbacks-once*/
define('can-connect/constructor/callbacks-once/callbacks-once', [
    'require',
    'exports',
    'module',
    'can-connect',
    'can-connect/helpers/sorted-set-json'
], function (require, exports, module) {
    var connect = require('can-connect');
    var sortedSetJSON = require('can-connect/helpers/sorted-set-json');
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
});
/*can-connect@1.5.17#helpers/weak-reference-set*/
define('can-connect/helpers/weak-reference-set', [
    'require',
    'exports',
    'module',
    'can-util/js/assign/assign'
], function (require, exports, module) {
    var assign = require('can-util/js/assign/assign');
    var WeakReferenceSet = function () {
        this.set = [];
    };
    assign(WeakReferenceSet.prototype, {
        has: function (item) {
            return this._getIndex(item) !== -1;
        },
        addReference: function (item, referenceCount) {
            var index = this._getIndex(item);
            var data = this.set[index];
            if (!data) {
                data = {
                    item: item,
                    referenceCount: 0
                };
                this.set.push(data);
            }
            data.referenceCount += referenceCount || 1;
        },
        deleteReference: function (item) {
            var index = this._getIndex(item);
            var data = this.set[index];
            if (data) {
                data.referenceCount--;
                if (data.referenceCount === 0) {
                    this.set.splice(index, 1);
                }
            }
        },
        delete: function (item) {
            var index = this._getIndex(item);
            if (index !== -1) {
                this.set.splice(index, 1);
            }
        },
        get: function (item) {
            var data = this.set[this._getIndex(item)];
            if (data) {
                return data.item;
            }
        },
        referenceCount: function (item) {
            var data = this.set[this._getIndex(item)];
            if (data) {
                return data.referenceCount;
            }
        },
        _getIndex: function (item) {
            var index;
            this.set.every(function (data, i) {
                if (data.item === item) {
                    index = i;
                    return false;
                }
            });
            return index !== undefined ? index : -1;
        },
        forEach: function (cb) {
            return this.set.forEach(cb);
        }
    });
    module.exports = WeakReferenceSet;
});
/*can-connect@1.5.17#constructor/store/store*/
define('can-connect/constructor/store/store', [
    'require',
    'exports',
    'module',
    'can-connect',
    'can-connect/helpers/weak-reference-map',
    'can-connect/helpers/weak-reference-set',
    'can-connect/helpers/sorted-set-json',
    'can-event',
    'can-util/js/assign/assign'
], function (require, exports, module) {
    var connect = require('can-connect');
    var WeakReferenceMap = require('can-connect/helpers/weak-reference-map');
    var WeakReferenceSet = require('can-connect/helpers/weak-reference-set');
    var sortedSetJSON = require('can-connect/helpers/sorted-set-json');
    var canEvent = require('can-event');
    var assign = require('can-util/js/assign/assign');
    var pendingRequests = 0;
    var noRequestsTimer = null;
    var requests = {
        increment: function (connection) {
            pendingRequests++;
            clearTimeout(noRequestsTimer);
        },
        decrement: function (connection) {
            pendingRequests--;
            if (pendingRequests === 0) {
                noRequestsTimer = setTimeout(function () {
                    requests.dispatch('end');
                }, module.exports.requestCleanupDelay);
            }
            if (pendingRequests < 0) {
                pendingRequests = 0;
            }
        },
        count: function () {
            return pendingRequests;
        }
    };
    assign(requests, canEvent);
    var constructorStore = connect.behavior('constructor/store', function (baseConnection) {
        var behavior = {
            instanceStore: new WeakReferenceMap(),
            newInstanceStore: new WeakReferenceSet(),
            listStore: new WeakReferenceMap(),
            init: function () {
                if (baseConnection.init) {
                    baseConnection.init.apply(this, arguments);
                }
                if (!this.hasOwnProperty('_requestInstances')) {
                    this._requestInstances = {};
                }
                if (!this.hasOwnProperty('_requestLists')) {
                    this._requestLists = {};
                }
                requests.on('end', function () {
                    var id;
                    for (id in this._requestInstances) {
                        this.instanceStore.deleteReference(id);
                    }
                    this._requestInstances = {};
                    for (id in this._requestLists) {
                        this.listStore.deleteReference(id);
                        this._requestLists[id].forEach(this.deleteInstanceReference.bind(this));
                    }
                    this._requestLists = {};
                }.bind(this));
            },
            _finishedRequest: function () {
                requests.decrement(this);
            },
            addInstanceReference: function (instance, id) {
                var ID = id || this.id(instance);
                if (ID === undefined) {
                    this.newInstanceStore.addReference(instance);
                } else {
                    this.instanceStore.addReference(ID, instance);
                }
            },
            createdInstance: function (instance, props) {
                baseConnection.createdInstance.apply(this, arguments);
                this.moveCreatedInstanceToInstanceStore(instance);
            },
            moveCreatedInstanceToInstanceStore: function (instance) {
                var ID = this.id(instance);
                if (this.newInstanceStore.has(instance) && ID !== undefined) {
                    var referenceCount = this.newInstanceStore.referenceCount(instance);
                    this.newInstanceStore.delete(instance);
                    this.instanceStore.addReference(ID, instance, referenceCount);
                }
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
                var ID = this.id(instance);
                if (ID === undefined) {
                    this.newInstanceStore.deleteReference(instance);
                } else {
                    this.instanceStore.deleteReference(this.id(instance), instance);
                }
            },
            addListReference: function (list, set) {
                var id = sortedSetJSON(set || this.listSet(list));
                if (id) {
                    this.listStore.addReference(id, list);
                    list.forEach(function (instance) {
                        this.addInstanceReference(instance);
                    }.bind(this));
                }
            },
            deleteListReference: function (list, set) {
                var id = sortedSetJSON(set || this.listSet(list));
                if (id) {
                    this.listStore.deleteReference(id, list);
                    list.forEach(this.deleteInstanceReference.bind(this));
                }
            },
            hydratedInstance: function (instance) {
                if (requests.count() > 0) {
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
                var instance = baseConnection.hydrateInstance.call(this, props);
                this.hydratedInstance(instance);
                return instance;
            },
            hydratedList: function (list, set) {
                if (requests.count() > 0) {
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
                var list = baseConnection.hydrateList.call(this, listData, set);
                this.hydratedList(list, set);
                return list;
            },
            getList: function (listSet) {
                var self = this;
                requests.increment(this);
                var promise = baseConnection.getList.call(this, listSet);
                promise.then(function (instances) {
                    self._finishedRequest();
                }, function () {
                    self._finishedRequest();
                });
                return promise;
            },
            get: function (params) {
                var self = this;
                requests.increment(this);
                var promise = baseConnection.get.call(this, params);
                promise.then(function (instance) {
                    self._finishedRequest();
                }, function () {
                    self._finishedRequest();
                });
                return promise;
            },
            save: function (instance) {
                var self = this;
                requests.increment(this);
                var updating = !this.isNew(instance);
                if (updating) {
                    this.addInstanceReference(instance);
                }
                var promise = baseConnection.save.call(this, instance);
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
                this.addInstanceReference(instance);
                requests.increment(this);
                var promise = baseConnection.destroy.call(this, instance);
                promise.then(function (instance) {
                    self._finishedRequest();
                    self.deleteInstanceReference(instance);
                }, function () {
                    self._finishedRequest();
                });
                return promise;
            },
            updatedList: function (list, listData, set) {
                var oldList = list.slice(0);
                if (!listData.data && typeof listData.length === 'number') {
                    listData = { data: listData };
                }
                if (baseConnection.updatedList) {
                    baseConnection.updatedList.call(this, list, listData, set);
                    list.forEach(function (instance) {
                        this.addInstanceReference(instance);
                    }.bind(this));
                } else if (listData.data) {
                    listData.data.forEach(function (instance) {
                        this.addInstanceReference(instance);
                    }.bind(this));
                }
                oldList.forEach(this.deleteInstanceReference.bind(this));
            }
        };
        return behavior;
    });
    constructorStore.requests = requests;
    constructorStore.requestCleanupDelay = 10;
    module.exports = constructorStore;
});
/*can-connect@1.5.17#data/callbacks/callbacks*/
define('can-connect/data/callbacks/callbacks', [
    'require',
    'exports',
    'module',
    'can-connect',
    'can-util/js/each/each'
], function (require, exports, module) {
    var connect = require('can-connect');
    var each = require('can-util/js/each/each');
    var pairs = {
        getListData: 'gotListData',
        createData: 'createdData',
        updateData: 'updatedData',
        destroyData: 'destroyedData'
    };
    var dataCallbackBehavior = connect.behavior('data/callbacks', function (baseConnection) {
        var behavior = {};
        each(pairs, function (callbackName, name) {
            behavior[name] = function (params, cid) {
                var self = this;
                return baseConnection[name].call(this, params).then(function (data) {
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
    module.exports = dataCallbackBehavior;
});
/*can-connect@1.5.17#data/callbacks-cache/callbacks-cache*/
define('can-connect/data/callbacks-cache/callbacks-cache', [
    'require',
    'exports',
    'module',
    'can-connect',
    'can-util/js/assign/assign',
    'can-util/js/each/each'
], function (require, exports, module) {
    var connect = require('can-connect');
    var assign = require('can-util/js/assign/assign');
    var each = require('can-util/js/each/each');
    var pairs = {
        createdData: 'createData',
        updatedData: 'updateData',
        destroyedData: 'destroyData'
    };
    var callbackCache = connect.behavior('data/callbacks-cache', function (baseConnection) {
        var behavior = {};
        each(pairs, function (crudMethod, dataCallback) {
            behavior[dataCallback] = function (data, params, cid) {
                this.cacheConnection[crudMethod](assign(assign({}, params), data));
                if (baseConnection[dataCallback]) {
                    return baseConnection[dataCallback].call(this, data, params, cid);
                } else {
                    return data;
                }
            };
        });
        return behavior;
    });
    module.exports = callbackCache;
});
/*can-connect@1.5.17#helpers/deferred*/
define('can-connect/helpers/deferred', function (require, exports, module) {
    module.exports = function () {
        var def = {};
        def.promise = new Promise(function (resolve, reject) {
            def.resolve = resolve;
            def.reject = reject;
        });
        return def;
    };
});
/*can-connect@1.5.17#data/combine-requests/combine-requests*/
define('can-connect/data/combine-requests/combine-requests', [
    'require',
    'exports',
    'module',
    'can-connect',
    'can-set',
    'can-connect/helpers/get-items',
    'can-util/js/deep-assign/deep-assign',
    'can-connect/helpers/deferred'
], function (require, exports, module) {
    var connect = require('can-connect');
    var canSet = require('can-set');
    var getItems = require('can-connect/helpers/get-items');
    var deepAssign = require('can-util/js/deep-assign/deep-assign');
    var makeDeferred = require('can-connect/helpers/deferred');
    var forEach = [].forEach;
    var combineRequests = connect.behavior('data/combine-requests', function (baseConnection) {
        var pendingRequests;
        return {
            unionPendingRequests: function (pendingRequests) {
                var self = this;
                pendingRequests.sort(function (pReq1, pReq2) {
                    if (canSet.subset(pReq1.set, pReq2.set, self.algebra)) {
                        return 1;
                    } else if (canSet.subset(pReq2.set, pReq1.set, self.algebra)) {
                        return -1;
                    } else {
                        return 0;
                    }
                });
                var combineData = [];
                var current;
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
            time: 1,
            getListData: function (set) {
                set = set || {};
                var self = this;
                if (!pendingRequests) {
                    pendingRequests = [];
                    setTimeout(function () {
                        var combineDataPromise = self.unionPendingRequests(pendingRequests);
                        pendingRequests = null;
                        combineDataPromise.then(function (combinedData) {
                            forEach.call(combinedData, function (combined) {
                                var combinedSet = deepAssign({}, combined.set);
                                baseConnection.getListData(combinedSet).then(function (data) {
                                    if (combined.pendingRequests.length === 1) {
                                        combined.pendingRequests[0].deferred.resolve(data);
                                    } else {
                                        forEach.call(combined.pendingRequests, function (pending) {
                                            pending.deferred.resolve({ data: canSet.getSubset(pending.set, combined.set, getItems(data), self.algebra) });
                                        });
                                    }
                                }, function (err) {
                                    if (combined.pendingRequests.length === 1) {
                                        combined.pendingRequests[0].deferred.reject(err);
                                    } else {
                                        forEach.call(combined.pendingRequests, function (pending) {
                                            pending.deferred.reject(err);
                                        });
                                    }
                                });
                            });
                        });
                    }, this.time || 1);
                }
                var deferred = makeDeferred();
                pendingRequests.push({
                    deferred: deferred,
                    set: set
                });
                return deferred.promise;
            }
        };
    });
    module.exports = combineRequests;
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
/*can-connect@1.5.17#helpers/set-add*/
define('can-connect/helpers/set-add', [
    'require',
    'exports',
    'module',
    'can-set'
], function (require, exports, module) {
    var canSet = require('can-set');
    module.exports = function (connection, setItems, items, item, algebra) {
        var index = canSet.index(setItems, items, item, algebra);
        if (index === undefined) {
            index = items.length;
        }
        var copy = items.slice(0);
        copy.splice(index, 0, item);
        return copy;
    };
});
/*can-connect@1.5.17#helpers/get-index-by-id*/
define('can-connect/helpers/get-index-by-id', function (require, exports, module) {
    module.exports = function (connection, props, items) {
        var id = connection.id(props);
        for (var i = 0; i < items.length; i++) {
            var connId = connection.id(items[i]);
            if (id == connId) {
                return i;
            }
        }
        return -1;
    };
});
/*can-connect@1.5.17#data/localstorage-cache/localstorage-cache*/
define('can-connect/data/localstorage-cache/localstorage-cache', [
    'require',
    'exports',
    'module',
    'can-connect/helpers/get-items',
    'can-connect',
    'can-connect/helpers/sorted-set-json',
    'can-set',
    'can-connect/helpers/set-add',
    'can-connect/helpers/get-index-by-id',
    'can-util/js/assign/assign',
    'can-connect/helpers/overwrite'
], function (require, exports, module) {
    var getItems = require('can-connect/helpers/get-items');
    var connect = require('can-connect');
    var sortedSetJSON = require('can-connect/helpers/sorted-set-json');
    var canSet = require('can-set');
    var forEach = [].forEach;
    var map = [].map;
    var setAdd = require('can-connect/helpers/set-add');
    var indexOf = require('can-connect/helpers/get-index-by-id');
    var assign = require('can-util/js/assign/assign');
    var overwrite = require('can-connect/helpers/overwrite');
    module.exports = connect.behavior('data/localstorage-cache', function (baseConnection) {
        var behavior = {
            _instances: {},
            getSetData: function () {
                var sets = {};
                var self = this;
                forEach.call(JSON.parse(localStorage.getItem(this.name + '-sets')) || [], function (set) {
                    var setKey = sortedSetJSON(set);
                    if (localStorage.getItem(self.name + '/set/' + setKey)) {
                        sets[setKey] = {
                            set: set,
                            setKey: setKey
                        };
                    }
                });
                return sets;
            },
            _getSets: function (setData) {
                var sets = [];
                setData = setData || this.getSetData();
                for (var setKey in setData) {
                    sets.push(JSON.parse(setKey));
                }
                return sets;
            },
            getInstance: function (id) {
                var res = localStorage.getItem(this.name + '/instance/' + id);
                if (res) {
                    return JSON.parse(res);
                }
            },
            updateInstance: function (props) {
                var id = this.id(props);
                var instance = this.getInstance(id);
                if (!instance) {
                    instance = props;
                } else {
                    overwrite(instance, props, this.idProp);
                }
                localStorage.setItem(this.name + '/instance/' + id, JSON.stringify(instance));
                return instance;
            },
            getInstances: function (ids) {
                var self = this;
                return map.call(ids, function (id) {
                    return self.getInstance(id);
                });
            },
            removeSet: function (setKey) {
                var sets = this.getSetData();
                localStorage.removeItem(this.name + '/set/' + setKey);
                delete sets[setKey];
            },
            updateSets: function (sets) {
                var setData = this._getSets(sets);
                localStorage.setItem(this.name + '-sets', JSON.stringify(setData));
            },
            updateSet: function (setDatum, items, newSet) {
                var newSetKey = newSet ? sortedSetJSON(newSet) : setDatum.setKey;
                if (newSet) {
                    if (newSetKey !== setDatum.setKey) {
                        var sets = this.getSetData();
                        localStorage.removeItem(this.name + '/set/' + setDatum.setKey);
                        delete sets[setDatum.setKey];
                        sets[newSetKey] = {
                            setKey: newSetKey,
                            set: newSet
                        };
                        this.updateSets(sets);
                    }
                }
                setDatum.items = items;
                var self = this;
                var ids = map.call(items, function (item) {
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
                var ids = map.call(items, function (item) {
                    var id = self.id(item);
                    localStorage.setItem(self.name + '/instance/' + id, JSON.stringify(item));
                    return id;
                });
                localStorage.setItem(this.name + '/set/' + setKey, JSON.stringify(ids));
                this.updateSets(sets);
            },
            _eachSet: function (cb) {
                var sets = this.getSetData();
                var self = this;
                var loop = function (setDatum, setKey) {
                    return cb.call(self, setDatum, setKey, function () {
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
                var keys = [];
                for (var i = 0, len = localStorage.length; i < len; ++i) {
                    if (localStorage.key(i).indexOf(this.name + '/instance/') === 0) {
                        keys.push(localStorage.key(i));
                    }
                }
                forEach.call(keys, function (key) {
                    localStorage.removeItem(key);
                });
                this._instances = {};
            },
            getSets: function () {
                return Promise.resolve(this._getSets());
            },
            getListData: function (set) {
                set = set || {};
                var listData = this.getListDataSync(set);
                if (listData) {
                    return Promise.resolve(listData);
                }
                return Promise.reject({
                    message: 'no data',
                    error: 404
                });
            },
            getListDataSync: function (set) {
                var sets = this._getSets();
                for (var i = 0; i < sets.length; i++) {
                    var checkSet = sets[i];
                    if (canSet.subset(set, checkSet, this.algebra)) {
                        var items = canSet.getSubset(set, checkSet, this.__getListData(checkSet), this.algebra);
                        return { data: items };
                    }
                }
            },
            __getListData: function (set) {
                var setKey = sortedSetJSON(set);
                var setDatum = this.getSetData()[setKey];
                if (setDatum) {
                    var localData = localStorage.getItem(this.name + '/set/' + setKey);
                    if (localData) {
                        return this.getInstances(JSON.parse(localData));
                    }
                }
            },
            getData: function (params) {
                var id = this.id(params);
                var res = localStorage.getItem(this.name + '/instance/' + id);
                if (res) {
                    return Promise.resolve(JSON.parse(res));
                } else {
                    return Promise.reject({
                        message: 'no data',
                        error: 404
                    });
                }
            },
            updateListData: function (data, set) {
                set = set || {};
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
                var instance = this.updateInstance(props);
                this._eachSet(function (setDatum, setKey, getItems) {
                    if (canSet.has(setDatum.set, instance, this.algebra)) {
                        self.updateSet(setDatum, setAdd(self, setDatum.set, getItems(), instance, self.algebra), setDatum.set);
                    }
                });
                return Promise.resolve(assign({}, instance));
            },
            updateData: function (props) {
                var self = this;
                var instance = this.updateInstance(props);
                this._eachSet(function (setDatum, setKey, getItems) {
                    var items = getItems();
                    var index = indexOf(self, instance, items);
                    if (canSet.has(setDatum.set, instance, this.algebra)) {
                        if (index === -1) {
                            self.updateSet(setDatum, setAdd(self, setDatum.set, getItems(), instance, self.algebra));
                        } else {
                            items.splice(index, 1, instance);
                            self.updateSet(setDatum, items);
                        }
                    } else if (index !== -1) {
                        items.splice(index, 1);
                        self.updateSet(setDatum, items);
                    }
                });
                return Promise.resolve(assign({}, instance));
            },
            destroyData: function (props) {
                var self = this;
                var instance = this.updateInstance(props);
                this._eachSet(function (setDatum, setKey, getItems) {
                    var items = getItems();
                    var index = indexOf(self, instance, items);
                    if (index !== -1) {
                        items.splice(index, 1);
                        self.updateSet(setDatum, items);
                    }
                });
                var id = this.id(instance);
                localStorage.removeItem(this.name + '/instance/' + id);
                return Promise.resolve(assign({}, instance));
            }
        };
        return behavior;
    });
});
/*can-connect@1.5.17#helpers/clone-data*/
define('can-connect/helpers/clone-data', [
    'require',
    'exports',
    'module',
    'can-util/js/deep-assign/deep-assign'
], function (require, exports, module) {
    var deepAssign = require('can-util/js/deep-assign/deep-assign');
    module.exports = function (data) {
        return Array.isArray(data) ? data.slice(0) : deepAssign({}, data);
    };
});
/*can-connect@1.5.17#data/memory-cache/memory-cache*/
define('can-connect/data/memory-cache/memory-cache', [
    'require',
    'exports',
    'module',
    'can-connect/helpers/get-items',
    'can-connect',
    'can-connect/helpers/sorted-set-json',
    'can-set',
    'can-connect/helpers/overwrite',
    'can-connect/helpers/set-add',
    'can-connect/helpers/get-index-by-id',
    'can-util/js/assign/assign',
    'can-connect/helpers/clone-data'
], function (require, exports, module) {
    var getItems = require('can-connect/helpers/get-items');
    var connect = require('can-connect');
    var sortedSetJSON = require('can-connect/helpers/sorted-set-json');
    var canSet = require('can-set');
    var overwrite = require('can-connect/helpers/overwrite');
    var setAdd = require('can-connect/helpers/set-add');
    var indexOf = require('can-connect/helpers/get-index-by-id');
    var assign = require('can-util/js/assign/assign');
    var cloneData = require('can-connect/helpers/clone-data');
    module.exports = connect.behavior('data/memory-cache', function (baseConnection) {
        var behavior = {
            _sets: {},
            getSetData: function () {
                return this._sets;
            },
            __getListData: function (set) {
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
                        setDatum.set = assign({}, newSet);
                        this.removeSet(oldSetKey);
                    }
                }
                setDatum.items = items;
                var self = this;
                items.forEach(function (item) {
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
                    set: assign({}, set)
                };
                var self = this;
                items.forEach(function (item) {
                    self.updateInstance(item);
                });
                this.updateSets();
            },
            _eachSet: function (cb) {
                var sets = this.getSetData();
                var self = this;
                var loop = function (setDatum, setKey) {
                    return cb.call(self, setDatum, setKey, function () {
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
                set = set || {};
                var listData = this.getListDataSync(set);
                if (listData) {
                    return Promise.resolve(listData);
                }
                return Promise.reject({
                    message: 'no data',
                    error: 404
                });
            },
            getListDataSync: function (set) {
                var sets = this._getSets();
                for (var i = 0; i < sets.length; i++) {
                    var checkSet = sets[i];
                    if (canSet.subset(set, checkSet, this.algebra)) {
                        var source = this.__getListData(checkSet);
                        var items = canSet.getSubset(set, checkSet, source, this.algebra);
                        return {
                            data: items,
                            count: source.length
                        };
                    }
                }
            },
            _getListData: function (set) {
                return this.getListDataSync(set);
            },
            updateListData: function (data, set) {
                set = set || {};
                var clonedData = cloneData(data);
                var items = getItems(clonedData);
                var sets = this.getSetData();
                var self = this;
                for (var setKey in sets) {
                    var setDatum = sets[setKey];
                    var union = canSet.union(setDatum.set, set, this.algebra);
                    if (union) {
                        var getSet = assign({}, setDatum.set);
                        return this.getListData(getSet).then(function (setData) {
                            self.updateSet(setDatum, canSet.getUnion(getSet, set, getItems(setData), items, self.algebra), union);
                        });
                    }
                }
                this.addSet(set, clonedData);
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
                    if (canSet.has(setDatum.set, instance, this.algebra)) {
                        self.updateSet(setDatum, setAdd(self, setDatum.set, getItems(), instance, self.algebra), setDatum.set);
                    }
                });
                return Promise.resolve(assign({}, instance));
            },
            updateData: function (props) {
                var self = this;
                var instance = this.updateInstance(props);
                this._eachSet(function (setDatum, setKey, getItems) {
                    var items = getItems();
                    var index = indexOf(self, instance, items);
                    if (canSet.subset(instance, setDatum.set, this.algebra)) {
                        if (index === -1) {
                            self.updateSet(setDatum, setAdd(self, setDatum.set, getItems(), instance, self.algebra));
                        } else {
                            items.splice(index, 1, instance);
                            self.updateSet(setDatum, items);
                        }
                    } else if (index !== -1) {
                        items.splice(index, 1);
                        self.updateSet(setDatum, items);
                    }
                });
                return Promise.resolve(assign({}, instance));
            },
            destroyData: function (props) {
                var self = this;
                this._eachSet(function (setDatum, setKey, getItems) {
                    var items = getItems();
                    var index = indexOf(self, props, items);
                    if (index !== -1) {
                        items.splice(index, 1);
                        self.updateSet(setDatum, items);
                    }
                });
                var id = this.id(props);
                delete this._instances[id];
                return Promise.resolve(assign({}, props));
            }
        };
        return behavior;
    });
});
/*can-connect@1.5.17#data/parse/parse*/
define('can-connect/data/parse/parse', [
    'require',
    'exports',
    'module',
    'can-connect',
    'can-util/js/each/each',
    'can-util/js/get/get'
], function (require, exports, module) {
    var connect = require('can-connect');
    var each = require('can-util/js/each/each');
    var getObject = require('can-util/js/get/get');
    module.exports = connect.behavior('data/parse', function (baseConnection) {
        var behavior = {
            parseListData: function (responseData) {
                if (baseConnection.parseListData) {
                    responseData = baseConnection.parseListData.apply(this, arguments);
                }
                var result;
                if (Array.isArray(responseData)) {
                    result = { data: responseData };
                } else {
                    var prop = this.parseListProp || 'data';
                    responseData.data = getObject(responseData, prop);
                    result = responseData;
                    if (prop !== 'data') {
                        delete responseData[prop];
                    }
                    if (!Array.isArray(result.data)) {
                        throw new Error('Could not get any raw data while converting using .parseListData');
                    }
                }
                var arr = [];
                for (var i = 0; i < result.data.length; i++) {
                    arr.push(this.parseInstanceData(result.data[i]));
                }
                result.data = arr;
                return result;
            },
            parseInstanceData: function (props) {
                if (baseConnection.parseInstanceData) {
                    props = baseConnection.parseInstanceData.apply(this, arguments) || props;
                }
                return this.parseInstanceProp ? getObject(props, this.parseInstanceProp) || props : props;
            }
        };
        each(pairs, function (parseFunction, name) {
            behavior[name] = function (params) {
                var self = this;
                return baseConnection[name].call(this, params).then(function () {
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
/*can-connect@1.5.17#helpers/get-id-props*/
define('can-connect/helpers/get-id-props', function (require, exports, module) {
    module.exports = function (connection) {
        var ids = [], algebra = connection.algebra;
        if (algebra && algebra.clauses && algebra.clauses.id) {
            for (var prop in algebra.clauses.id) {
                ids.push(prop);
            }
        }
        if (connection.idProp && !ids.length) {
            ids.push(connection.idProp);
        }
        if (!ids.length) {
            ids.push('id');
        }
        return ids;
    };
});
/*can-connect@1.5.17#data/url/url*/
define('can-connect/data/url/url', [
    'require',
    'exports',
    'module',
    'can-util/js/assign/assign',
    'can-util/js/each/each',
    'can-ajax',
    'can-util/js/string/string',
    'can-connect/helpers/get-id-props',
    'can-util/js/dev/dev',
    'can-connect',
    'can-make-rest',
    'can-util/js/make-promise/make-promise'
], function (require, exports, module) {
    var assign = require('can-util/js/assign/assign');
    var each = require('can-util/js/each/each');
    var ajax = require('can-ajax');
    var string = require('can-util/js/string/string');
    var getIdProps = require('can-connect/helpers/get-id-props');
    var dev = require('can-util/js/dev/dev');
    var connect = require('can-connect');
    var makeRest = require('can-make-rest');
    var defaultRest = makeRest('/resource/{id}');
    var makePromise = require('can-util/js/make-promise/make-promise');
    var urlBehavior = connect.behavior('data/url', function (baseConnection) {
        var behavior = {};
        each(defaultRest, function (defaultData, dataInterfaceName) {
            behavior[dataInterfaceName] = function (params) {
                var meta = methodMetaData[dataInterfaceName];
                if (typeof this.url === 'object') {
                    if (typeof this.url[dataInterfaceName] === 'function') {
                        return makePromise(this.url[dataInterfaceName](params));
                    } else if (this.url[dataInterfaceName]) {
                        var promise = makeAjax(this.url[dataInterfaceName], params, defaultData.method, this.ajax || ajax, findContentType(this.url, defaultData.method), meta);
                        return makePromise(promise);
                    }
                }
                var resource = typeof this.url === 'string' ? this.url : this.url.resource;
                if (resource) {
                    var idProps = getIdProps(this);
                    var resourceWithoutTrailingSlashes = resource.replace(/\/+$/, '');
                    var result = makeRest(resourceWithoutTrailingSlashes, idProps[0])[dataInterfaceName];
                    return makePromise(makeAjax(result.url, params, result.method, this.ajax || ajax, findContentType(this.url, result.method), meta));
                }
                return baseConnection[name].call(this, params);
            };
        });
        return behavior;
    });
    var methodMetaData = {
        getListData: {},
        getData: {},
        createData: {},
        updateData: {},
        destroyData: { includeData: false }
    };
    var findContentType = function (url, method) {
        if (typeof url === 'object' && url.contentType) {
            var acceptableType = url.contentType === 'application/x-www-form-urlencoded' || url.contentType === 'application/json';
            if (acceptableType) {
                return url.contentType;
            } else {
            }
        }
        return method === 'GET' ? 'application/x-www-form-urlencoded' : 'application/json';
    };
    function urlParamEncoder(key, value) {
        return encodeURIComponent(value);
    }
    var makeAjax = function (ajaxOb, data, type, ajax, contentType, reqOptions) {
        var params = {};
        if (typeof ajaxOb === 'string') {
            var parts = ajaxOb.split(/\s+/);
            params.url = parts.pop();
            if (parts.length) {
                params.type = parts.pop();
            }
        } else {
            assign(params, ajaxOb);
        }
        params.data = typeof data === 'object' && !Array.isArray(data) ? assign(params.data || {}, data) : data;
        params.url = string.replaceWith(params.url, params.data, urlParamEncoder, true);
        params.contentType = contentType;
        if (reqOptions.includeData === false) {
            delete params.data;
        }
        return ajax(assign({
            type: type || 'post',
            dataType: 'json'
        }, params));
    };
    module.exports = urlBehavior;
});
/*can-connect@1.5.17#fall-through-cache/fall-through-cache*/
define('can-connect/fall-through-cache/fall-through-cache', [
    'require',
    'exports',
    'module',
    'can-connect',
    'can-connect/helpers/sorted-set-json',
    'can-util/js/log/log'
], function (require, exports, module) {
    var connect = require('can-connect');
    var sortedSetJSON = require('can-connect/helpers/sorted-set-json');
    var canLog = require('can-util/js/log/log');
    var fallThroughCache = connect.behavior('fall-through-cache', function (baseConnection) {
        var behavior = {
            hydrateList: function (listData, set) {
                set = set || this.listSet(listData);
                var id = sortedSetJSON(set);
                var list = baseConnection.hydrateList.call(this, listData, set);
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
                set = set || {};
                var self = this;
                return this.cacheConnection.getListData(set).then(function (data) {
                    self._getHydrateList(set, function (list) {
                        self.addListReference(list, set);
                        setTimeout(function () {
                            baseConnection.getListData.call(self, set).then(function (listData) {
                                self.cacheConnection.updateListData(listData, set);
                                self.updatedList(list, listData, set);
                                self.deleteListReference(list, set);
                            }, function (e) {
                                canLog.log('REJECTED', e);
                            });
                        }, 1);
                    });
                    return data;
                }, function () {
                    var listData = baseConnection.getListData.call(self, set);
                    listData.then(function (listData) {
                        self.cacheConnection.updateListData(listData, set);
                    });
                    return listData;
                });
            },
            hydrateInstance: function (props) {
                var id = this.id(props);
                var instance = baseConnection.hydrateInstance.apply(this, arguments);
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
                            baseConnection.getData.call(self, params).then(function (instanceData2) {
                                self.cacheConnection.updateData(instanceData2);
                                self.updatedInstance(instance, instanceData2);
                                self.deleteInstanceReference(instance);
                            }, function (e) {
                                canLog.log('REJECTED', e);
                            });
                        }, 1);
                    });
                    return instanceData;
                }, function () {
                    var listData = baseConnection.getData.call(self, params);
                    listData.then(function (instanceData) {
                        self.cacheConnection.updateData(instanceData);
                    });
                    return listData;
                });
            }
        };
        return behavior;
    });
    module.exports = fallThroughCache;
});
/*can-connect@1.5.17#real-time/real-time*/
define('can-connect/real-time/real-time', [
    'require',
    'exports',
    'module',
    'can-connect',
    'can-set',
    'can-connect/helpers/set-add',
    'can-connect/helpers/get-index-by-id',
    'can-util/js/dev/dev'
], function (require, exports, module) {
    var connect = require('can-connect');
    var canSet = require('can-set');
    var setAdd = require('can-connect/helpers/set-add');
    var indexOf = require('can-connect/helpers/get-index-by-id');
    var canDev = require('can-util/js/dev/dev');
    module.exports = connect.behavior('real-time', function (baseConnection) {
        var createPromise = Promise.resolve();
        return {
            createData: function () {
                var promise = baseConnection.createData.apply(this, arguments);
                var cleanPromise = promise.catch(function () {
                    return '';
                });
                createPromise = Promise.all([
                    createPromise,
                    cleanPromise
                ]);
                return promise;
            },
            createInstance: function (props) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    createPromise.then(function () {
                        setTimeout(function () {
                            var id = self.id(props);
                            var instance = self.instanceStore.get(id);
                            var serialized;
                            if (instance) {
                                resolve(self.updateInstance(props));
                            } else {
                                instance = self.hydrateInstance(props);
                                serialized = self.serializeInstance(instance);
                                self.addInstanceReference(instance);
                                Promise.resolve(self.createdData(props, serialized)).then(function () {
                                    self.deleteInstanceReference(instance);
                                    resolve(instance);
                                });
                            }
                        }, 1);
                    });
                });
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
                this.destroyedInstance(instance, props);
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
    var create = function (props) {
        var self = this;
        this.listStore.forEach(function (list, id) {
            var set = JSON.parse(id);
            var index = indexOf(self, props, list);
            if (canSet.has(set, props, self.algebra)) {
                if (index === -1) {
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
            var items;
            var set = JSON.parse(id);
            var index = indexOf(self, props, list);
            if (canSet.has(set, props, self.algebra)) {
                items = self.serializeList(list);
                if (index === -1) {
                    self.updatedList(list, { data: setAdd(self, set, items, props, self.algebra) }, set);
                } else {
                    var sortedIndex = canSet.index(set, items, props, self.algebra);
                    if (sortedIndex !== undefined && sortedIndex !== index) {
                        var copy = items.slice(0);
                        if (index < sortedIndex) {
                            copy.splice(sortedIndex, 0, props);
                            copy.splice(index, 1);
                        } else {
                            copy.splice(index, 1);
                            copy.splice(sortedIndex, 0, props);
                        }
                        self.updatedList(list, { data: copy }, set);
                    }
                }
            } else if (index !== -1) {
                items = self.serializeList(list);
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
            if (index !== -1) {
                var items = self.serializeList(list);
                items.splice(index, 1);
                self.updatedList(list, { data: items }, set);
            }
        });
    };
});
/*can-connect@1.5.17#can/map/map*/
define('can-connect/can/map/map', [
    'require',
    'exports',
    'module',
    'can-util/js/each/each',
    'can-connect',
    'can-event/batch/batch',
    'can-event',
    'can-observation',
    'can-util/js/is-plain-object/is-plain-object',
    'can-types',
    'can-util/js/each/each',
    'can-util/js/is-function/is-function',
    'can-util/js/dev/dev',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var each = require('can-util/js/each/each');
    var connect = require('can-connect');
    var canBatch = require('can-event/batch/batch');
    var canEvent = require('can-event');
    var Observation = require('can-observation');
    var isPlainObject = require('can-util/js/is-plain-object/is-plain-object');
    var types = require('can-types');
    var each = require('can-util/js/each/each');
    var isFunction = require('can-util/js/is-function/is-function');
    var dev = require('can-util/js/dev/dev');
    var canReflect = require('can-reflect');
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
    var canMapBehavior = connect.behavior('can/map', function (baseConnection) {
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
                            ids.push(readObservable(instance, prop));
                        }
                    }
                    if (this.idProp && !ids.length) {
                        ids.push(readObservable(instance, this.idProp));
                    }
                    if (!ids.length) {
                        ids.push(readObservable(instance, 'id'));
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
                if (props && typeof props === 'object') {
                    if (this.constructor.removeAttr) {
                        canReflect.updateDeep(instance, props);
                    } else {
                        canReflect.assignDeep(instance, props);
                    }
                }
                if (funcName === 'created' && this.moveCreatedInstanceToInstanceStore) {
                    this.moveCreatedInstanceToInstanceStore(instance);
                }
                canMapBehavior.callbackInstanceEvents(funcName, instance);
            };
        });
        return behavior;
    });
    canMapBehavior.callbackInstanceEvents = function (funcName, instance) {
        var constructor = instance.constructor;
        canBatch.start();
        canEvent.dispatch.call(instance, {
            type: funcName,
            target: instance
        });
        canEvent.dispatch.call(constructor, funcName, [instance]);
        canBatch.stop();
    };
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
                if (connection.addInstanceReference) {
                    connection.addInstanceReference(this);
                }
                callCanReadingOnIdRead = true;
                return base.apply(this, arguments);
            };
        },
        _eventTeardown: function (base, connection) {
            return function () {
                callCanReadingOnIdRead = false;
                if (connection.deleteInstanceReference) {
                    connection.deleteInstanceReference(this);
                }
                callCanReadingOnIdRead = true;
                return base.apply(this, arguments);
            };
        },
        ___set: function (base, connection) {
            return function (prop, val) {
                base.apply(this, arguments);
                if (prop === connection.idProp && this.__bindEvents && this.__bindEvents._lifecycleBindings) {
                    connection.addInstanceReference(this);
                }
            };
        },
        isNew: function (base, connection) {
            return function () {
                return connection.isNew(this);
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
                if (isPlainObject(params) && !Array.isArray(params)) {
                    this.__listSet = params;
                    base.apply(this);
                    this.replace(canReflect.isPromise(params) ? params : connection.getList(params));
                } else {
                    base.apply(this, arguments);
                }
            };
        },
        _eventSetup: function (base, connection) {
            return function () {
                if (connection.addListReference) {
                    connection.addListReference(this);
                }
                if (base) {
                    return base.apply(this, arguments);
                }
            };
        },
        _eventTeardown: function (base, connection) {
            return function () {
                if (connection.deleteListReference) {
                    connection.deleteListReference(this);
                }
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
    var readObservable = function (instance, prop) {
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
    module.exports = canMapBehavior;
});
/*can-connect@1.5.17#can/ref/ref*/
define('can-connect/can/ref/ref', [
    'require',
    'exports',
    'module',
    'can-connect',
    'can-connect/helpers/get-id-props',
    'can-connect/helpers/weak-reference-map',
    'can-observation',
    'can-connect/constructor/store/store',
    'can-define'
], function (require, exports, module) {
    var connect = require('can-connect');
    var getIdProps = require('can-connect/helpers/get-id-props');
    var WeakReferenceMap = require('can-connect/helpers/weak-reference-map');
    var Observation = require('can-observation');
    var constructorStore = require('can-connect/constructor/store/store');
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
});
/*can-connect@1.5.17#can/super-map/super-map*/
define('can-connect/can/super-map/super-map', [
    'require',
    'exports',
    'module',
    'can-connect',
    'can-connect/constructor/constructor',
    'can-connect/can/map/map',
    'can-connect/can/ref/ref',
    'can-connect/constructor/store/store',
    'can-connect/data/callbacks/callbacks',
    'can-connect/data/callbacks-cache/callbacks-cache',
    'can-connect/data/combine-requests/combine-requests',
    'can-connect/data/localstorage-cache/localstorage-cache',
    'can-connect/data/parse/parse',
    'can-connect/data/url/url',
    'can-connect/fall-through-cache/fall-through-cache',
    'can-connect/real-time/real-time',
    'can-connect/constructor/callbacks-once/callbacks-once',
    'can-util/js/global/global'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        var connect = require('can-connect');
        var constructor = require('can-connect/constructor/constructor');
        var canMap = require('can-connect/can/map/map');
        var canRef = require('can-connect/can/ref/ref');
        var constructorStore = require('can-connect/constructor/store/store');
        var dataCallbacks = require('can-connect/data/callbacks/callbacks');
        var callbacksCache = require('can-connect/data/callbacks-cache/callbacks-cache');
        var combineRequests = require('can-connect/data/combine-requests/combine-requests');
        var localCache = require('can-connect/data/localstorage-cache/localstorage-cache');
        var dataParse = require('can-connect/data/parse/parse');
        var dataUrl = require('can-connect/data/url/url');
        var fallThroughCache = require('can-connect/fall-through-cache/fall-through-cache');
        var realTime = require('can-connect/real-time/real-time');
        var callbacksOnce = require('can-connect/constructor/callbacks-once/callbacks-once');
        var GLOBAL = require('can-util/js/global/global');
        var $ = GLOBAL().$;
        connect.superMap = function (options) {
            var behaviors = [
                constructor,
                canMap,
                canRef,
                constructorStore,
                dataCallbacks,
                combineRequests,
                dataParse,
                dataUrl,
                realTime,
                callbacksOnce
            ];
            if (typeof localStorage !== 'undefined') {
                if (!options.cacheConnection) {
                    options.cacheConnection = connect([localCache], {
                        name: options.name + 'Cache',
                        idProp: options.idProp,
                        algebra: options.algebra
                    });
                }
                behaviors.push(callbacksCache, fallThroughCache);
            }
            if ($ && $.ajax) {
                options.ajax = $.ajax;
            }
            return connect(behaviors, options);
        };
        module.exports = connect.superMap;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-connect@1.5.17#can/tag/tag*/
define('can-connect/can/tag/tag', [
    'require',
    'exports',
    'module',
    'can-stache-bindings',
    'can-connect',
    'can-compute',
    'can-stache/src/expression',
    'can-view-callbacks',
    'can-observation',
    'can-view-nodelist',
    'can-event',
    'can-util/js/each/each',
    'can-util/dom/mutate/mutate',
    'can-util/dom/data/data',
    'can-util/dom/events/removed/removed'
], function (require, exports, module) {
    require('can-stache-bindings');
    var connect = require('can-connect');
    var compute = require('can-compute');
    var expression = require('can-stache/src/expression');
    var viewCallbacks = require('can-view-callbacks');
    var Observation = require('can-observation');
    var nodeLists = require('can-view-nodelist');
    var canEvent = require('can-event');
    var each = require('can-util/js/each/each');
    var domMutate = require('can-util/dom/mutate/mutate');
    var domData = require('can-util/dom/data/data');
    require('can-util/dom/events/removed/removed');
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
        viewCallbacks.tag(tagName, function (el, tagData) {
            var getList = el.getAttribute('getList') || el.getAttribute('get-list');
            var getInstance = el.getAttribute('get');
            var attrValue = getList || getInstance;
            var method = getList ? 'getList' : 'get';
            var attrInfo = expression.parse('tmp(' + removeBrackets(attrValue) + ')', { baseMethodType: 'Call' });
            var addedToPageData = false;
            var addToPageData = Observation.ignore(function (set, promise) {
                if (!addedToPageData) {
                    var root = tagData.scope.peek('%root') || tagData.scope.peek('@root');
                    if (root && root.pageData) {
                        if (method === 'get') {
                            set = connection.id(set);
                        }
                        root.pageData(connection.name, set, promise);
                    }
                }
                addedToPageData = true;
            });
            var request = compute(function () {
                var hash = {};
                if (typeof attrInfo.hash === 'object') {
                    each(attrInfo.hash, function (val, key) {
                        if (val && val.hasOwnProperty('get')) {
                            hash[key] = tagData.scope.read(val.get, {}).value;
                        } else {
                            hash[key] = val;
                        }
                    });
                } else if (typeof attrInfo.hash === 'function') {
                    var getHash = attrInfo.hash(tagData.scope, tagData.options, {});
                    each(getHash(), function (val, key) {
                        hash[key] = convertToValue(val);
                    });
                } else {
                    hash = attrInfo.argExprs.length ? attrInfo.argExprs[0].value(tagData.scope, tagData.options)() : {};
                }
                var promise = connection[method](hash);
                addToPageData(hash, promise);
                return promise;
            });
            domData.set.call(el, 'viewModel', request);
            var nodeList = nodeLists.register([], undefined, tagData.parentNodeList || true);
            var frag = tagData.subtemplate ? tagData.subtemplate(tagData.scope.add(request), tagData.options, nodeList) : document.createDocumentFragment();
            domMutate.appendChild.call(el, frag);
            nodeLists.update(nodeList, el.childNodes);
            canEvent.one.call(el, 'removed', function () {
                nodeLists.unregister(nodeList);
            });
        });
    };
    module.exports = connect.tag;
});
/*can-connect@1.5.17#can/base-map/base-map*/
define('can-connect/can/base-map/base-map', [
    'require',
    'exports',
    'module',
    'can-connect',
    'can-connect/constructor/constructor',
    'can-connect/can/map/map',
    'can-connect/can/ref/ref',
    'can-connect/constructor/store/store',
    'can-connect/data/callbacks/callbacks',
    'can-connect/data/callbacks-cache/callbacks-cache',
    'can-connect/data/parse/parse',
    'can-connect/data/url/url',
    'can-connect/real-time/real-time',
    'can-connect/constructor/callbacks-once/callbacks-once',
    'can-util/js/global/global'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        var connect = require('can-connect');
        var constructor = require('can-connect/constructor/constructor');
        var canMap = require('can-connect/can/map/map');
        var canRef = require('can-connect/can/ref/ref');
        var constructorStore = require('can-connect/constructor/store/store');
        var dataCallbacks = require('can-connect/data/callbacks/callbacks');
        var callbacksCache = require('can-connect/data/callbacks-cache/callbacks-cache');
        var dataParse = require('can-connect/data/parse/parse');
        var dataUrl = require('can-connect/data/url/url');
        var realTime = require('can-connect/real-time/real-time');
        var callbacksOnce = require('can-connect/constructor/callbacks-once/callbacks-once');
        var GLOBAL = require('can-util/js/global/global');
        var $ = GLOBAL().$;
        connect.baseMap = function (options) {
            var behaviors = [
                constructor,
                canMap,
                canRef,
                constructorStore,
                dataCallbacks,
                dataParse,
                dataUrl,
                realTime,
                callbacksOnce
            ];
            if ($ && $.ajax) {
                options.ajax = $.ajax;
            }
            return connect(behaviors, options);
        };
        module.exports = connect.baseMap;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-connect@1.5.17#all*/
define('can-connect/all', [
    'require',
    'exports',
    'module',
    'can-connect',
    'can-connect/cache-requests/cache-requests',
    'can-connect/constructor/constructor',
    'can-connect/constructor/callbacks-once/callbacks-once',
    'can-connect/constructor/store/store',
    'can-connect/data/callbacks/callbacks',
    'can-connect/data/callbacks-cache/callbacks-cache',
    'can-connect/data/combine-requests/combine-requests',
    'can-connect/data/localstorage-cache/localstorage-cache',
    'can-connect/data/memory-cache/memory-cache',
    'can-connect/data/parse/parse',
    'can-connect/data/url/url',
    'can-connect/fall-through-cache/fall-through-cache',
    'can-connect/real-time/real-time',
    'can-connect/can/super-map/super-map',
    'can-connect/can/tag/tag',
    'can-connect/can/base-map/base-map'
], function (require, exports, module) {
    var connect = require('can-connect');
    connect.cacheRequests = require('can-connect/cache-requests/cache-requests');
    connect.constructor = require('can-connect/constructor/constructor');
    connect.constructorCallbacksOnce = require('can-connect/constructor/callbacks-once/callbacks-once');
    connect.constructorStore = require('can-connect/constructor/store/store');
    connect.dataCallbacks = require('can-connect/data/callbacks/callbacks');
    connect.dataCallbacksCache = require('can-connect/data/callbacks-cache/callbacks-cache');
    connect.dataCombineRequests = require('can-connect/data/combine-requests/combine-requests');
    connect.dataLocalStorageCache = require('can-connect/data/localstorage-cache/localstorage-cache');
    connect.dataMemoryCache = require('can-connect/data/memory-cache/memory-cache');
    connect.dataParse = require('can-connect/data/parse/parse');
    connect.dataUrl = require('can-connect/data/url/url');
    connect.fallThroughCache = require('can-connect/fall-through-cache/fall-through-cache');
    connect.realTime = require('can-connect/real-time/real-time');
    connect.superMap = require('can-connect/can/super-map/super-map');
    connect.tag = require('can-connect/can/tag/tag');
    connect.baseMap = require('can-connect/can/base-map/base-map');
    module.exports = connect;
});
/*[global-shim-end]*/
(function(global) { // jshint ignore:line
	global._define = global.define;
	global.define = global.define.orig;
}
)(typeof self == "object" && self.Object == Object ? self : window);
//# sourceMappingURL=all.js.map