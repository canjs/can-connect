@property {String|Object} can-connect/data/url/url.url url
@parent can-connect/data/url/url.option

Specify the url and methods that should be used for the "Data Methods".

@option {String} If a string is provided, it's assumed to be a RESTful interface. For example,
if the following is provided:

```
url: "/services/todos"
```

... the following methods and requests are used:

 - `getListData` - `GET /services/todos`
 - `getData` - `GET /services/todos/{id}`
 - `createData` - `POST /services/todos`
 - `updateData` - `PUT /services/todos/{id}`
 - `destroyData` - `DELETE /services/todos/{id}`

@option {Object} If an object is provided, it can customize each method and URL directly
like:

 @sourceref ./plain-endpoints.html
 @highlight 23-29,only
 @codepen

You can provide a `resource` property that works like providing `url` as a string, but overwrite
other values like:

 @sourceref ./resource-param.html
 @highlight 25,only
 @codepen

You can also customize per-method the parameters passed to the [can-connect/data/url/url.ajax ajax implementation], like:
 @sourceref ./request-params.html
 @highlight 30-36,only
 @codepen
This can be particularly useful for passing a handler for the [can-ajax <code>beforeSend</code>] hook.

<a id="beforeSend"></a>
The [can-ajax <code>beforeSend</code>] hook can also be passed for all request methods. This can be useful when
attaching a session token header to a request:

 @sourceref ./beforeSend-all.html
 @highlight 25-27,only
 @codepen

Finally, you can provide your own method to totally control how the request is made:

 @sourceref ./custom-request.html
 @highlight 27-32,only
 @codepen