require("when/es6-shim/Promise");
var helpers = require("can-connect/helpers/");

var slice = [].slice;

// from https://gist.github.com/mythz/1334560
var xhrs = [
       function () { return new XMLHttpRequest(); },
       function () { return new ActiveXObject("Microsoft.XMLHTTP"); },
       function () { return new ActiveXObject("MSXML2.XMLHTTP.3.0"); },
       function () { return new ActiveXObject("MSXML2.XMLHTTP"); }
    ],
    _xhrf = null;
var hasOwnProperty = Object.prototype.hasOwnProperty,
    nativeForEach = Array.prototype.forEach;

var $ = {};
$.xhr = function () {
    if (_xhrf != null) return _xhrf();
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
    return function () { };
};
$._xhrResp = function (xhr) {
    switch (xhr.getResponseHeader("Content-Type").split(";")[0]) {
        case "text/xml":
            return xhr.responseXML;
        case "text/json":
        case "application/json":
        case "text/javascript":
        case "application/javascript":
        case "application/x-javascript":
            return JSON.parse(xhr.responseText);
        default:
            return xhr.responseText;
    }
};
$._formData = function (o) {
    var kvps = [], regEx = /%20/g;
    for (var k in o) kvps.push(encodeURIComponent(k).replace(regEx, "+") + "=" + encodeURIComponent(o[k].toString()).replace(regEx, "+"));
    return kvps.join('&');
};
module.exports = function (o) {
    var xhr = $.xhr(), timer, n = 0;
    var deferred = helpers.deferred();

    o = helpers.extend({ userAgent: "XMLHttpRequest", lang: "en", type: "GET", data: null, dataType: "application/x-www-form-urlencoded" }, o);
    if (o.timeout) timer = setTimeout(function () { xhr.abort(); if (o.timeoutFn) o.timeoutFn(o.url); }, o.timeout);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (timer) clearTimeout(timer);
            if (xhr.status < 300) {
                if (o.success) o.success($._xhrResp(xhr));
            }
            else if (o.error) o.error(xhr, xhr.status, xhr.statusText);
            if (o.complete) o.complete(xhr, xhr.statusText);

	    	if( xhr.status == 200 ) {
	    		deferred.resolve( JSON.parse( xhr.responseText ) );
	    	} else {
	    		deferred.reject( JSON.parse( xhr.responseText ) );
	    	}
        }
        else if (o.progress) o.progress(++n);
    };
    var url = o.url, data = null;
    var isPost = o.type == "POST" || o.type == "PUT";
    if (!isPost && o.data) url += "?" + $._formData(o.data);
        xhr.open(o.type, url);

        if (isPost) {
            var isJson = o.dataType.indexOf("json") >= 0;
        data = isJson ? JSON.stringify(o.data) : $._formData(o.data);
        xhr.setRequestHeader("Content-Type", isJson ? "application/json" : "application/x-www-form-urlencoded");
    }

    xhr.send(data);
    return deferred.promise;
};
