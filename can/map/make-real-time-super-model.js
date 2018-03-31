var constructor = require("can-connect/constructor/");
var canMap = require("can-connect/can/map/");
//var canRef = require("can-connect/can/ref/");
var constructorStore = require("can-connect/constructor/store/");
var dataCallbacks = require("can-connect/data/callbacks/");
var callbacksCache = require("can-connect/data/callbacks-cache/");
var combineRequests = require("can-connect/data/combine-requests/");
var localCache = require("can-connect/data/localstorage-cache/");
var dataParse = require("can-connect/data/parse/");
var dataUrl = require("can-connect/data/url/");
var fallThroughCache = require("can-connect/fall-through-cache/");
var realTime = require("can-connect/real-time/");
var connect = require("can-connect/can-connect");
var canSet = require("can-query/compat/compat");

module.exports = function(Todo, TodoList){
    var algebra = new canSet.Algebra();

    var cacheConnection = connect([localCache],{
        name: "todos",
        algebra: algebra
    });
    cacheConnection.clear();


    return connect([
        constructor,
        canMap,
        constructorStore,
        dataCallbacks,
        callbacksCache,
        combineRequests,
        dataParse,
        dataUrl,
        fallThroughCache,
        realTime],
        {
            url: "/services/todos",
            cacheConnection: cacheConnection,
            Map: Todo,
            List: TodoList,
            algebra: algebra
        });

};
