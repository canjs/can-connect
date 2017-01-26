/**
 * @module {connect.Behavior} can-connect/can/constructor-hydrate/constructor-hydrate
 * @parent can-connect.behaviors
 *
 * Always check the [can-connect/constructor/store/store.instanceStore] when creating new instances of the connected [can-connect/can/map/map._Map] type.
 *
 * @signature `constructorHydrate( baseConnection )`
 *
 * 	 Overrides [can-define/map/map]'s `setup` method and checks whether a newly created instance already
 * 	 exists in [can-connect/constructor/store/store.instanceStore]. If it exists that instance will be
 * 	 returned instead of a new object.
 *
 * 	 This behavior has to be used with [can-connect/constructor/store] and [can-connect/can/map/map] behaviors.
 *
 * @body
 *
 * ## Use
 *
 * This behavior is useful if `Type` converters of [can-define/map/map] are used in multiple places of your app.
 * In which case if a property is set with an id of an already created instance then the connection behaviour will
 * check [can-connect/constructor/store/store.instanceStore]. If there is already an instance with the same id
 * then it will be returned instead of a new object.
 *
 * Let's say we have the following page state with two properties which are of type `Student`:
 * ```js
 * var myPage = new (DefineMap.extend({
 *     student: { Type: Student },
 * 	   teamLead: { Type: Student },
 * }));
 * ```
 *
 * The type `Student` is a DefineMap with `can-connect` capabilities:
 * ```js
 * var Student = DefineMap.extend({});
 * Student.List = DefineList.extend({
 *     '#': { Type: Student }
 * });
 *
 * Student.connection = connect([
 * 	   require("can-connect/data/url/url"),
 * 	   require("can-connect/constructor/constructor"),
 * 	   require("can-connect/constructor/store/store"),
 * 	   require("can-connect/can/map/map"),
 * 	   require("can-connect/can/constructor-hydrate/constructor-hydrate"),
 * ], {
 * 	   Map: Student,
 * 	   List: Student.List,
 * 	   url: "api/students"
 * });
 * ```
 *
 * Now lets say your application loads `student` in a regular way using `Student.get()`, and it gets data
 * for `teamLead` from somewhere else. Also let's the team lead is the same person as student:
 *
 * ```js
 * myPage.student = Student.get({id: 1});
 *
 * myPage.loadTeamLead().then( function(person){ myPage.teamLead = person; } );
 * ```
 *
 * Without [can-connect/can/constructor-hydrate/constructor-hydrate] we would end up with two instances of `Student` with the same id.
 * Also, the `teamLead` would not be referencing an instance that is stored in connection's `instanceStore`
 * and thus will loose real-time updates if [can-connect/real-time/real-time] was used.
 *
 * This behavior solves this problem by checking `instanceStore` before creating a new instance. So, in our app
 * it will return the existing instance and give it to `teamLead`. Now both `myPage.student` and `myPage.teamLead`
 * are referencing the same instance:
 *
 * ```js
 * var instanceStore = Student.connection.instanceStore;
 * myPage.student === myPage.teamLead;                           // => true
 * myPage.teamLead === instanceStore.get( myPage.teamLead.id );  // => true
 * ```
 */

var connect = require("can-connect");
var Construct = require("can-construct");

module.exports = connect.behavior("can-connect/can/construct-hydrate", function(baseConnect){
	return {
		init: function(){
			var oldSetup = this.Map.prototype.setup;
			var connection = this;
			this.Map.prototype.setup = function(props){
				if (connection.instanceStore.has( connection.id(props) )) {
					return new Construct.ReturnValue( connection.hydrateInstance(props) );
				}
				return oldSetup.apply(this, arguments);
			};
			baseConnect.init.apply(this, arguments);
		}
	}
});
