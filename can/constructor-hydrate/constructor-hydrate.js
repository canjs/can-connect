/**
 * @module {connect.Behavior} can-connect/can/constructor-hydrate/constructor-hydrate
 * @parent can-connect.behaviors
 *
 * Persists instances with the same id.
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
 * This behavior could be useful if `Type` converters of [can-define/map/map] are used in multiple places of your app.
 * In which case if a property is set with an id of an already created instance then the connection behaviour will
 * check [can-connect/constructor/store]. If there is already an instance with the same id then it will be returned
 * instead of a new object.
 *
 * Let's say we have the following page state with two properties which are of type `Student`:
 * ```javascript
 * 	const myPage = new (DefineMap.extend({
 * 	    student: { Type: Student },
 * 	    teamLead: { Type: Student },
 * 	}));
 * ```
 *
 * The type `Student` is a DefineMap with `can-connect` capabilities:
 * ```javascript
 * 	const Student = DefineMap.extend({});
 * 	Student.List = DefineList.extend({
 * 	    '#': { Type: Student }
 * 	});
 *
 * 	const StudentConnection = connect([
 * 	    require("can-connect/url"),
 * 	    require("can-connect/constructorBehavior"),
 * 	    require("can-connect/constructorStore"),
 * 	    require("can-connect/mapBehavior"),
 * 	    require("can-connect/hydrateBehavior"),
 * 	], {
 * 	    Map: Student,
 * 	    List: Student.List,
 * 	    url: "api/students"
 * 	});
 * ```
 *
 * Now lets say your application loads `student` in a regular way using `Student model` but it gets data
 * of `teamLead` from somewhere else. Also let's the team lead is the same person as student:
 *
 * ```javascript
 * myPage.student = Student.get(1);
 *
 * myPage.loadTeamLead().then( person => myPage.teamLead = person );
 * ```
 *
 * If we did not use the `hydrateBehavior` we would end up with two instances of `Student` with the same id.
 * Also, the `teamLead` would not be referencing an instance that is stored in connection's `instanceStore`
 * and thus will loose real-time updates if [can-connect/real-time/real-time] was used.
 *
 * This behavior solves this problem by checking `instanceStore` before creating a new instance. So, in our app
 * it will return the existing instance and give it to `teamLead`. Now both `myPage.student` and `myPage.teamLead`
 * are referencing the same instance:
 *
 * ```javascript
 * const instanceStore = StudentConnection.instanceStore;
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
