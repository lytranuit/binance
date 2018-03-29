const binance = require('node-binance-api');
const mysql = require('promise-mysql');
const config = require('./config.json');
const key = require('./key.json');
const moment = require('moment');
const math = require('mathjs');
const technical = require('technicalindicators');
const clc = require('cli-color');

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var http = require('http');


/******************
 * 
 * CONFIG MYSQL
 * 
 *****************/
const  pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'binance',
    connectionLimit: 10
});
/******************
 * 
 * END CONFIG MYSQL
 * 
 *****************/




/******************
 * 
 * CONFIG MAIL
 * 
 *****************/
var nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'lytranuit@gmail.com',
        pass: 'vohinhcaAsd123'
    }
});
const mailOptions = {
    from: 'lytranuit@gmail.com',
    to: 'lytranuit@gmail.com',
    subject: 'Báo cáo giá Binance'
};
/******************
 * 
 * END CONFIG MAIL
 * 
 *****************/

/******************
 * 
 * SERVER
 * 
 *****************/
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;


/******************
 * 
 * END CONFIG SERVER
 * 
 *****************/


/******************
 * 
 * CONFIG BINANCE
 * 
 *****************/
binance.options(key);
var currentTime = null;
/******************
 * 
 * END CONFIG MAIL
 * 
 *****************/
var markets = require('./models/market');
binance.prices((error, ticker) => {
    if (error) {
        return console.error(error);
    }
    var array_market = [];
    for (var i in ticker) {
        var market = i;
        var last = ticker[i];
        if (market.indexOf("BTC") != -1) {
            markets.create(market);
            markets.update(market, {last: last});
            array_market.push(market);
        }
    }
    binance.websockets.chart(array_market, "1h", (market, interval, results) => {
        if (Object.keys(results).length === 0)
            return;
        markets.read(market).setIndicator(interval, results);
    });
    binance.websockets.chart(array_market, "5m", (market, interval, results) => {
        if (Object.keys(results).length === 0)
            return;
        markets.read(market).setIndicator(interval, results);
        /*
         * 
         * @type type
         */
        let tick = binance.last(results);
        var last = results[tick].close;
//                console.log(results[tick]);
        if (markets.read(market).periodTime && markets.read(market).periodTime == tick && !results[tick].isFinal) {
//                    console.log(market + " last price: " + last);
            markets.update(market, {last: last});
            markets.read(market).chienluoc1.checkmua(last);
            markets.read(market).chienluoc1.checkban(last, results);
        } else {
//                    console.log(tick);
            if (currentTime != tick) {
                currentTime = tick;
                console.log("Bắt đầu phiên:", moment.unix(tick / 1000).format());
                console.log("Price of BTC: ", markets.read('BTCUSDT').last);
                var sumBTC = 0;
                var allMarkets = markets.all();
                for (var market in allMarkets) {
                    if (market != "BTCUSDT")
                        sumBTC += allMarkets[market].last * allMarkets[market].available;
                    else
                        sumBTC += allMarkets[market].available;
                }
                var sumUSDT = sumBTC * markets.read("BTCUSDT").last;
                console.log("My BTC: ", sumBTC);
                console.log("MY USDT: ", sumUSDT);
                console.log("BTC Available: ", markets.read("BTCUSDT").available);
            }
            if (markets.read(market).chienluoc1.notbuyinsession)
                markets.updatechienluoc1(market, {countIgnoreSession: markets.read(market).chienluoc1.countIgnoreSession - 1});
            /*
             * MUA Lai SAu x LUOT
             */
            if (markets.read(market).chienluoc1.countIgnoreSession == 0) {
                markets.updatechienluoc1(market, {countIgnoreSession: 5, notbuyinsession: false});
            }
        }
//                console.log(moment().startOf("hour").valueOf());
//                console.log(markets[market].periodTime);
        if (markets.read(market).periodTime == moment().startOf("hour").valueOf()) {
            markets.update(market, {count_buy: 0, count_sell: 0});
        }
        markets.read(market).periodTime = tick;
    });
//    binance.websockets.trades(array_market, (trades) => {
//        let {e: eventType, E: eventTime, s: symbol, p: price, q: quantity, m: maker, a: tradeId} = trades;
//        if (markets[symbol]) {
//            if (maker)
//                markets[symbol].count_sell++;
//            else
//                markets[symbol].count_mua++;
//        }
//    });
//    binance.websockets.depthCache(array_market, (depth) => {
//        console.log(depth);
//        return;
//        let {e: eventType, E: eventTime, s: symbol, u: updateId, b: bidDepth, a: askDepth} = depth;
////        console.log(depth);
//        if (markets[symbol]) {
//            var depthCache = binance.depthCache(symbol);
//            console.log(depthCache);
//            let bids = Object.values(depthCache.bids);
//            let asks = Object.values(depthCache.asks);
//            let sumbids = math.sum(bids);
//            let sumasks = math.sum(asks);
//            markets[symbol].bids_q = sumbids;
//            markets[symbol].asks_q = sumasks;
//        }
//    });
    var query = pool.query("SELECT * FROM trade where is_sell IS NULL").then(function (rows, err) {
        if (err) {
            console.log(err);
        }
        for (var i in rows) {
            var market = rows[i].MarketName;
            var price_buy = rows[i].price_buy;
            var id = rows[i].id;
            var obj = markets.read(market);
            console.log(obj)
            var idBuy = obj.chienluoc1.idBuy;
            markets.updatechienluoc1(market, {idBuy: idBuy});
            markets.read(market).chienluoc1.mua(price_buy);
        }
    });
    console.log("Price of BTC: ", ticker.BTCUSDT);
});
//binance.balance((error, balances) => {
//    console.log("balances()", balances);
////    console.log("ETH balance: ", balances.ETH.available);
//});
// The only time the user data (account balances) and order execution websockets will fire, is if you create or cancel an order, or an order gets filled or partially filled
function balance_update(data) {
    console.log("Balance Update");
    for (let obj of data.B) {
        let {a: asset, f: available, l: onOrder} = obj;
        if (available == "0.00000000")
            continue;
        console.log(asset + "\tavailable: " + available + " (" + onOrder + " on order)");
    }
}
function execution_update(data) {
    let {x: executionType, s: symbol, p: price, q: quantity, S: side, o: orderType, i: orderId, X: orderStatus} = data;
    if (executionType == "NEW") {
        if (orderStatus == "REJECTED") {
            console.log("Order Failed! Reason: " + data.r);
        }
        console.log(symbol + " " + side + " " + orderType + " ORDER #" + orderId + " (" + orderStatus + ")");
        console.log("..price: " + price + ", quantity: " + quantity);
        return;
    }
//NEW, CANCELED, REPLACED, REJECTED, TRADE, EXPIRED
    console.log(symbol + "\t" + side + " " + executionType + " " + orderType + " ORDER #" + orderId);
}
binance.websockets.userData(balance_update, execution_update);







/******************
 * 
 * CONFIG APACHE
 * 
 *****************/


var port = process.env.PORT || 3000;
app.set('port', port);
var server = http.createServer(app);
/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
            ? 'Pipe ' + port
            : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
            ? 'pipe ' + addr
            : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}
/******************
 * 
 * END CONFIG APACHE
 * 
 *****************/