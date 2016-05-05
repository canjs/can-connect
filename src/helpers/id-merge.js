var map = [].map;

module.exports = function(list, update, id, make){
	var listIndex = 0,
		updateIndex =  0;

	while(listIndex < list.length && updateIndex < update.length) {
		var listItem = list[listIndex],
			updateItem = update[updateIndex],
			lID = id(listItem),
			uID = id(updateItem);
		if( id(listItem) === id(updateItem) ) {
			listIndex++;
			updateIndex++;
			continue;
		}
		// look for single insert or removal, does the next update item equal the current list.
		// 1 2 3
		// 1 2 4 3
		if(  updateIndex+1 < update.length && id(update[updateIndex+1]) === lID) {
			list.splice(listIndex, 0, make(update[updateIndex]) );
			listIndex++;
			updateIndex++;
			continue;
		}
		// look for single removal, does the next item in the list equal the current update item.
		else if( listIndex+1 < list.length  && id(list[listIndex+1]) === uID ) {
			list.splice(listIndex, 1);
			listIndex++;
			updateIndex++;
			continue;
		}
		// just clean up the rest and exit
		else {
			list.splice.apply( list, [listIndex, list.length-listIndex].concat( map.call(update.slice(updateIndex), make) ) );
			return list;
		}
	}
	if( (updateIndex === update.length) && (listIndex === list.length) ) {
		return;
	}
	list.splice.apply( list, [listIndex, list.length-listIndex].concat( map.call(update.slice(updateIndex), make) ) );
	return;
};
