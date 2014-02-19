var request = require('request')
  , crypto = require('crypto')
  , querystring = require('querystring')
  , MTGOX_HTTP_ENDPOINT = 'https://data.mtgox.com/api/2/BTCUSD/money/'
  ;

module.exports = new HttpGoxClient(options);

// options will contain at least the key and the secret
function HttpGoxClient (options) {
  this.options = options || {};
  this.key = this.options.key;
  this.b64secret = new Buffer(this.options.secret, 'base64');
}

HttpGoxClient.prototype._executeRequest = function (options, cb) {
  if ('function' === typeof cb) {
    request(options, function(err, res, body) {
      if (err) {
        cb(err);
      } else {
        cb(null, JSON.parse(body));
      }
    });
  } else {
    return request(options);
  }
};

HttpGoxClient.prototype._makePublicRequest = function (path, args, cb) {
  // deal with optional args argument
  if ('function' === typeof args) {
    cb = args;
    args = {};
  }
  args ? args : args = {};

  var qs = querystring.stringify(args);
  if (qs) path = path + '?' + querystring;

  var headers = {
    'User-Agent': 'czzarr-mtgox-http-client',
  };
  var url = MTGOX_HTTP_ENDPOINT + path;
  var options = { url: url, headers: headers };

  return this._executeRequest(options, cb);
};

HttpGoxClient.prototype._makePrivateRequest = function (path, args, cb) {
  // deal with optional args argument
  if ('function' === typeof args) {
    cb = args;
    args = {};
  }
  args ? args : args = {};

  var url = MTGOX_HTTP_ENDPOINT + path;
  // use tonces instead of nonces to be able to send multiple requests at once
  args.tonce = Date.now() * 1000; // + Math.ceil(Math.random() * 1000);
  var data = querystring.stringify(args);
  var hash_data = 'BTCUSD/money/' + path + '\0' + data;
  var hmac = crypto.createHmac('sha512', this.b64secret);
  hmac.write(hash_data);
  hmac.end();
  var headers = {
    'User-Agent': 'czzarr-mtgox-http-client',
    'Rest-Key': this.key,
    'Rest-Sign': hmac.read().toString('base64'),
    'Content-Length': data.length,
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  var options = { url: url, method: 'POST', body: data, headers: headers };

  return this._executeRequest(options, cb);
};

HttpGoxClient.prototype.add = function (type, amount_int, price_int, cb) {
  // PREVENT MARKET ORDERS
  if (!typeof price_int === 'number') {
    console.log('trying to place a market order, exiting');
    return;
  }
  var path = 'order/add';
  var args = { type: type, amount_int: amount_int, price_int: price_int };
  return this._makePrivateRequest(path, args, cb);
};

HttpGoxClient.prototype.cancel = function (orderId, cb) {
  var path = 'order/cancel';
  var args = { oid: orderId };
  return this._makePrivateRequest(path, args, cb);
};

HttpGoxClient.prototype.idKey = function (cb) {
  var path = 'idkey';
  return this._makePrivateRequest(path, cb);
};

HttpGoxClient.prototype.info = function (cb) {
  var path = 'info';
  return this._makePrivateRequest(path, cb);
};

HttpGoxClient.prototype.lag = function (cb) {
  var path = 'order/lag';
  return this._makePublicRequest(path, cb);
};

HttpGoxClient.prototype.orders = function (cb) {
  var path = 'orders';
  return this._makePrivateRequest(path, cb);
};

HttpGoxClient.prototype.result = function (type, orderId, cb) {
  var path = 'order/result';
  var args = { type: type, order: orderId };
  return this._makePrivateRequest(path, args, cb);
};

HttpGoxClient.prototype.tickerFast = function (cb) {
  var path = 'ticker_fast';
  return this._makePublicRequest(path, cb);
};

HttpGoxClient.prototype.trades = function (since, cb) {
  var path = 'trades/fetch';
  var args = { since: since }
  return this._makePublicRequest(path, args, cb);
};
