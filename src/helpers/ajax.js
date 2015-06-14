require("when/es6-shim/Promise");
var helpers = require("can-connect/helpers/");

var slice = [].slice;

// from https://gist.github.com/mythz/1334560
var win=window, xhrs = [
       function () { return new XMLHttpRequest(); },
       function () { return new ActiveXObject("Microsoft.XMLHTTP"); },
       function () { return new ActiveXObject("MSXML2.XMLHTTP.3.0"); },
       function () { return new ActiveXObject("MSXML2.XMLHTTP"); }
    ],
    _xhrf = null;
var hasOwnProperty = Object.prototype.hasOwnProperty,
    nativeForEach = Array.prototype.forEach;
var _each = function (o, fn, ctx) {
    if (o == null) return;
    if (nativeForEach && o.forEach === nativeForEach)
        o.forEach(fn, ctx);
    else if (o.length === +o.length) {
        for (var i = 0, l = o.length; i < l; i++)
            if (i in o && fn.call(ctx, o[i], i, o) === breaker) return;
    } else {
        for (var key in o)
            if (hasOwnProperty.call(o, key))
                if (fn.call(ctx, o[key], key, o) === breaker) return;
}
};
var _extend = function (o) {
    _each(slice.call(arguments, 1), function (a) {
    for (var p in a) if (a[p] !== void 0) o[p] = a[p];
    });
    return o;
};

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
            return win.JSON ? JSON.parse(xhr.responseText) : eval(xhr.responseText);
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
    o = _extend({ userAgent: "XMLHttpRequest", lang: "en", type: "GET", data: null, dataType: "application/x-www-form-urlencoded" }, o);
    if (o.timeout) timer = setTimeout(function () { xhr.abort(); if (o.timeoutFn) o.timeoutFn(o.url); }, o.timeout);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (timer) clearTimeout(timer);
            if (xhr.status < 300) {
                if (o.success) o.success($._xhrResp(xhr));
            }
            else if (o.error) o.error(xhr, xhr.status, xhr.statusText);
            if (o.complete) o.complete(xhr, xhr.statusText);
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
    
    var deferred = helpers.deferred();
    
    xhr.onreadystagechange = function() {
	    if(xhr.readyState == 4 ) {
	    	if( xhr.status == 200 ) {
	    		deferred.resolve( JSON.parse( xhr.responseText ) );
	    	} else {
	    		deferred.reject( JSON.parse( xhr.responseText ) );
	    	}
	        
	    }
	};
    
    xhr.send(data);
    return deferred.promise;
};