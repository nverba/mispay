/**
 * Module to work with either angularjs or jQuery. If angular not found, use jQuery by default.
 * With angularjs:
 * 		angular.module('App',['mispay'])
 *        .controller('..', function($http, MisPay){
 *           MisPay.doGet(url, function(data){..
 * jQuery:
 * $(function(){
 *    var mp = new MisPayClass($);
 *    mp.doGet(url, function(data){..
 */
	console.log('mispay-ng loaded');

var _angular = typeof(angular)=='undefined'?false:true;
if (_angular) {
	angular.module('mispay', [])
	.factory('MisPay', ['$http', function($http) {
		return new MisPayClass($http);
	}]);
}

var MANGO_CB_URL = location.protocol + '//' + location.host + '/mispay/mango/callback';
var MANGOPAY_SANDBOX = 'https://api.sandbox.mangopay.com';
var MANGOPAY_HOST = 'https://api.mangopay.com';

console.log('MANGO_CB_URL', MANGO_CB_URL);

var MisPayClass = function($http) {
	var misPay = this;
	var HDRJSON = {'Content-Type':'application/json'};
	
	var fail = function(data, status){
		console.log('[mispay.js] Request Error: status=',status,', data=',data);
		var ds = data.error || data.ResultMessage || data.Message || data.Status;
		if (typeof(ds)!='string') {
			ds = JSON.stringify(ds);
		}
		alert('[MangoPay] ' + ds);
		$("*").css("cursor", "default");
	};
	
	function doReq(methods, url, data, cb, hdrs) {
		var req = {
				method: methods,
				url: '/mispay/' + url,
				headers: hdrs || HDRJSON
			},
			ajax = (_angular ? $http : ($http || jQuery).ajax),
			success = (_angular ? 'success' : 'done'),
			fail = (_angular ? 'error' : 'fail');
			
		if (methods=='POST' || methods=='PUT' && data){
			req.data = data;
		}
		
		ajax(req)[success](cb)[fail](function(data,status){
			if(cb) cb({error:data,statusCode:status});
			else fail(data,status);
		});
	}
	
	function doGet(url, cb) {
		doReq('GET', url, null, cb);
	}
	
	function doPost(url, data, cb) {
		doReq('POST', url, data, cb);
	}
	
	function doPut(url, data, cb) {
		doReq('PUT', url, data, cb);
	}
	
	function doDel(url, cb) {
		doReq('DELETE', url, null, cb);
	}
	
	function isLive(cb) {
		doReq('GET', 'islive', null, cb);
	}
	
	var Request = {
		post: function(d, cb) {
			doPost('request', d, cb);
		},
		checkout: function(reqid, cb) {
			doGet('request/' + reqid + '/checkout', cb);
		}
	};
	
	var Card = {
		register: function(pid, cb) {
			doGet('payin/' + pid + '/regcard', cb);
		},
		success: function(pid, d, cb) {
			doPost('payin/' + pid + '/regdone', d, cb);
		},
		update: function(pid, cid, cb) {
			doPost('payin/' + pid + '/card', {cid:cid}, cb);
		},
		disable: function(bid, cid, cb) {
			doPut('buyer/'+bid+'/card/'+cid+'/disable', {}, cb);
		}
	};
	
	var Payment = {
		pay: function(pid, d, cb) {
			doPost('payin/' + pid + '/pay', d, cb);
		},
		preauth: function(pid, d, cb) {
			doPost('payin/' + pid + '/preauth', d, cb);
		},
		prepay: function(pid, d, cb) {
			doPost('payin/' + pid + '/prepay', d, cb);
		},
		distribute: function(pid, cb) {
			doPost('payin/' + pid + '/transfer', {}, cb);
		},
		repreauth: function(pid, preid, cb) {
			var d = preid.prid ? preid : {prid: preid};
			doPut('payin/' + pid + '/preauth', d, cb);
		},
		repay: function(pid, tid, cb) {
			var d = tid.tid ? tid : {tid: tid};
			doPut('payin/' + pid + '/pay', d, cb);
		},
	};
	
	
	function uploadAngular(url, data, cb) {
		$http({
			method: 'POST', 
			url: url,
			headers: {'Content-Type': undefined},
			transformRequest: function(data){
				var formData = new FormData();
				for (var k in data){
					console.log('## formData.append:',k,data[k]);
					formData.append(k, data[k]);
				}
				// formData.append("type", kyctype);
				// formData.append("file", file);
				return formData;
			},
			data: data
		}).success(cb).error(function(data,status){
			cb({error:data,statusCode:status});
		});
	}
	
	var KycDocument = {
		upload: function(bid, kyctype, file, cb){
			var url = '/mispay/kyc',
				data = {
					bid: bid,
					type: kyctype,
					file: file
				};
			if (_angular){
				console.log('[mispay-ng.js] KycDocument.upload:',url,data);
				//alert('continue');
				uploadAngular(url, data, cb);
			} else {
				alert('[mispay-ng.js] KycDocument.upload: jQuery upload not implemented');
			}
    	}		
	};
	
	var MangoPay = {
		setup: function($scope, mangoPay, client, live){
			if (!mangoPay.cardRegistration) {
				alert('[mispay-ng.js] Invalid mangoPay');
				return;
			}
			isLive(function(rd){
				live = rd.live;
				console.log('[mispay-ng.js] MangoPay.setup: live=',live);
				mangoPay.cardRegistration.baseURL = (live ? MANGOPAY_HOST : MANGOPAY_SANDBOX);
				mangoPay.cardRegistration.clientId = client;
				MisPayCtr($scope, mangoPay, misPay);
			});
		},
	};
	
	this.Request = Request;
	this.Card = Card;
	this.Payment = Payment;
	this.KycDocument = KycDocument;
	this.MangoPay = MangoPay;
	
	this.doGet = doGet;
	this.doPost = doPost;
	
	this.setFailFunc = function(f) {
		fail = f;
	};
};

// if not using angularjs, let $scope = {} with optional mispayCallback function.
function MisPayCtr($scope, mangoPay, misPay) {
	var cardReg = null, payinId = null, 
		requestId = null, payment = null;
	
	//for testing
	this.setMisPay = function(mp){
		misPay = mp;
	};
	
	this.setPayment = function(p){
		payment = p;
	};
	
	$scope.getPaymentOptions = function(){
		return payment;
	};
	
	function findPayIn(pid){
		if (!payment){
			payment = $scope.payment;
		}
		if (!payment || payment.pays.length<1) return null;
		for(var i=0;i<payment.pays.length;i++){
			var p = payment.pays[i];
			if(p.pid==pid){
				return p;
			}
		}
		return null;
	}
	
	function addCard(cd, pid){
		var p=findPayIn(pid || payinId);
		if (!p) return;
		if (!p.cards) p.cards = [cd]; else p.cards.push(cd);
	}
	
	/**
	 * Called by Payment.request on successfully created a payment request on GapiPay.
	 * @param cb - callback function(error, data), if not given, $scope.mispayCallback(..) should be available.
	 */
	function _checkout(cb){
		misPay.Request.checkout(requestId, function(pay){
			if (!pay.pays){
				if(cb) cb(pay);else
				if ($scope.mispayCallback) $scope.mispayCallback('Payment.request','error',pay);
				return;
			}
			if (pay.pays.length === 0){
				setTimeout(function(){_checkout(cb);}, 200);
			} else {
				pay.rid = requestId;
				payment = pay;
				if (cb) cb(null, pay); else {
					if ($scope.mispayCallback) $scope.mispayCallback('Payment.request','ok',payment);
				}
			}
		});
	}
	
	console.log('mispay-ng initiated');
	
	$scope.KycDocument = misPay.KycDocument;
	
	$scope.Payment = {
		/**
		 * Request to start a payment with a basket.
		 * @param basket - if basket not given, use $scope.basket
		 */
		request: function(basket, cb){
			if (!basket) {
				basket = $scope.basket;
				if (!basket){
					alert('[mispay-ng.js] No basket or $scope.basket');
					return;
				}
			}
			misPay.Request.post(basket, function(rd){
				if (rd.id) {
					requestId = rd.id;
					setTimeout(function(){_checkout(cb);}, 200);
				} else {
					if (cb) cb(rd); else {
						if ($scope.mispayCallback){
							$scope.mispayCallback('Payment.request','error',rd);
						}
					}
				}
			});
		},
		/**
		 * Query gapipay to get list of payments for a request.
		 * This function is repeated called with a timer until some data arrive.
		 */
		checkout: _checkout,
		/**
		 * Do a card payment after selecting or registering it.
		 * @param pid - payin id, if not given, use $scope.pid
		 */
		pay: function(pid, cb){
			if (!pid) pid = $scope.pid;
			var p = findPayIn(pid);
			if (!p) {
				alert('[mispay-ng.js] No pid or $scope.pid, or pid not found');
				return;
			}
			if (!p.usecard){
				alert('[mispay-ng.js] No card to use');
				return;
			}
			misPay.Payment.pay(pid, {cid:p.usecard, ReturnURL:MANGO_CB_URL}, function(rd){
				
				console.log('RD STATUS origin', rd);
				
				if (rd.Status=='SUCCEEDED'){
					if(cb) cb(null, rd); else {
						if ($scope.mispayCallback) $scope.mispayCallback('Payment.pay','ok',rd);
					}
				} else if (rd.Status=='CREATED' && rd.SecureModeNeeded){
					if(cb)cb(null,rd);else
					if ($scope.mispayCallback) $scope.mispayCallback('Payment.pay','redirect',rd.SecureModeRedirectURL);
				} else {
					console.log('[mispay-ng.js] Payment.pay error:',rd);
					if(cb) cb(rd); else {
						if ($scope.mispayCallback) $scope.mispayCallback('Payment.pay','error',rd);
					}
				}
			});
		},
		/**
		 * Call repay after 3d secure redirection back with a transactionId
		 */
		repay: function(pid, transId, cb){
			if (!pid) pid = $scope.pid;
			if (!transId) transId = $scope.transId;
			if (!pid || !transId){
				alert('[mispay-ng.js] pid or transId missing');
				return;
			}
			misPay.Payment.repay(pid, {tid:transId}, function(rd){
				if (rd.Status=='SUCCEEDED'){
					if(cb) cb(null,rd); else {
						if($scope.mispayCallback) $scope.mispayCallback('Payment.pay','ok',rd);
					}
				} else {
					if(cb) cb(rd); else {
						if ($scope.mispayCallback) $scope.mispayCallback('Payment.pay','error',rd);
					}
				}
			});
		},
		/**
		 * Pre-authorize a payment.
		 * If 3D secure required, call $scope.secureRedirect(url, pid)
		 */
		preauth: function(pid, cb){
			if (!pid) pid = $scope.pid;
			var p = findPayIn(pid);
			if(!p){
				alert('[mispay-ng.js] No pid or $scope.pid');
				return;
			}
			if (!p.usecard){
				alert('[mispay-ng.js] No card to use');
				return;
			}
			misPay.Payment.preauth(pid, {cid:p.usecard,ReturnURL:MANGO_CB_URL}, function(rd){
				if (rd.Status=='SUCCEEDED'){
					if(cb)cb(null,rd); else {
						p.preauth = rd; //with Id as preauthorization.Id
						if ($scope.mispayCallback) $scope.mispayCallback('Payment.preauth','ok',rd);
					}
				} else if (rd.Status=='CREATED' && rd.SecureModeNeeded){
					if(cb)cb(null,rd);else
					if ($scope.mispayCallback) $scope.mispayCallback('Payment.preauth','redirect',rd.SecureModeRedirectURL);
				} else {
					if(cb)cb(rd);else {
						if ($scope.mispayCallback) $scope.mispayCallback('Payment.preauth','error',rd);
					}
				}
			});
		},
		/**
		 * Call preauth after 3d secure redirection back with a preAuthorizationId
		 */
		repreauth: function(pid, preAuthId, cb){
			if (!pid) pid = $scope.pid;
			if (!preAuthId) preAuthId = $scope.preAuthId;
			if (!pid || !preAuthId){
				alert('[mispay-ng.js] pid or preAuthId missing');
				return;
			}
			misPay.Payment.repreauth(pid, {prid:preAuthId}, function(rd){
				if (rd.Status=='SUCCEEDED'){
					if(cb) cb(null,rd); else {
						if($scope.mispayCallback) $scope.mispayCallback('Payment.preauth','ok',rd);
					}
				} else {
					if(cb) cb(rd); else {
						if ($scope.mispayCallback) $scope.mispayCallback('Payment.preauth','error',rd);
					}
				}
			});
		},
		/**
		 * Confirm a pre-authorized payment with a preauthorization id.
		 * @param pid : payin_id or $scope.pid
		 * @param amount : or $scope.preAmount, optional amount to pay in cents, should be less than or equal to the pre-authorized amount
		 */
		prepay: function(pid, amount, cb){
			if (!pid) pid = $scope.pid;
			if (!pid) {
				alert('[mispay-ng.js] pid or $scope.pid missing');
				return;
			}
			if (!amount) amount = $scope.preAmount;
			var d = amount ? {amount: amount} : {};
			misPay.Payment.prepay(pid, d, function(rd){
				if (rd.Status=='SUCCEEDED'){
					if(cb)cb(null,rd);else{
						if ($scope.mispayCallback) $scope.mispayCallback('Payment.prepay','ok',rd);
					}
				} else {
					if(cb)cb(rd);else{
						if ($scope.mispayCallback) $scope.mispayCallback('Payment.prepay','error',rd);
					}
				}
			});
		},
	};
	
	$scope.Card = {
		/**
		 * Pre-register a card to get accesskey for a currency.
		 * @param payid - payment.pays[i].id, if not given, use $scope.pid
		 * @param cb - callback function(error, data)
		 */
		preRegister: function(payid, cb){
			payinId = payid || $scope.pid;
			if (!payinId){
				alert('[mispay-ng.js] No pid or $scope.pid');
				return;
			}
			misPay.Card.register(payinId, function(rd){
				if (rd.Status=='CREATED'){
					cardReg = rd;
					if (cb) cb(null, rd);else{
						if ($scope.mispayCallback) $scope.mispayCallback('Card.preRegister','ok',rd);
					} //(err, data)
				} else {
					if (cb) cb(rd);else{
						if ($scope.mispayCallback) $scope.mispayCallback('Card.preRegister','error',rd);
					}
				}
			});
		},
		/**
		 * Cancel a pre-registered action.
		 */
		cancel: function(){
			cardReg = null;
		},
		/**
		 * Register a card on mangopay with user-given details.
		 * This is done via mangopay only, nothing is sent to gapipay.
		 * @param card: if not given, use $scope.card with all rest ignored
		 * card object format:
		 * {
		 * 	cardNumber: '',
		 * 	cardExpirationDate: 'mmyy',
		 * 	cardCvx: '123',
		 * 	cardType: ''
		 * }
		 */
		register: function(card, cb){
			if (!payinId || !cardReg){
				alert('[mispay-ng.js] No pid or card not pre-registered');
				return;
			}
			
			if (!card) card = $scope.card;
			if (!card || !card.cardNumber){
				alert('[mispay-ng.js] No proper $scope.card found');
				return;
			}
			
			var cr = {
				Id: cardReg.Id, 
				accessKey: cardReg.AccessKey,
				preregistrationData: cardReg.PreregistrationData,
				cardRegistrationURL: cardReg.CardRegistrationUrl};
			
			mangoPay.cardRegistration.init(cr);

			if (!card.cardType) card.cardType = 'CB_VISA_MASTERCARD';
			
			mangoPay.cardRegistration.registerCard(card, 
				function(res){
					misPay.Card.update(payinId, res.CardId, function(cd){
						if (cd.CardId){
							addCard(cd);
							if (cb) cb(null, cd);else{
								if ($scope.mispayCallback) $scope.mispayCallback('Card.register','ok',cd);
							}
						}
					});
				},
				function(er){
					console.log('[mispay-ng.js] mangoPay registerCard error:', er);
					if (cb) cb(er);else{
						if ($scope.mispayCallback) $scope.mispayCallback('Card.register','error',er);
					}
				}
			);
		},
		
		disable: function(bid, cardid, cb){
			misPay.Card.disable(bid, cardid, cb);
		}
	};
}
