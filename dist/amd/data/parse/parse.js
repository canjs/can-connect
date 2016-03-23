/*can-connect@0.5.0-pre.2#data/parse/parse*/
define(function (require, exports, module) {
    var isArray = require('../../helpers/helpers').isArray;
    var connect = require('../../can-connect');
    var helpers = require('../../helpers/helpers');
    module.exports = connect.behavior('data-parse', function (baseConnect) {
        var behavior = {
                parseListData: function (responseData) {
                    if (baseConnect.parseListData) {
                        responseData = baseConnect.parseListData.apply(this, arguments);
                    }
                    var result;
                    if (isArray(responseData)) {
                        result = { data: responseData };
                    } else {
                        var prop = this.parseListProp || 'data';
                        responseData.data = helpers.getObject(prop, responseData);
                        result = responseData;
                        if (prop !== 'data') {
                            delete responseData[prop];
                        }
                        if (!isArray(result.data)) {
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
                    if (baseConnect.parseInstanceData) {
                        props = baseConnect.parseInstanceData.apply(this, arguments) || props;
                    }
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
//# sourceMappingURL=parse.js.map