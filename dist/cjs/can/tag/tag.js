/*can-connect@1.5.17#can/tag/tag*/
require('can-stache-bindings');
var connect = require('../../can-connect.js');
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
//# sourceMappingURL=tag.js.map