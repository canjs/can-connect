var stealTools = require("steal-tools");
var path = require("path");
var fs = require("fs");

var modules = [];

stealTools.export({
	system: {
		config: "package.json!npm",
		main: "can-connect/all"
	},
	options: {
		sourceMaps: true
	},
	outputs: {
		"+cjs": {
			ignore: function(name, load){
				if(load.address.indexOf("node_modules") >= 0 || load.metadata.format === "defined") {
					return true;
				} else {
					var srcIndex = load.name.indexOf("#")+1;
					modules.push( load.name.substr(srcIndex) );
				}
			}
		},
		"+amd": {},
		"+global-js": {
			exports: {
				"jquery": "jQuery"
			}
		}
	}
}).then(function(){
	
	var packageJSON = require("./package.json");
	
	var browser = {};
	modules.forEach(function(name){
		browser["./"+name] = "./dist/cjs/"+name;
	});
	
	packageJSON.browser = browser;
	
	fs.writeFile(
		__dirname+"/package.json", 
		JSON.stringify(packageJSON, null, "  "),
		function(){});
	
	
});
