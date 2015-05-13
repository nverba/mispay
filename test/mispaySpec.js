var expect = require('chai').expect;
var mispay = require('../lib/mispay.js')({username:"user1",password:"pass1"});

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
		_req = option;
		cb(_res);
		return _mock;
	}
	this.write = function(data){
		_data = data;
	};
	this.end = _endfunc;
	function _endfunc(){
		if (!_callbacks.onset){
			return setTimeout(_endfunc,10);
		}
		var v = true;
		if (_callbacks.valid) {
			v = _callbacks.valid(_req, _data);
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
		_callbacks.onset = true;
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
		it('should do checkout',function(done){
			mock1.callbacks({
				valid: function(req,data){
					expect(req.method).to.equal('GET');
					expect(req.path).to.equal('/v1/request/1234/checkout');
					expect(req.hostname).to.equal('gapipay.appspot.com');
					expect(req.auth).to.equal('user1:pass1');
					expect(req.headers).to.have.property('accept','application/json');
					expect(req.headers).to.have.property('Content-Type','application/json');
					return true;
				},
				returnData: function(d){
					return {id:4321};
				}
			});
			mispay.checkout('1234', function(r){
				expect(r).to.exist;
				expect(r).to.have.property('id',4321);
				done();
			}, function(e){
				console.log('error:',e);
				done();
			});
		});
		it('should return error',function(done){
			mock1.callbacks({
				valid:function(req,data){
					return false;
				},
				returnError: function(d){
					return {Status:'FAILED'};
				}
			});
			mispay.checkout('12345',function(r){},function(e){
				expect(e).to.have.property('Status','FAILED');
				done();
			});
		});
	});
	describe('post',function(){
		it('should do request',function(done){
			mock1.callbacks({
				valid: function(req,data){
					expect(req.method).to.equal('POST');
					expect(req.path).to.equal('/v1/request');
					expect(req.hostname).to.equal('gapipay.appspot.com');
					expect(req.auth).to.equal('user1:pass1');
					expect(req.headers).to.have.property('accept','application/json');
					expect(req.headers).to.have.property('Content-Type','application/json');
					expect(data).to.have.property('buyer');
					expect(data.buyer).to.have.property('xid','111');
					return true;
				},
				returnData: function(d){
					return {status:'OK',id:'3'};
				}
			});
			mispay.config({hashkey:'ABCD'});
			var data = {id:'1',buyer:{xid:'111'},items:[{sid:'2',currency:'EUR',amount:10000,hash:'Y0MNqZIY/5BX+UVIPYDClwvmDsWnqpwn31swYsH+tD4='}]};
			mispay.request(data, function(r){
				expect(r).to.exist;
				expect(r.status).to.equal('OK');
				expect(r.id).to.equal('3');
				done();
			}, function(e){
				console.log('error:',e);
				done();
			});
		});
	});
	describe('card',function(){
		it('should have register',function(done){
			mock1.callbacks({
				valid: function(req,data){
					expect(req.method).to.equal('GET');
					expect(req.path).to.equal('/v1/payin/111/regcard');
					return true;
				}
			});
			mispay.card.register('111',function(r){
				expect(r).to.exist;
				done();
			});
		});
		it('should have update',function(done){
			mock1.callbacks({
				valid: function(req,data){
					expect(req.method).to.equal('POST');
					expect(req.path).to.equal('/v1/payin/1/card');
					expect(data).to.have.property('cid','2');
					return true;
				}
			});
			mispay.card.update('1','2',function(r){
				expect(r).to.exist;
				done();
			});
		});
		it('should have pay',function(done){
			mock1.callbacks({
				valid: function(req,data){
					expect(req.method).to.equal('POST');
					expect(req.path).to.equal('/v1/payin/121/pay');
					expect(data).to.have.property('cid','22');
					return true;
				}
			});
			mispay.card.pay('121',{cid:'22'},function(r){
				expect(r).to.exist;
				done();
			});
		});
		it('should have preauth',function(done){
			mock1.callbacks({
				valid: function(req,data){
					expect(req.method).to.equal('POST');
					expect(req.path).to.equal('/v1/payin/1212/preauth');
					expect(data).to.have.property('cid','222');
					return true;
				}
			});
			mispay.card.preauth('1212',{cid:'222'},function(r){
				expect(r).to.exist;
				done();
			});
		});
		it('should have prepay',function(done){
			mock1.callbacks({
				valid: function(req,data){
					expect(req.method).to.equal('POST');
					expect(req.path).to.equal('/v1/payin/12121/prepay');
					expect(data).to.have.property('pid','1111');
					expect(data).to.have.property('amount',1000);
					return true;
				}
			});
			mispay.card.prepay('12121',{pid:'1111',amount:1000},function(r){
				expect(r).to.exist;
				done();
			});
		});
		it('should have distribute',function(done){
			mock1.callbacks({
				valid: function(req,data){
					expect(req.method).to.equal('POST');
					expect(req.path).to.equal('/v1/payin/5/transfer');
					return true;
				}
			});
			mispay.distribute('5',function(r){
				expect(r).to.exist;
				done();
			});
		});
	});
	describe('callback',function(){
		it('should return html',function(done){
			var req = {
				query: {preAuthorizationId:123456}
			};
			var cb = {
				send: function(html){
					expect(html).to.equal("<!DOCTYPE html><html><body><script>setTimeout(function(){parent.hasNotify('preAuthorizationId','123456');},100);</script></body></html>");
					done();
				}
			}
			mispay.mcallback(req,cb);
		});
	});
});

describe('mispay plain object', function(){
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
		it('validHash', function(){
			mispay.config({hashkey:'ABCD'});
			var basket = {items:[{sid:'111',currency:'GBP',amount:100},{sid:'2',currency:'EUR',amount:10000}]};
			expect(mispay.validHash(basket)).to.be.false;
			basket.items[0].hash = 'YO2+uS78ryTzzzW8IYT5HC+dGVhVTHht8e/QijZVCqs=';
			basket.items[1].hash = 'Y0MNqZIY/5BX+UVIPYDClwvmDsWnqpwn31swYsH+tD4=';
			expect(mispay.validHash(basket)).to.be.true;
		});
	});
});

var MockRouter = {
	endpoints: {},
	post: function(path, func){
		MockRouter.endpoints[path] = 'post';
	},
	get: function(path, func){
		MockRouter.endpoints[path] = 'get';
	}
};

describe('mispay router',function(){
	it('should set up these endpoints',function(){
		mispay.route(MockRouter);
		var es = {'request':'post','checkout':'get','payin/:pid/regcard':'get','payin/:pid/card':'post',
				'payin/:pid/pay':'post','payin/:pid/preauth':'post','payin/:pid/prepay':'post',
				'payin/:pid/transfer':'post','mango/callback':'get'};
		for(var p in es){
			var ep = '/mispay/'+p, m = es[p];
			expect(MockRouter.endpoints[ep]).to.equal(m);
		}
	});
});
