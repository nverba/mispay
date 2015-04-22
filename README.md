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
