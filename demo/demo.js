import connect from 'can-connect';
import dataUrl from 'can-connect/data/url/url';
import dataParse from 'can-connect/data/parse/parse';
import construct from 'can-connect/constructor/constructor';
import constructStore from 'can-connect/constructor/store/store';
import canMap from 'can-connect/can/map/map';
import canRef from 'can-connect/can/ref/ref';
import callbacksOnce from 'can-connect/constructor/callbacks-once/callbacks-once';
import dataCallbacks from 'can-connect/data/callbacks/callbacks';
import realtime from 'can-connect/real-time/real-time';

import DefineMap from 'can-define/map/map';
import DefineList from 'can-define/list/list';

import fixture from 'can-fixture';
import QueryLogic from 'can-query-logic';

const INDENT = '   ';

function randomHex() {
	return '#' + (Math.random()*0xFFFFFF<<0).toString(16);
}

function decorateProtoChain(obj, _depth = 0, _calldepth = { count: 0 }) {
	if(!obj) {
		return;
	}

	const proto = Object.getPrototypeOf(obj);
	if(proto === Object.prototype) {
		return;
	}

	console.log(`${INDENT.repeat(_depth)}${proto.__behaviorName || 'unnamed behavior'}`, proto);
	Object.keys(proto).forEach(key => {
		const orig = proto[key];

		if(typeof orig === 'function') {

			proto[key] = function() {
				const css = `color: ${randomHex()};`;
				const PREFIX = `${INDENT.repeat(_calldepth.count++)}%c${proto.__behaviorName || ''}.${key}()`;
				console.log(`${PREFIX} BEFORE:`, css, arguments);

				const result = orig.apply(proto, arguments);
				if(result && typeof result.then === 'function') {
					result.then(res => {
						_calldepth.count--;
						console.log(`${PREFIX} AFTER PROMISE:`, css, res);
					}).catch(err => {
						_calldepth.count--;
						console.log(`${PREFIX} ERROR:`, css, err);
					});
				} else {
					_calldepth.count--;
					console.log(`${PREFIX} AFTER:`, css, result);
				}

				return result;
			};
		}
	});

	decorateProtoChain(proto, ++_depth, _calldepth);
}

const connectDebugger = function(behaviors, options) {
	const connection = connect(behaviors, options);

	decorateProtoChain(connection);

	return connection;
};

const Session = DefineMap.extend('Session', {
	exp: { type: 'any', identity: true }
});

Session.List = DefineList.extend({
  '#': Session
});

const url = '/api/session';
const exp = Math.round(Date.now() * 1.001);
const store = fixture.store([{ exp }], new QueryLogic(Session));
fixture(url, store);

// create the session connection
Session.connection = connectDebugger(
   [
   	dataUrl,
		construct,
		canMap,
		canRef,
		constructStore,
		dataCallbacks,
		dataParse,
		realtime,
		callbacksOnce
	],
	{
		Map: Session,
		List: Session.List,
		name: 'session',
		url
	}
);

window.exp = exp;
window.Session = Session;
// Session.get({ exp }).then(res => console.log(res));
// Session.getList({}).then(res => console.log(res));
