/**
 * @module esdf-reporting-memory/MemoryReportingStore
 */

var util = require('util');

/**
 * A basic in-memory reporting store, representing entries identified by a primary key as a map. Supported operations are: listing
 *  (using a projection function to limit/transform returned fields) with search and sort support, getting a single record verbatim by ID,
 *  and transforming a record using a modification function (which is the only way to add a new record - transform nothing into something).
 * As such, it is a very non-standard reporting store and should only be used when the user is certain that the upper layer
 *  of the reporting store (their custom part, which supposedly translates incoming events
 *  to RS operations) does not need to be ported to another storage engine (which does not support functional JS transforms).
 * @constructor
 */
function MemoryReportingStore(){
	/**
	 * The ID-indexed map holding the reporting store records.
	 * @type {Object.<string,Object>}
	 * @private
	 */
	this._storeContents = {};
}

/**
 * Transform a record under the given ID using the provided transformation function. The function should accept only one parameter - the record's current value. The value returned by this function
 *  will be used as the new value of the record, completely overwriting the old one.
 * @param {string} recordID ID of the record to transform. If there is no record under such ID, the transformation function gets a value of type "undefined" as its parameter, so that it may recognize
 *  this fact and deal with it accordingly.
 * @param {string} transformationFunction The function used to produce the final, updated value. It should return a value whose type is not "undefined" for all inputs if the record is to be
 *  preserved - otherwise, the transformed record is subsequently treated as if it does not exist (is removed from the store).
 */
MemoryReportingStore.prototype.transformRecord = function transformRecord(recordID, transformationFunction){
	// Get the value of the record as it is now. Note that getting "undefined" here is a valid operation, too - this is exactly what the user function expects to see if the record is new.
	var currentRecordValue = this._storeContents[recordID];
	// Next, assign the value that the user-provided transformation function produces as the new value of the record. Note that by not relying on side effects nor pass-by-reference semantics, we
	//  can support any data type, not just objects - otherwise, primitives could not be modified by the function (as they are pass-by-value) and the scheme would silently fail to update the value.
	this._storeContents[recordID] = transformationFunction(currentRecordValue);
	// If we have just assigned undefined, clean it up so that it appears as never having existed - according to the method specification.
	if(typeof(this._storeContents[recordID]) === 'undefined'){
		delete this._storeContents[recordID];
	}
	
};

MemoryReportingStore.prototype.getRecord = function getRecord(recordID){
	// Always return whatever is under the requested key, even if it is undefined (does not really exist). This allows us to keep our API clear of any exceptions (a no-throw guarantee of sort).
	return this._storeContents[recordID];
};

MemoryReportingStore.prototype.findRecords = function findRecords(searchPredicate, projectionFunction, sortingFunction){
	var matchesConditions = (typeof(searchPredicate) === 'function') ? searchPredicate : function(value, key){
		return true;
	};
	// If the user has not provided us with a projection function to transform the returned records in-flight, we simply use an identity function, which returns the passed object untouched.
	var projector = (typeof(projectionFunction) === 'function') ? projectionFunction : function(recordRepresentation, recordID){
		return recordRepresentation;
	};
	// Start off with empty results...
	var results = [];
	// ... and populate them by iterating over our store. This, of course, has O(n) complexity, which is sufficient for the simple purposes that this in-memory reporting store is meant to serve.
	Object.keys(this._storeContents).forEach((function(storeKey){
		// Only push the data object onto the result list if the predicate evaluates to true (it matches the search criteria).
		if(matchesConditions(this._storeContents[storeKey], storeKey) === true){
			// We push the transformed, not the original version onto the list.
			results.push(projector(this._storeContents[storeKey], storeKey));
		}
	}).bind(this));
	// After we have obtained all interesting records in the preferred form, it is time to sort them if the user has requested so.
	if(typeof(sortingFunction) === 'function'){
		results.sort(sortingFunction);
	}
	return results;
};

module.exports.MemoryReportingStore = MemoryReportingStore;