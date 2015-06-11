var https = require('https');
var crypto = require('crypto');
var request = require('request'); //added for easy file upload 
var fs = require('fs');

/**
 * Sort the data keys and serialise into key=value strings and join with '&' and then hash the whole.
 * @param data : {cy:'GBP',base:100,...}
 * @returns : hash string base64 encoded
 */
function makeHash(data, hashkey){
	var keys = [], buf = [];
	for (var k in data){
		keys.push(k);
	}
	keys.sort();
	for (var i in keys){
		var k = keys[i];
		buf.push(k + '=' + data[k]);
	}
	var hash = crypto.createHash('sha256')
		.update(buf.join('&'))
		.update(hashkey)
		.digest('base64');
	return hash;
}

var GAPIPAY_HOST = 'gapipay.appspot.com';
var HEADER_JSON = {'accept': 'application/json', 'Content-Type': 'application/json'};

function MisPay(_options) {
	var _opts = _options || {},
		_http = _opts.http || https, //for mock testing
		_ver = _opts.version || 'v1',
		_username = _opts.username,
		_password = _opts.password,
		_basicauth = _makeAuthStr(_opts.username, _opts.password),
		_hashkey = _opts.hashkey,
		_gapi_hashkey = _opts.GapiHashKey,
		_auto_transfer = _opts.auto_transfer ? _opts.auto_transfer : true;
	
	function _makeAuthStr(u, p){
		if (u && p) {
			return _basicauth = u + ':' + p;
		}
		return '';
	}
	
	var _config = function(user, pass) {
		if (user.username && user.password){
			_username = user.username;
			_password = user.password;
		} else if (typeof(user)=='object'){
			if (user.version) _ver = user.version;
			if (user.auto_transfer) _auto_transfer = user.auto_transfer;
			if (user.http) _http = user.http;
			if (user.hashkey) _hashkey = user.hashkey;
		} else if (typeof(user)==='string' && pass){
			_username = user;
			_password = pass;
		}
		_makeAuthStr(_username, _password);
		return this;
	};
	
	function _makePath(path){
		return '/' + _ver + '/' + path;
	}
	
	var _cred = function(){
		return {username: _username, password: _password};
	};
	
	function _makeRequest(method, path, data, cbok, cberror){
		var opt = {
			method: method,
			hostname: GAPIPAY_HOST,
			path: _makePath(path),
			auth: _basicauth,
			headers: HEADER_JSON
		};
		var req = _http.request(opt, function(res){
			res.setEncoding('utf8');
			res.on('data', function(ds){
				if (typeof(ds)=='object'){
					if (cbok) cbok(ds); else console.log('No callback func');
				} else {
					try {
						var djson = JSON.parse(ds);
						if (cbok) cbok(djson); else console.log('No callback func');
					} catch (e){
						if (cberror) cberror(e.message || e); else console.log(e);
					}
				}
			});
		});
		if (data) req.write(JSON.stringify(data));
		req.end();
		req.on('error', function(e){
			if (cberror) {
				cberror(e);
			} else { console.log(e); }
		});
	}
	
	var _get = function(path, success, failure){
		_makeRequest('GET', path, null, success, failure);
	};

	var _post = function(path, data, success, failure){
		_makeRequest('POST', path, data, success, failure);
	};
	
	var _put = function(path, data, success, failure){
		_makeRequest('PUT', path, data, success, failure);
	};

	/**
	 * Check every item in basket.items array to calculate hash and compare.
	 * @return true if all correct, or false if any hash not found or correct.
	 */
	var _validHash = function(basket){
		if (!_hashkey){
			console.log('_hashkey not set!');
			return false;
		}
		var items = basket.items || [];
		for (var i=0; i<items.length; i++){
			var item = items[i], hd = {sid: item.sid, currency: item.currency, amount: item.amount};
			if (!item.hash){
				return false;
			}
			var hash = makeHash(hd, _hashkey);
			//console.log(hd,'hash=',hash);
			if (hash != item.hash){
				return false;
			}
		}
		return true;
	};
	
	/**
	 * basket : like 
	 * var Basket = {
			id: '1234', //optional
			gid: '1', //optional
			buyer: {
				xid: '100' //local id submitted previously
			},
			items: [
				{
					sid: '12334',
					item: 'product-1',
					currency: 'GBP',
					amount: 10000, //in cents
					hash: '' //from PAPI.reserve
				}
			]
		};
	 */
	var _request = function(basket, cb, fail){
		if (_validHash(basket)){
			_post('request', basket, cb, fail);
		} else {
			fail(new Error('Incorrect Hash'));
		}
	};
	
	var _checkout = function(reqid, cb, fail){
		_get('request/' + reqid + '/checkout', cb, fail);
	};
	
	var _cardman = {
		register: function(pid, cb, fail){
			_get('payin/' + pid + '/regcard', cb, fail);
		},
		update: function(pid, cid, cb, fail){
			_post('payin/' + pid + '/card', {cid:cid}, cb, fail);
		},
		pay: function(pid, d, cb, fail){
			_post('payin/' + pid + '/pay', d, cb, fail);
		},
		preauth: function(pid, d, cb, fail){
			_post('payin/' + pid + '/preauth', d, cb, fail);
		},
		prepay: function(pid, d, cb, fail){
			_post('payin/' + pid + '/prepay', d, cb, fail);
		},
	};
	
	var _distribute = function(pid, cb, fail){
		_post('payin/' + pid + '/transfer', {}, cb, fail);
	};
	
	function mango_callback(req, res, next){
		for(var k in req.query){
			var v = req.query[k];
			var s1 = "<!DOCTYPE html><html><body><script>setTimeout(function(){parent.hasNotify('";
			var s2 = "','";
			var s3 = "');},100);</script></body></html>";
			var html = s1 + k + s2 + v + s3;
			res.send(html);
			break;
		}
	}
	
	function forward(res){
		return function(data){
			res.send(data);
		};
	}
	
	function uploadKyc(req, res, next) {
		//note: this is based on expressjs 3.x using bodyParser
		console.log('uploadKyc.req.body:',req.body);
		console.log('uploadKyc.req.files:',req.files);
		var filePath = req.files.file.path,
			kycType = req.body.type,
			buyerId = req.body.bid,
			path = _makePath('buyers/'+buyerId+'/upload/kyc'),
			url = 'https://' + GAPIPAY_HOST + path,
			formData = {
				'type': kycType,
				'file': fs.createReadStream(filePath)
			};
		console.log('uploadKyc, filePath:',filePath,'type:',kycType,'buyer:',buyerId,'url:',url);
		request.post({
			url: url,
			auth:{
				user: _username,
				pass: _password
			},
			formData: formData
		}, function(err, r, body){
			if (err){
				console.log('upload ',filePath, ' failed');
				return res.next(err);
			}
			res.send(body);
		});
	}
	
	// assign endpoints with express router
	var _route = function(router){
		router.post('/mispay/request', function(req, res, next){
			_request(req.body, forward(res), next);
		});
		router.get('/mispay/request/:rid/checkout', function(req, res, next){
			//_checkout(req.params.rid, res.send, next);
			_checkout(req.params.rid, forward(res), next);
		});
		router.get('/mispay/payin/:pid/regcard', function(req, res, next){
			_cardman.register(req.params.pid, forward(res), next);
		});
		router.post('/mispay/payin/:pid/card', function(req, res, next){
			_cardman.update(req.params.pid, req.body.cid, forward(res), next);
		});
		router.post('/mispay/payin/:pid/pay', function(req, res, next){
			_cardman.pay(req.params.pid, req.body, function(r){
				if (_auto_transfer && r.Status && r.Status=='SUCCEEDED'){
					_distribute(req.params.pid, function(r2){
						r.Transferred = r2;
						if (r.DebitedFunds){
							var hd = {currency:r.DebitedFunds.Currency, amount:r.DebitedFunds.Amount};
							r.hash = makeHash(hd, _gapi_hashkey);
						}
						res.send(r);
					}, function(e){
						res.send(r);
					});
				} else {
					res.send(r);
				}
			}, next);
		});
		router.post('/mispay/payin/:pid/preauth', function(req, res, next){
			_cardman.preauth(req.params.pid, req.body, forward(res), next);
		});
		router.post('/mispay/payin/:pid/prepay', function(req, res, next){
			_cardman.prepay(req.params.pid, req.body, function(r){
				if (_auto_transfer && r.Status && r.Status=='SUCCEEDED'){
					_distribute(req.params.pid, function(r2){
						r.Transferred = r2;
						if (r.DebitedFunds){
							var hd = {currency:r.DebitedFunds.Currency, amount:r.DebitedFunds.Amount};
							r.hash = makeHash(hd, _gapi_hashkey);
						}
						res.send(r);
					}, function(e){
						res.send(r);
					});
				} else {
					res.send(r);
				}				
			}, next);
		});
		router.post('/mispay/payin/:pid/transfer', function(req, res, next){
			_distribute(req.params.pid, {}, forward(res), next);
		});
		router.get('/mispay/mango/callback', mango_callback);
		router.post('/mispay/kyc', uploadKyc);
	};
	
	return {
		config: _config,
		staticPath: __dirname + '/public',
		route: _route,
		
		request: _request,	//1, start payment
		checkout: _checkout,	//2. get basket
		card: _cardman, //3. register, update, 4. pay/preauth,prepay
		distribute: _distribute, //5. transfer to sellers (called in pay and prepay implicitly)

		cred: _cred,
		version: _ver,
		get: _get,	//for testing
		post: _post,
		put: _put,
		mcallback: mango_callback,
		validHash: _validHash,
	};
}

module.exports = MisPay;
