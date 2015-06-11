var http = require('http');
var path = require('path');
var express = require('express'); //4.x
var bodyParser = require('body-parser');
var multer = require('multer');

var mispay = require('../lib/mispay.js')({
    username: 'MakeitSocial',
    password: 'MiSv2.0wBFBin2019',
    hashkey: 'Mjk4Y2ZkZjctYjVkYi00ZTQzLWI5ZDktMDFiZGJhMDFhMmQx',
    GapiHashKey: 'bcd7a07e61cc495bbf04de78085f4a6d'
});
var router = express();
var server = http.createServer(router);

router.use(express.static('lib/public'));
router.use(express.static('test'));
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(multer({dest:'/tmp'})); // for parsing multipart/form-data

mispay.route(router);
router.use('/mispay', express.static(mispay.staticPath));

server.listen(process.env.PORT || 8080, process.env.IP || "localhost", function() {
    var addr = server.address();
    console.log("MiS server listening at", addr.address + ":" + addr.port);
});
