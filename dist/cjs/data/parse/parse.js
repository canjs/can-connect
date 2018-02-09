/*can-connect@1.5.17#data/parse/parse*/
var connect = require('../../can-connect.js');
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
//# sourceMappingURL=parse.js.map