var QUnit = require("steal-qunit");


QUnit.test("persist", function(){
	var Person = function(values){
		can.extend(this, values)
	}
	
	can.connect.persist(Person,{
		findAll: function(params){
			return can.ajax({})
		},
		findOne: function(){
			
		},
		create: function(instance){
			
		},
		update: function(instance){
			
		},
		destroy: function(instance){
			
		}
	});
	{
		
	}
	// creates a "connect" with all these endpoints that can be connected to a can.Map or another constructor function
	rest("/person").subsetCache().ydbCache().fallThrough()
	
	
		//-> {getMany: function(){}, getOne: function(){}, cud: function(){}}
	
	
	.persist()
	
	
	Person.findAll() // simply 
	
});
