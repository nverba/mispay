'use strict';
var https = require('https');

var GAPIPAY_HOST = 'gapipay.appspot.com';
var HEADER_JSON = {'accept': 'application/json', 'Content-Type': 'application/json'};

function MisPay(_username, _password, _options) {
	var _ver = _options ? (_options.version || 'v1') : 'v1',
		_basicauth = _makeAuthStr(_username, _password);
	
	function _makeAuthStr(u, p){
		if (u && p) {
			_basicauth = u + ':' + p;
		}
	}
	
	var _config = function(user, pass) {
		if (user.username && user.password){
			_username = user.username;
			_password = user.password;
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
		var req = https.request(opt, function(res){
			res.setEncoding('utf8');
			res.on('data', cbok);
		});
		if (data) req.write(data);
		req.end();
		req.on('error', function(e){
			if (failure) {
				failure(e);
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

	return {
		config: _config,
		cred: _cred,
		version: _ver,
		get: _get,	//for testing
		post: _post,
		put: _put,
		staticPath: __dirname + '/public',
	};
}

module.exports = MisPay;
