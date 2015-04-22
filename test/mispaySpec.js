var expect = require('chai').expect;
var mispay = require('../lib/mispay.js')("user1","pass1");

/**
 * MockHttpServe({
		returnData: function(data){..},
		returnError: function(){},
		valid: function(req, data){ return true; },
	});
 */
function MockHttpServe(callbacks){
	var _mock = this,
		_req = {}, _data = {},
		_callbacks = callbacks || {},
		_res = {
			on: function(op, cb){
				_callbacks.response = cb;
			},
			setEncoding: function(enc){
			},
		};
	this.callbacks = function(callbacks){
		_callbacks = callbacks;
	};
	this.request = function(option, cb){
		//console.log(option);
		_req = option;
		cb(_res);
		return _mock;
	}
	this.write = function(data){
		_data = data;
	};
	this.end = function(){
		var v = true;
		if (_callbacks.valid) {
			v = _callbacks.valid(_req, _res.data);
		}
		if (!v) {
			var e=_callbacks.returnError ? _callbacks.returnError() : 'error';
			_callbacks.onError(e);
		} else {
			var data = _callbacks.returnData ? _callbacks.returnData(_data) : '{}';
			_callbacks.response(data);
		}
	};
	this.on = function(op, cb){
		if (op=='error' && cb){
			_callbacks.onError = cb;
		}
	};
}

describe('mispay http', function(){
	var mock1;
	beforeEach(function(done){
		mock1 = new MockHttpServe();
		mispay.config({http:mock1});
		done();
	});
	describe('get',function(){
		it('get-1',function(done){
			mock1.callbacks({
				valid: function(req,data){
					expect(req.method).to.equal('GET');
					expect(req.path).to.equal('/v1/request/1234/checkout');
					expect(req.hostname).to.equal('gapipay.appspot.com');
					expect(req.auth).to.equal('user1:pass1');
					expect(req.headers).to.have.property('accept','application/json');
					expect(req.headers).to.have.property('Content-Type','application/json');
					return true;
				}
			});
			mispay.checkout('1234', function(r){
				expect(r).to.exist;
				done();
			}, function(e){
				console.log('error:',e);
				done();
			});
		});
	});
	describe('post',function(){
		it('post-1',function(done){
			done();
		});
	});
});

describe('mispay object', function(){
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
//	describe('get method', function(){
//		it('should get from https', function(done){
//			mispay.get('agents', function(r){
//				//console.log('response:',r);
//				expect(r.error).to.equal("Unauthorized");
//				done();
//			}, function(e){
//				console.log('error:',e);
//				done();
//			});
//		});
//	});
});