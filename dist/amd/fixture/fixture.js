/*can-connect@0.2.7#fixture/fixture*/
define(function (require, exports, module) {
    var helpers = require('../helpers/helpers');
    var canSet = require('can-set');
    var deparam = require('../helpers/deparam');
    var helpers = require('../helpers/helpers');
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
//# sourceMappingURL=fixture.js.map