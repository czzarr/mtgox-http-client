# mtgox-http-client

Client for MtGox's HTTP API. Public and private methods.
Not everything is in there, pull requests welcome for what's missing.

Uses `mikeal/request` under the hood. The code is self-explanatory.

## Example
```javascript
var MtGoxHttpClient = require('mtgox-http-client')
var mtGoxHttpClient = new MtGoxHttpClient({ key: 'xxx', secret: 'yyy' })

mtGoxHttpClient.add('bid', 1000000, 100000, function (err, body) {
  console.log(body);
})
```

## Install
`npm install mtgox-http-client`

## API
`add(type, amount, price)`: add an order
`cancel(orderId, cb)`: cancel an order
`idKey(cb)`: get an idKey
`info(cb)`: get info
`lag(cb)`: get lag
`orders(cb)`: get open orders
`result(type, orderId, cb)`: get the result on an order
`tickerFast(cb)`: get ticker values
`trades(since, cb)`: get trades since `date`

## Tests
You will need a real API {key, secret} tuple and a non-zero balance on
MtGox to launch them. They are executing real orders, be careful.

## License
MIT
