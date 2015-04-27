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
router.use('/mispay', express.static(mispay.staticPath));
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
$scope.mispayCallback = function(caller, status, data){
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

### Direct payment
This is a demo of doing a direct card payment. 
```html
<button ng-click="pay()">Pay</button>
```
Before calling GapiPay to request a payment transaction, the basket dataset must be prepared as follows:
```js
var Basket = {
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
//if $scope.basket if predefined, simply use ng-click="Payment.request()" on the button element.
$scope.pay = function(){
	$scope.basket = Basket;
	$scope.Payment.request();
};
```
A successful request will return a list of payment entries each with a different currency and a list of registered card if any.
If no card is registered before, show a register card button to allow registering a new card.(see Card section below).

### Pre-authorize a payment

There're two steps for a pre-authorized payment, the function in $scope is Payment.preauth(). The pre-authorization is similar to direct payment. The second step is Payment.prepay() with a pre-authorization Id from the first step.

## Card registration

* Allow user to enter card details
    FirstName, LastName, Email, Birthday, Nationality, CountryOfResidence
    Currency to register
* On click of Register button:
```js
    $scope.Card.preRegister($scope.pid, function(rd){
    	if (rd.Status=='CREATED'){
    		$scope.Card.register(card, function(rd){
    			if (rd.CardId){
    				//successful, add card to the selection list, and set to default
    			}
    		});
    	}
    });
```
In case we want to let the user confirm register, we can call preRegister first and show a confirm button, and then call register on clicking it.

## Developing

To test, install mocha and chai
	npm install -g mocha
	npm install chai --save-dev
    npm test

mispay-ng.js can be tested in the browser, open test/testpage.html to see the result.
