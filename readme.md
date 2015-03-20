
Model
 - Instance store
 - List store
 - Backup
 - Persist / Rest
   - converting
 - Fall-through cache
 - Reuse earlier requests 
 - subset (combine)
 - Update

Model.List
 - automatic removal

// hook into "new";
var Measurement = can.Map.extend()

can.connect(Measurement,can.rest({}))


findAll
	1. check if it's already loaded (cached)
	2. check if it's 

getMany ... 
	

getOne

create

update

delete


 - there's "raw data" and "instance level" caching
 
 
1. have we loaded this (subset) or what do we still need to load
2. get the data
	1. save into local
3. combine all existing data (it could "not" wait and then insert)
4. return to user
5. update in background

// a subset cache should check what's available


hooks = {
	getListData: function(){
		// parseListData?
	},
	getInstances: function(){
		
	},
	makeInstances: function(){
		
	},
	id: function(){},
	// a hook to know when an instance is doing something
	observeInstance: function(){ },
	unobserveInstance: function(){ },
	observeList: function(){ },
	unobserveList: function(){ },
	
	// a hook to know whenever an instance is created .. this is so other hooks can be setup
	createdInstance: function(){},
	createdList: function(){},
	
	// persiste this instance
	postInstance: function(){
		
	},
	putInstance: function(){
		
	},
	deleteInstance: function(){
		
	}
};
	
