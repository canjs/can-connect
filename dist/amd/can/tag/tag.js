/*can-connect@0.5.0-pre.2#can/tag/tag*/
define(function (require, exports, module) {
    var connect = require('../../can-connect');
    var can = require('can/util');
    require('can/compute');
    require('can/view/bindings');
    require('../can');
    var expression = require('can/view/stache/expression');
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
            var attrInfo = expression.parse('tmp(' + removeBrackets(attrValue) + ')', { baseMethodType: 'Call' });
            var addedToPageData = false;
            var addToPageData = can.__notObserve(function (set, promise) {
                    if (!addedToPageData) {
                        var root = tagData.scope.attr('%root') || tagData.scope.attr('@root');
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
                    } else if (typeof attrInfo.hash === 'function') {
                        var getHash = attrInfo.hash(tagData.scope, tagData.options, {});
                        can.each(getHash(), function (val, key) {
                            hash[key] = convertToValue(val);
                        });
                    } else {
                        hash = attrInfo.argExprs.length ? attrInfo.argExprs[0].value(tagData.scope, tagData.options)() : {};
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
//# sourceMappingURL=tag.js.map