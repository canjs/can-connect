/**
 * @module {connect.Behavior} can-connect/can/constructor-hydrate/constructor-hydrate
 * @parent can-connect.behaviors
 */

var connect = require("can-connect");
var Construct = require("can-construct");

module.exports = connect.behavior("can-connect/can/construct-hydrate", function(){
	return {
		init: function(){
			var oldSetup = this.Map.prototype.setup;
			var connection = this;
			this.Map.prototype.setup = function(props){
				if (connection.instanceStore.has( connection.id(props) )) {
					return new Construct.ReturnValue( connection.hydrateInstance(props) );
				}
				return oldSetup.apply(this, arguments);
			}
		}
	}
});
