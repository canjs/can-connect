/*can-connect@0.2.7#data/parse/parse*/
var connect = require('../../can-connect.js');
var helpers = require('../../helpers/helpers.js');
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
//# sourceMappingURL=parse.js.map