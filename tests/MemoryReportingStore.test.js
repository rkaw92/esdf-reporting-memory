var MemoryReportingStore = require('../index.js').MemoryReportingStore;
var assert = require('assert');

function getPiApproximation(){
	return 3.14159;
}

function skew(currentValue){
	// Don't try this at home. Never use for spacecraft launch trajectory hot-fixes...
	return currentValue + 0.00001;
}

function bookGenerator(title, author){
		return function(){
			return {
				title: title,
				author: author
			};
		};
}

describe('MemoryReportingStore', function(){
	it('should be able to store a simple value as a record', function(){
		var store = new MemoryReportingStore();
		store.transformRecord('piValue', getPiApproximation);
		assert.strictEqual(store.getRecord('piValue'), 3.14159);
	});
	it('should update an existing value', function(){
		var store = new MemoryReportingStore();
		store.transformRecord('piValue', getPiApproximation);
		store.transformRecord('piValue', skew);
		assert.strictEqual(store.getRecord('piValue'), 3.14160);
	});
	it('should list all values registered', function(){
		var store = new MemoryReportingStore();
		store.transformRecord('item1', function(){
			return {
				name: 'CheapCo iMCU',
				price: 1.05
			};
		});
		store.transformRecord('item2', function(){
			return {
				name: 'TAMega Autonomous Microcontroller Unit 3.01',
				price: 599.99
			};
		});
		var shopItems = store.findRecords();
		assert(shopItems.some(function(item){
			return item.name.match(/^CheapCo/);
		}));
		assert(shopItems.some(function(item){
			return item.price === 599.99;
		}));
	});
	it('should allow searching using a functional boolean predicate', function(){
		var store = new MemoryReportingStore();
		store.transformRecord('book1', bookGenerator('The Hitchhiker\'s Guide to the Galaxy', 'Douglas Adams'));
		store.transformRecord('book2', bookGenerator('The Colour of Magic', 'Terry Pratchett'));
		var sciFiBooks = store.findRecords(function(book){
			return Boolean(book.title.match(/galaxy/i));
		});
		var discworldBooks = store.findRecords(function(book){
			return book.author === 'Terry Pratchett';
		});
		var somewhatOlderClassics = store.findRecords(function(book){
			return Boolean(book.title.match(/gone with the wind/i));
		});
		assert.strictEqual(sciFiBooks.length, 1);
		assert.strictEqual(sciFiBooks[0].author, 'Douglas Adams'); // We have no guarantee as to the order of results, but there is only supposed to be one here, anyway.
		assert.strictEqual(discworldBooks.length, 1);
		assert.strictEqual(discworldBooks[0].title, 'The Colour of Magic');
		assert.strictEqual(somewhatOlderClassics.length, 0); // Sorry, none in store!
	});
	it('should transform records on the fly into a different representation', function(){
		var store = new MemoryReportingStore();
		// Shamelessly re-use the book titles from a previous test case!
		store.transformRecord('book1', bookGenerator('The Hitchhiker\'s Guide to the Galaxy', 'Douglas Adams'));
		store.transformRecord('book2', bookGenerator('The Colour of Magic', 'Terry Pratchett'));
		var booksWithAuthorInitials = store.findRecords(undefined, function shortenAuthorNames(book){
			return {
				title: book.title,
				author: book.author.split(' ').map(function truncateWord(authorNamePart){
					return authorNamePart.substr(0, 1).toLocaleUpperCase() + '.';
				}).join(' ')
			};
		});
		assert(booksWithAuthorInitials.some(function(book){
			return book.author === 'T. P.';
		}));
		assert(booksWithAuthorInitials.some(function(book){
			return book.author === 'D. A.';
		}));
	});
	it('should sort the found records by transformed representations', function(){
		var store = new MemoryReportingStore();
		// Shamelessly re-use the book titles from a previous test case!
		store.transformRecord('book1', bookGenerator('The Hitchhiker\'s Guide to the Galaxy', 'Douglas Adams'));
		store.transformRecord('book2', bookGenerator('The Colour of Magic', 'Terry Pratchett'));
		var booksWithAuthorSurnames = store.findRecords(undefined, function shortenAuthorNames(book){
			return {
				title: book.title,
				authorSurname: book.author.split(' ').pop()
			};
		}, function sortBySurnameDescending(bookA, bookB){
			return (bookA.authorSurname > bookB.authorSurname) ? -1 : 1;
		});
		assert.strictEqual(booksWithAuthorSurnames[0].authorSurname, 'Pratchett');
		assert.strictEqual(booksWithAuthorSurnames[1].authorSurname, 'Adams');
	});
	it('should erase a value from memory', function(){
		var store = new MemoryReportingStore();
		store.transformRecord('erasableVariable', getPiApproximation);
		store.transformRecord('erasableVariable', function(oldValue){
			return void(0); // A fancy term for "undefined".
		});
		assert.strictEqual(store.getRecord('erasableVariable'), undefined);
		assert.strictEqual(store.findRecords().length, 0);
	});
});