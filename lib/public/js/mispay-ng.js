angular.module('mispay', [])

.factory('MisPay', ['$http', function($http) {
	return new MisPayClass($http);
}]);

var MANGO_CB_URL = location.protocol + '//' + location.host + '/mispay/mango/callback';
var MANGOPAY_SANDBOX = 'https://api.sandbox.mangopay.com';
var MANGOPAY_HOST = 'https://api.mangopay.com';

var MisPayClass = function($http) {
	var misPay = this;
	var HDRJSON = {'Content-Type':'application/json'};
	
	var fail = function(data, status){
		console.log('Request Failure, status=',status,', data=',data);
		alert(data.error || data.ResultMessage || data.Message || data.Status);
		$("*").css("cursor", "default");
	}
	
	function doGet(url, cb) {
		$http.get(url).success(cb).error(function(data, status){
			if(cb) cb({error:data,statusCode:status});else fail(data,status);
		});
	}
	
	function doReq(methods, url, data, cb) {
		$http({method:methods,url:url,data:data,headers:HDRJSON}).success(cb).error(function(data, status){
			if(cb) cb({error:data,statusCode:status});else fail(data,status);
		});
	}
	
	function doPost(url, data, cb) {
		doReq('POST', url, data, cb);
	}
	
	function doPut(url, data, cb) {
		doReq('PUT', url, data, cb);
	}
	
	function doDel(url, data, cb) {
		doReq('DELETE', url, data, cb);
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
			doPut('payin/' + pid + '/preauth', {prid:preid}, cb);
		},
		repay: function(pid, tid, cb) {
			doPut('payin/' + pid + '/pay', {tid:tid}, cb);
		},
	};
	
	var MangoPay = {
		setup: function($scope, mangoPay, client, live){
			if (!mangoPay.cardRegistration) {
				alert('Invalid mangoPay');
				return;
			}
			mangoPay.cardRegistration.baseURL = (live ? MANGOPAY_HOST : MANGOPAY_SANDBOX);
			mangoPay.cardRegistration.clientId = client;
			MisPayCtr($scope, mangoPay, misPay);
		},
	};
	
	this.Request = Request;
	this.Card = Card;
	this.Payment = Payment;
	this.MangoPay = MangoPay;
	
	this.doGet = doGet;
	this.doPost = doPost;
	
	this.setFailFunc = function(f) {
		fail = f;
	};
};

function MisPayCtr($scope, mangoPay, misPay) {
	var cardReg = null, payinId = null, 
		requestId = null, payment = null;
	
	//for testing
	this.setMisPay = function(mp){
		misPay = mp;
	};
	
	this.setPayment = function(p){
		payment = p;
	}
	
	$scope.getPaymentOptions = function(){
		return payment;
	};
	
	function findPayIn(pid){
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
			if (pay.pays.length==0){
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
	
	$scope.Payment = {
		/**
		 * Request to start a payment with a basket.
		 * @param basket - if basket not given, use $scope.basket
		 */
		request: function(basket, cb){
			if (!basket) {
				basket = $scope.basket;
				if (!basket){
					alert('No basket or $scope.basket');
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
			})
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
				alert('No pid or $scope.pid, or pid not found');
				return;
			}
			if (!p.usecard){
				alert('No card to use');
				return;
			}
			misPay.Payment.pay(pid, {cid:p.usecard, ReturnURL:MANGO_CB_URL}, function(rd){
				if (rd.Status=='SUCCEEDED'){
					if(cb) cb(null, rd); else {
						if ($scope.mispayCallback) $scope.mispayCallback('Payment.pay','ok',rd);
					}
				} else if (rd.Status=='CREATED' && rd.SecureModeNeeded){
					if(cb)cb(null,rd);else
					if ($scope.mispayCallback) $scope.mispayCallback('Payment.pay','redirect',rd.SecureModeRedirectURL);
				} else {
					console.log('Payment.pay error:',rd);
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
				alert('pid or transId missing');
				return;
			}
			misPay.Payment.pay(pid, {tid:transId}, function(rd){
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
				alert('No pid or $scope.pid');
				return;
			}
			if (!p.usecard){
				alert('No card to use');
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
				alert('pid or preAuthId missing');
				return;
			}
			misPay.Payment.pay(pid, {prid:preAuthId}, function(rd){
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
				alert('pid or $scope.pid missing');
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
				alert('No pid or $scope.pid');
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
				alert('No pid or card not pre-registered');
				return;
			}
			
			if (!card) card = $scope.card;
			if (!card || !card.cardNumber){
				alert('No proper $scope.card found');
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
					console.log('mangoPay registerCard error:', er);
					if (cb) cb(er);else{
						if ($scope.mispayCallback) $scope.mispayCallback('Card.register','error',er);
					}
				}
			);
		}
	};
}
