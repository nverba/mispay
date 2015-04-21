# mispay.js

## Installation

    npm install makeitsocial/mispay.js

## Documentation

See https://gapipay.appspot.com/developer

## Set up

In the server.js or app.js file, add the following.

```js
var mispay = require('mispay');

mispay.config({
	username: '...',
	password: '...'
});
``` 

## Front-end

Reference the mpay.js or mpay.min.js in the html page as front end. Configure static path in express:

```js
server.use('/mispay', express.static(mispay.staticPath));
```

In the browser:
```html
<script src="/mispay/js/mpay.min.js"></script>
```


## Developing

    npm test
