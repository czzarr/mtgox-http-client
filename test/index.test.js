var chai = require('chai')
  , _ = require('underscore')
  , async = require('async')
  , io = require('socket.io-client')
  , currency = require('mtgox-currency')
  , HttpGoxClient = require('../httpGoxClient')
  , MTGOX_HTTP_ENDPOINT = 'https://data.mtgox.com/api/2/BTCUSD/money/'
  , MTGOX_SOCKETIO_ENDPOINT = 'https://data.mtgox.com/api/2/BTCUSD/money/'
  , MTGOX_SOCKETIO_ENDPOINT = 'https://socketio.mtgox.com/mtgox?Currency=USD'
  , MTGOX_WEBSOCKET_CHANNELS = {
      trade: 'dbf1dee9-4f2e-4a08-8cb7-748919a71b21',
      depth: '24e67e0d-1cad-4cc0-9e7a-f8523ef460fe',
      ticker: 'd5f06780-30a8-4a48-a2f8-7ed181b4a13f'
    }
  , options = { key: , secret: }
  // ++++++++++++++++++++++++++++++++
  // ================================
  // ================================
  // BE VERY CAREFUL WITH THESE VALUES
  // OR YOU WILL EXECUTE UNWANTED TRADES
  // ================================
  // ================================
  // ++++++++++++++++++++++++++++++++
  , test = { bid_price_int: 100000 // we place test bids at $1.00
           , ask_price_int: 100000000000 // we place test asks at $1,000,000.00
           , amount_int: 1000000 // 0.01 BTC
           }
  ;

chai.should();
var httpGoxClient = new HttpGoxClient(options);

function cancelTestOrder (order, callback) {
  if (order.amount.value_int == test.amount_int && order.price.value_int == test.bid_price_int) {
    httpGoxClient.cancel(order.oid, callback);
  }
  callback(null);
}

describe('HTTP Gox Client', function () {

  describe('Public methods', function () {
    it('fast ticker', function (done) {
      httpGoxClient.tickerFast(function (err, body) {
        body.result.should.equal('success');
        done();
      });
    });
    it('order lag', function (done) {
      httpGoxClient.lag(function (err, body) {
        body.result.should.equal('success');
        done();
      });
    });
  });

  describe('Private methods', function () {
    it('idkey', function (done) {
      httpGoxClient.idKey(function (err, body) {
        body.result.should.equal('success');
        body.data.should.not.be.null;
        var conn = io.connect(MTGOX_SOCKETIO_ENDPOINT);
        conn.on('connect', function () {
          conn.emit('message', { op: 'mtgox.subscribe', key: body.data });
        });
        conn.on('message', function (data) {
          if (data.op === 'subscribe') {
            if (!_.contains(MTGOX_WEBSOCKET_CHANNELS, data.channel)) {
              done();
            }
          }
        });
      });
    });

    it('info', function (done) {
      httpGoxClient.info(function (err, body) {
        body.result.should.equal('success');
        body.data.Index.should.equal('10613');
        done();
      });
    });

    it('orders', function (done) {
      httpGoxClient.orders(function (err, body) {
        body.result.should.equal('success');
        done();
      });
    });
  });

  describe.skip('Adding orders', function () {

    before(function (done) {
      // clear and test orders that were left over after failed tests
      httpGoxClient.orders(function (err, body) {
        async.each( body.data
                  , cancelTestOrder
                  , function (err) {
                      if (err) return done(err);
                      console.log('before: cancel any test order left over\n');
                      done();
                    }
                  );
      });
    });

    describe('Placing and cancelling orders', function () {
      it('add and cancel an order', function (done) {
        console.time('add order');
        httpGoxClient.add('bid', test.amount_int, test.bid_price_int, function (err, body) {
          console.timeEnd('add order');
          body.result.should.equal('success');
          body.data.should.exist;
          var orderId = body.data;
          httpGoxClient.orders(function (err, body) {
            body.result.should.equal('success');
            body.data.some(function (el, i) {
              return el.oid === orderId &&
              _.isEqual(el.amount, {
                'value': currency.btcInt2FloatString(test.amount_int),
                'value_int': test.amount_int.toString(),
                'display': currency.btcInt2Display(test.amount_int),
                'display_short': currency.btcInt2DisplayShort(test.amount_int),
                'currency': 'BTC'
              }) &&
              _.isEqual(el.price, {
                'value': currency.usdInt2FloatString(test.bid_price_int),
                'value_int': test.bid_price_int.toString(),
                'display': currency.usdInt2Display(test.bid_price_int),
                'display_short': currency.usdInt2DisplayShort(test.bid_price_int),
                'currency': 'USD'
              });
            }).should.be.true;
            console.time('cancel order');
            httpGoxClient.cancel(orderId, function (err, body) {
              console.timeEnd('cancel order');
              body.result.should.equal('success');
              body.data.oid.should.equal(orderId);
              // setTimeout seems necessary because of mtgox lag
              setTimeout(function () {
                httpGoxClient.orders(function (err, body) {
                  body.data.some(function (el, i) {
                    return el.oid === orderId;
                  }).should.be.false;
                  done();
                });
              }, 1000);
            });
          });
        });
      });

      it.skip('try adding 10 orders at once', function (done) {
        this.timeout(30000);
        async.timesSeries(10, function (n, next) {
          httpGoxClient.add('bid', test.amount_int, test.bid_price_int, function (err, body) {
            body.result.should.equal('success');
            body.data.should.exist;
            console.log(body.result);
            console.log(body.data);
            next(err);
          });
        },
        function (err) {
         if (err) return done(err);
         done();
        });
      });

    });


    // after all tests, clear test orders
    after(function (done) {
      httpGoxClient.orders(function (err, body) {
        async.each( body.data
                  , cancelTestOrder
                  , function (err) {
                      if (err) return done(err);
                      console.log('after: cancelled any test order left over');
                      done();
                    }
                  );
      });
    });
  });
});

