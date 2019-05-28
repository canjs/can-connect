var QUnit = require("steal-qunit");
var DefineMap = require('can-define/map/map');
var fixture = require('can-fixture');
var reflect = require('can-reflect');
var QueryLogic = require('can-query-logic');

var base = require ('../../base/base');
var canMap = require ('../map/map');
var constructor = require ('../../constructor/constructor');
var dataUrl = require ('../../data/url/url');
var sessionBehavior = require('./session');

var assert = QUnit.assert;

function setupFixtures() {
	fixture(
		{ method: "post", url: "/api/authorize" },
		( request, response, headers, ajaxSettings ) => {
			return {
				token: 'DUMMY.TOKEN'
			};
		}
	);

	fixture(
		{ method: "delete", url: "/api/authorize" },
		( request, response, headers, ajaxSettings ) => {
			return {};
		}
	);

	fixture(
		{ method: "post", url: "/api/create_account" },
		( request, response, headers, ajaxSettings ) => {
			return {
				token: 'DUMMY.TOKEN'
			};
		}
	);
}

QUnit.module("can-connect/can/session",{
	setup: () => {
		setupFixtures();
	}
});

QUnit.asyncTest("Session retrieved when .current is accessed", function() {
	QUnit.expect(2);

	const Session = DefineMap.extend({ token: 'string' });
	const options = {
		Map: Session,
		url: {
			getData: "POST /api/authorize"
		},
		sessionParams: new DefineMap({
			username: 'nils',
			password: 'foobar'
		})
	};
	const behaviors = [base, dataUrl, constructor, canMap, sessionBehavior];
	const connection = behaviors.reduce((conn, behavior) => behavior(conn), options);
	connection.init();

	assert.equal(Session.current, undefined, 'Authentication.current starts undefined.');
	setTimeout(() => {
		assert.propEqual(Session.current.serialize(), { token: 'DUMMY.TOKEN' }, 'Authentication.current is loaded as expected.');
		QUnit.start();
	}, 10);
});

QUnit.asyncTest("Session retrieved when .currentPromise is accessed", function() {
	QUnit.expect(2);

	const Session = DefineMap.extend({ token: 'string' });
	const options = {
		Map: Session,
		url: {
			getData: "POST /api/authorize"
		},
		sessionParams: new DefineMap({
			username: 'nils',
			password: 'foobar'
		})
	};
	const behaviors = [base, dataUrl, constructor, canMap, sessionBehavior];
	const connection = behaviors.reduce((conn, behavior) => behavior(conn), options);
	connection.init();

	Session.currentPromise.then((session) => {
		assert.propEqual(reflect.serialize(session), { token: 'DUMMY.TOKEN' }, 'Session.currentPromise resolves as expected.');
		assert.propEqual(Session.current.serialize(), { token: 'DUMMY.TOKEN' }, 'Session.current is loaded as expected.');
		QUnit.start();
	});
});

QUnit.asyncTest("Session set when .save called", function() {
	QUnit.expect(2);

	const Session = DefineMap.extend({ token: 'string' });
	const options = {
		Map: Session,
		url: {
			createData: "POST /api/create_account"
		}
	};
	const behaviors = [base, dataUrl, constructor, canMap, sessionBehavior];
	const connection = behaviors.reduce((conn, behavior) => behavior(conn), options);
	connection.init();

	new Session({ username: 'stealthwang', password: 'foobar' }).save().then((session) => {
		assert.propEqual(reflect.serialize(session), { token: 'DUMMY.TOKEN' }, 'Session.save promise resolves as expected.');
		assert.propEqual(Session.current.serialize(), { token: 'DUMMY.TOKEN' }, 'Session.current is set as expected.');
		QUnit.start();
	});
});

QUnit.asyncTest("Session undefined after .destroy called", function() {
	QUnit.expect(1);

	const Session = DefineMap.extend({});
	const options = {
		Map: Session,
		url: {
			getData: "POST /api/authorize",
			destroyData: "DELETE /api/authorize"
		},
		sessionParams: new DefineMap({
			username: 'nils',
			password: 'foobar'
		}),
		queryLogic: new QueryLogic({identity: ['token']}),
	};
	const behaviors = [base, dataUrl, constructor, canMap, sessionBehavior];
	const connection = behaviors.reduce((conn, behavior) => behavior(conn), options);
	connection.init();

	Session.currentPromise.then(session => session.destroy()).then(() => {
		assert.equal(Session.current, undefined, 'Session.current is undefined as expected.');
		QUnit.start();
	});
});

// TODO: this currently fails since it's making two requests, .save is not setting .currentPromise
// QUnit.asyncTest("currentPromise set when .save is called", function() {
// 	QUnit.expect(1);
//
// 	const Session = DefineMap.extend({ token: 'string' });
// 	const options = {
// 		Map: Session,
// 		url: {
// 			getData: "POST /api/authorize",
// 			createData: "POST /api/create_account"
// 		}
// 	};
// 	const behaviors = [base, dataUrl, constructor, canMap, sessionBehavior];
// 	const connection = behaviors.reduce((conn, behavior) => behavior(conn), options);
// 	connection.init();
//
// 	new Session({ username: 'stealthwang', password: 'foobar' }).save();
// 	Session.currentPromise.then(() => {
// 		assert.propEqual(Session.current.serialize(), { token: 'DUMMY.TOKEN' }, 'Session.current is set as expected.');
// 		QUnit.start();
// 	});
// });