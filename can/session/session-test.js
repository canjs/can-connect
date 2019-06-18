var QUnit = require("steal-qunit");
var DefineMap = require('can-define/map/map');
var fixture = require('can-fixture');
var Observation = require('can-observation');

var base = require ('../../base/base');
var canMap = require ('../map/map');
var constructor = require ('../../constructor/constructor');
var dataUrl = require ('../../data/url/url');
var sessionBehavior = require('./session');

var sessionParams = {
	token: 'string',
	username: 'string',
	expires: 'number',
	isAdmin: 'boolean',
};

var sessionResponse = {
	token: 'DUMMY.TOKEN',
	username: 'nils',
	expires: 55555555555,
	isAdmin: false,
};

function setupFixtures(fixtureType) {
	var isCookie = fixtureType === 'cookie';
	var authSchemeName = isCookie ? "Cookie" : "Bearer";

	fixture(
		{ method: "get", url: "/api/session" },
		( request, response, headers, ajaxSettings ) => {
			QUnit.assert.ok(true, 'GET /api/session called');

			const token = isCookie ? (request.headers['Fake-Cookie'] || '').split('=')[1]
				: (request.headers.Authorization || '').split(' ')[1];

			if (token === sessionResponse.token) {
				return sessionResponse;
			} else {
				response(
					401,
					{},
					{ "WWW-Authenticate": authSchemeName + " realm=\"testing fixtures\"" },
					"Authorization Failed"
				);
			}
		}
	);

	fixture(
		{ method: "post", url: "/api/session" },
		( request, response, headers, ajaxSettings ) => {
			QUnit.assert.ok(true, 'POST /api/session called');
			QUnit.assert.equal(request.data.username, 'nils', 'Username passed during login.');
			QUnit.assert.equal(request.data.password, 'foobar', 'Password passed during login.');

			return sessionResponse;
		}
	);

	fixture(
		{ method: "delete", url: "/api/session" },
		( request, response, headers, ajaxSettings ) => {
			QUnit.assert.ok(true, 'DELETE /api/session called');
			return {};
		}
	);
}

function tearDownFixtures() {
	fixture({ method: "get", url: "/api/session" }, null);
	fixture({ method: "post", url: "/api/session" }, null);
	fixture({ method: "delete", url: "/api/session" }, null);
}

QUnit.module("can-connect/can/session", {
	beforeEach: function(context) {
		var fixtureType = context.test.testName.indexOf('Cookie') > -1 ? 'cookie' : 'bearer';
		setupFixtures(fixtureType);
	},
	afterEach: () => {
		tearDownFixtures();
	}
});

QUnit.test("Faked Cookies - Session retrieved when .current is accessed", function(assert) {
	const done = assert.async();
	assert.expect(3);

	const Session = DefineMap.extend(sessionParams);
	const options = {
		Map: Session,
		url: {
			resource: '/api/session',
			getData: {
				method: 'get',
				url: '/api/session',
				// this isn't needed during a real cookie auth scenario since the browser will be adding cookies to the request
				beforeSend: (xhr) => {
					xhr.setRequestHeader('Fake-Cookie', 'SESSIONID=DUMMY.TOKEN');
				}
			}
		},
	};

	const behaviors = [base, dataUrl, constructor, canMap, sessionBehavior];
	const connection = behaviors.reduce((conn, behavior) => behavior(conn), options);
	connection.init();

	assert.equal(Session.current, undefined, 'Session.current starts undefined.');
	setTimeout(() => {
		assert.propEqual(Session.current.serialize(), sessionResponse, 'Session.current is loaded as expected.');
		done();
	}, 10);
});

QUnit.test("Faked Cookies - Session.currentPromise & current are instantiated when .save is called", function(assert) {
	// if this expect fails chances are too many requests are being made & .currentPromise or .current is causing a
	// request when they shouldn't since a .save is pending
	const done = assert.async();
	assert.expect(6);

	const Session = DefineMap.extend(sessionParams);
	const options = {
		Map: Session,
		url: {
			resource: '/api/session',
			getData: 'GET /api/session'
		},
	};

	const behaviors = [base, dataUrl, constructor, canMap, sessionBehavior];
	const connection = behaviors.reduce((conn, behavior) => behavior(conn), options);
	connection.init();

	const savePromise = (new Session({ username: 'nils', password: 'foobar' })).save();
	assert.equal(Session.current, undefined, 'Session.current starts undefined');
	assert.ok(Session.currentPromise instanceof Promise, 'Session.currentPromise is set by .save()');
	savePromise.then(() => {
		assert.propEqual(Session.current.serialize(), sessionResponse, 'Session.current set after successful save.');
		done();
	});
});

QUnit.test("Faked Cookies - Session undefined after .destroy called", function(assert) {
	const done = assert.async();
	assert.expect(3);

	const Session = DefineMap.extend(sessionParams);
	const options = {
		Map: Session,
		url: {
			resource: '/api/session',
			destroyData: 'DELETE /api/session',
			getData: {
				method: 'get',
				url: '/api/session',
				// this isn't needed during a real cookie auth scenario since the browser will be adding cookies to the request
				beforeSend: (xhr) => {
					xhr.setRequestHeader('Fake-Cookie', 'SESSIONID=DUMMY.TOKEN');
				}
			}
		},
	};

	const behaviors = [base, dataUrl, constructor, canMap, sessionBehavior];
	const connection = behaviors.reduce((conn, behavior) => behavior(conn), options);
	connection.init();

	Session.currentPromise.then(() => {
		Session.current.destroy().then(() => {
			assert.equal(Session.current, undefined);
			done();
		});
	});
});

QUnit.test("Computed observations dependant on Session.current recalculate after `new Session().save`", function(assert) {
	const done = assert.async();
	assert.expect(6);

	const Session = DefineMap.extend(sessionParams);
	const options = {
		Map: Session,
		url: {
			resource: '/api/session',
			getData: 'GET /api/session'
		},
	};

	const behaviors = [base, dataUrl, constructor, canMap, sessionBehavior];
	const connection = behaviors.reduce((conn, behavior) => behavior(conn), options);
	connection.init();

	const testObs = new Observation(function() {
		return Session.current ? 'session available' : 'session absent';
	});

	testObs.on(function(message) {
		assert.equal(message, 'session available', 'Observation recomputed after Session.current updates.');
	});

	Session.currentPromise.catch(() => {
		// session absent since currentPromise rejected
		assert.equal(testObs.value, 'session absent', 'Session absent prior to successful login.');

		// session will be available after .save and testObs handler will run
		(new Session({ username: 'nils', password: 'foobar' })).save().then((session) => {
			setTimeout(done, 10);
		});
	});
});

QUnit.test("Singleton instances created/deleted by directly using connection object update the .current & .currentPromise as expected.", function(assert) {
	const done = assert.async();
	assert.expect(8);

	const Session = DefineMap.extend(sessionParams);
	const options = {
		Map: Session,
		url: {
			resource: '/api/session',
			getData: 'GET /api/session',
			destroyData: 'DELETE /api/session',
		},
	};

	const behaviors = [base, dataUrl, constructor, canMap, sessionBehavior];
	const connection = behaviors.reduce((conn, behavior) => behavior(conn), options);
	connection.init();

	connection.save(new Session({ username: 'nils', password: 'foobar' })).then((instance) => {
		assert.equal(Session.current, instance, 'Session.current is expected value after save.');

		Session.currentPromise.then((res) => {
			assert.equal(instance, res, 'Session.currentPromise is expected value after save.');
		});

		connection.destroy(instance).then(() => {
			assert.equal(Session.current, undefined, 'Session.current is expected value after destroy.');

			Session.currentPromise.catch(() => {
				assert.ok(true, 'Session.currentPromise is expected value after destroy.');
				done();
			});
		});
	});
});