# mispay.js

## Installation

    npm install makeitsocial/mispay.js

## Documentation

See https://gapipay.appspot.com/developer

## Set up

In the server.js or app.js file, import the module with a client username and password.

```js
var mispay = require('mispay')('username','password');
``` 

## Use express router

mispay.js uses the hard-coded route path '/mispay'. Use a bodyParser to parse JSON body content.

```js
var express = require('express');
var router = express();

mispay.route(router);
```

## Front-end

To allow referecing the scripts, configure a static directory on express:

```js
router.use('/mispay/js', express.static(mispay.staticPath));
```

Reference the mispay-ng.js, the AngularJs-based script, in the html page:

```html
<script src="/mispay/js/mangopay-kit.min.js"></script>
<script src="/mispay/js/mispay-ng.js"></script>
```
and 'ccs.js' for country codes if necessary.
```html
<script src="/mispay/js/css.js"></script>
```

### Set up mangopay

In the ng-controller function, configure mangopay access and pass in $scope:
```js
MisPay.MangoPay.setup($scope, mangoPay, 'client_id', false); //or true if live
```
Then the following $scoped functions will be available for use:
    Payment.request()
    Payment.pay()
    Payment.preauth()
    Payment.prepay()
    Card.preRegister()
    Card.register()

Implement the following $scoped functions to be called back by the above functions with returned data:
```js
// onRequest will be called from Request.post with returned data from GapiPay:
$scope.mispayCallback(caller, status, data){
	console.log(caller, status, data);
	if (status == 'error'){
		return;
	} else if (status == 'redirect') {
		//show iframe to allow user enter 3D secure secret
	} else if (caller == 'Payment.request'){
		if (data.rid) {
			//success, show data.pays list to allow register card and pay
		}
	}
}
```
Status tags:
    ok : request successful
    error : request has an error
    redirect : for 3D secure mode, requires redirection to 3D secure page
Call names:
	Payment.request
	Payment.pay
	Payment.preauth
	Payment.prepay
	Card.preRegister
	Card.register

### The pay button
This is a demo of doing a direct card payment.
```html
<button ng-click="pay()">Pay</button>
```

```js
var basket = {
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
		}
	]
};
//in ngController:
$scope.pay = function(){
	MisPay.Request.post(basket, function(r){
		if (r.id) {
			$scope.requestId = r.id;
			setTimeout(checkout, 200); //leave some time for the gapipay server
		} else {
			alert(r);
		}
	});
};
function checkout(){
	MisPay.Request.checkout($scope.requestId, function(pay){
		if (pay.pays && pay.pays.length > 0){
			$scope.payment = pay; //show user the basket and let them pay one by one
		} else if (pay.pays.length == 0){
			setTimeout(checkout, 200); //poll until the request handled.
		} else {
			alert(pay);
		}
	});
}
```

### Pre-authorize a card payment

## Developing

To test, install mocha and chai
	npm install -g mocha
	npm install chai --save-dev
    npm test
