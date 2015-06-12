var observer = new MutationObserver( function(mutations){
	mutations.forEach(function(mutation) {
      for(var i = 0 ; i < mutation.removedNodes.length; i++ ){ 
      	if(removeHandlers.has(mutation.removedNodes[i])) {
      		removeHandlers.get(mutation.removedNodes[i])();
      		removeHandlers["delete"](mutation.removedNodes[i]);
      	}
      }
    });  
});

observer.observe(document.documentElement, {childList: true, subtree: true});
var removeHandlers = new Map();

module.exports = function(element, cb){
	removeHandlers.set(element, cb);
};