var expect = require('chai').expect;
var mispay = require('../lib/mispay.js')("user1","pass1");

describe('mispay', function(){
	describe('config', function(){
		it('should set user and pass', function(){
			expect(mispay.cred().username).to.equal('user1');
		});
		it('should config user credential', function(){
			mispay.config("user2","pass2");
			expect(mispay.cred().username).to.equal('user2');
		});
		it('should config with object', function(){
			mispay.config({username:'u1',password:'p1'});
			expect(mispay.cred().password).to.equal('p1');
		});
		it('should have staticPath', function(){
			expect(mispay.staticPath).to.contain('/lib/public');
		});
	});
	describe('get method', function(){
		it('should get from https', function(done){
			mispay.get('agents', function(r){
				//console.log('response:',r);
				expect(r).to.equal('{"error":"Unauthorized"}');
				done();
			}, function(e){
				console.log('error:',e);
				done();
			});
		});
	});
});