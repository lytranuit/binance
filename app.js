const binance = require('node-binance-api');
const mysql = require('promise-mysql');
const moment = require('moment');
const math = require('mathjs');
const technical = require('technicalindicators');
const clc = require('cli-color');

var compression = require('compression');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var passport = require("passport");
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session');
var logger = require('morgan');
require('dotenv').config();
var http = require('http');

var Mail = require("./models/mail");

/******************
 * 
 * CONFIG MYSQL
 * 
 *****************/
 global.options_sql = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}
/******************
 *
 * END CONFIG MYSQL
 * 
 *****************/

 passport.serializeUser(function (user, done) {
    done(null, user);
});

 passport.deserializeUser(function (user, done) {
    done(null, user);
});
 passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    session: true
},
function (username, password, done) {
    if (username == "daotran" && password == "Asd1234")
        return done(null, username);
    else
        return done(null, false);
})
 );
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
 var apiRouter = require('./routes/api');
 var authRouter = require('./routes/auth');

 var app = express();

 app.use(compression());
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {maxAge: 31557600}));
app.use(session({
    secret: "secret",
    saveUninitialized: true,
    resave: true,
    key: 'sid'
}))

app.use(passport.initialize());
app.use(passport.session());


app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/auth', authRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'production' ? {} : err;

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
app.locals.round = function (value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
};
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
 binance.options({
    APIKEY: process.env.APIKEY,
    APISECRET: process.env.APISECRET
});
 global.currentTime = null;
 global.primaryCoin = ["BTC", "USDT"];
 global.myBalances = {};
 global.ignoreCoin = ["BNB", "BTC"];


/******************
 * 
 * END CONFIG MAIL
 * 
 *****************/
 var MarketModel = require('./models/market');
 var ChisoModel = require('./models/chiso');
 global.markets = {};
 mysql.createConnection(options_sql).then(function (conn) {
    var result = conn.query("select * from options");
    conn.end();
    return result;
}).then(function (rows, err) {
    if (err) {
        console.log(err);
    }
    for (var i in rows) {
        var key = rows[i]['key'];
        var value = rows[i]['value'];
        switch (key) {
            case "primaryCoin":
            primaryCoin = value.split(",");
            break;
            case "ignoreCoin":
            ignoreCoin = value.split(",");
            break;
            default:
            if (key.indexOf("stopmua") != -1) {
                global[key] = stringtoBoolean(value);
            } else {
                global[key] = value;
            }
            break;
        }
    }
    return true;
}).then(function () {
    binance.useServerTime(() => {
        if (process.env.NODE_ENV == "production") {
            binance.balance((error, balances) => {
                myBalances = balances;
            });
            binance.websockets.userData(balance_update, execution_update);
        } else {
            myBalances = {
                "BTC": {
                    available: 10,
                    onOrder: 0
                },
                USDT: {
                    available: 10000,
                    onOrder: 0
                }
            };
        }
        binance.prices((error, ticker) => {
            if (error) {
                return console.error(error);
            }
            var array_market = [];
            for (var i in ticker) {
                var market = i;
                var last = ticker[i];
                var primary = "";
                var alt = "";
                if (market != "BTCUSDT") {
                    for (var j in primaryCoin) {
                        var coin = primaryCoin[j];
                        if (market.indexOf(coin) != -1) {
                            primary = coin;
                            alt = market.replace(coin, "");
                        }
                    }
                } else {
                    primary = "USDT";
                    alt = "BTC";
                }
                if (primary == "")
                    continue;
                // var chiso1y = new ChisoModel({interval:1,type_interval:"y"});
                // var chiso6M = new ChisoModel({interval:6,type_interval:"M"});
                // var chiso3M = new ChisoModel({interval:3,type_interval:"M"});
                // var chiso1M = new ChisoModel({interval:1,type_interval:"M"});
                // var chiso1w = new ChisoModel({interval:1,type_interval:"w"});
                // var chiso1d = new ChisoModel({interval:1,type_interval:"d"});
                var chiso1h = new ChisoModel({interval: 1, type_interval: "h"});
                var chiso5m = new ChisoModel({interval: 5, type_interval: "m"});
                var chiso1m = new ChisoModel({interval: 1, type_interval: "m"});
                var obj = {
                    MarketName: market,
                    last: last,
                    price_check: last,
                    primaryCoin: primary,
                    altCoin: alt,
                    indicator_1h: chiso1h,
                    indicator_5m: chiso5m,
                    indicator_1m: chiso1m
                };
                markets[market] = new MarketModel(obj);
                array_market.push(market);
                // if (process.env.NODE_ENV == "production") {
                //     markets[market].syncTrade();
                // }
            }
            binance.websockets.chart(array_market, "1h", (market, interval, results) => {
                if (Object.keys(results).length === 0)
                    return;
                let tick = binance.last(results);
                var last = results[tick].close;
                var volume = results[tick].volume;
                markets[market]['indicator_' + interval].volume = volume;
                if (markets[market]['indicator_' + interval].periodTime && markets[market]['indicator_' + interval].periodTime == tick && !results[tick].isFinal) {

                } else {
                    //markets[market].save_db_quantity();
                    markets[market].refreshTrade();
                    markets[market].isHotMarket = false;
                    delete results[tick];
                    markets[market]['indicator_' + interval].setIndicator(results);
                }
                markets[market]['indicator_' + interval].periodTime = tick;
                io.to("interval").emit("interval", {symbol: market, interval: interval, time: tick, data: results[tick], count_buy: markets[market]['indicator_' + interval].count_buy, count_sell: markets[market]['indicator_' + interval].count_sell});
            });
            binance.websockets.chart(array_market, "5m", (market, interval, results) => {
                if (Object.keys(results).length === 0)
                    return;
                let tick = binance.last(results);
                var last = results[tick].close;
                if (markets[market]['indicator_' + interval].periodTime && markets[market]['indicator_' + interval].periodTime == tick && !results[tick].isFinal) {
                    markets[market].last = last;
                    markets[market].checkmua(last);
                    markets[market].checkban(last);
                    markets[market].checkHotMarket(results);
                } else {
                    if (currentTime != tick) {
                        global.currentTime = tick;
                        console.log("Bắt đầu phiên:", moment(tick, "x").format());
                    };
                    delete results[tick];
                    markets[market]['indicator_' + interval].setIndicator(results);
                }
                /*
                 * RESET 1 m
                 */
                 if (moment().format("ss") < 10) {
                    markets[market]['indicator_1m'].refresh();
                }
                /*
                 * Tinh bid ask volume
                 */
                 let orderBook = markets[market].orderBook;
                 let orderBook_bids = orderBook.bids;
                 let orderBook_asks = orderBook.asks;
                 let orderBook_bids_sum = Object.values(orderBook_bids).reduce(function (sum, value) {
                    return sum + parseFloat(value);
                }, 0);
                 let orderBook_asks_sum = Object.values(orderBook_asks).reduce(function (sum, value) {
                    return sum + parseFloat(value);
                }, 0);
                 let trades = markets[market].trades;
                 let trades_bids = trades.bids;
                 let trades_asks = trades.asks;
                 let count_buy = trades_bids.length;
                 let count_sell = trades_asks.length;
                 let trades_bids_sum = trades_bids.reduce(function (sum, value) {
                    return sum + parseFloat(value.quantity);
                }, 0);
                 let trades_asks_sum = trades_asks.reduce(function (sum, value) {
                    return sum + parseFloat(value.quantity);
                }, 0);
                 markets[market]['indicator_' + interval].periodTime = tick;
                 io.to("interval").emit("interval", {symbol: market, interval: interval, time: tick, data: results[tick], count_buy: markets[market]['indicator_' + interval].count_buy, count_sell: markets[market]['indicator_' + interval].count_sell});
                 io.to("market").emit("market", {symbol: market, last: last, orderBook_bids_sum: orderBook_bids_sum, orderBook_asks_sum: orderBook_asks_sum, count_sell: count_sell, count_buy: count_buy, trades_bids_sum: trades_bids_sum, trades_asks_sum: trades_asks_sum});
             });

            binance.websockets.trades(array_market, (trades) => {
                let {e: eventType, E: eventTime, s: symbol, p: price, q: quantity, m: maker, a: tradeId} = trades;
                if (markets[symbol] && markets[symbol]['indicator_1h'] && markets[symbol]['indicator_5m']) {
                    if (maker) {
                        markets[symbol].trades.asks.push({price: price, quantity: quantity});
                        markets[symbol]['indicator_1h'].count_sell++;
                        markets[symbol]['indicator_5m'].count_sell++;
                        markets[symbol]['indicator_1m'].count_sell++;
                    } else {
                        markets[symbol].trades.bids.push({price: price, quantity: quantity});
                        markets[symbol]['indicator_1h'].count_buy++;
                        markets[symbol]['indicator_5m'].count_buy++;
                        markets[symbol]['indicator_1m'].count_buy++;
                    }
                }
            });
            binance.websockets.depth(array_market, (depth) => {
                let {e: eventType, E: eventTime, s: symbol, u: updateId, b: bidDepth, a: askDepth} = depth;
                if (typeof bidDepth !== 'undefined') {
                    for (var obj of bidDepth) {
                        if (obj[1] === '0.00000000') {
                            if (markets[symbol].orderBook.bids[obj[0]])
                                delete markets[symbol].orderBook.bids[obj[0]];
                        } else {
                            markets[symbol].orderBook.bids[obj[0]] = parseFloat(obj[1]);
                        }
                    }
                }
                if (typeof askDepth !== 'undefined') {
                    for (var obj of askDepth) {
                        if (obj[1] === '0.00000000') {
                            if (markets[symbol].orderBook.asks[obj[0]])
                                delete markets[symbol].orderBook.asks[obj[0]];
                        } else {
                            markets[symbol].orderBook.asks[obj[0]] = parseFloat(obj[1]);
                        }
                    }
                }
            });
            var where = "where 1=1 and id_session IS NULL and deleted = 0";
            var query = mysql.createConnection(options_sql).then(function (conn) {
                var result = conn.query("select * from trade " + where);
                conn.end();
                return result;
            }).then(function (rows) {
                for (var i in rows) {
                    var market = rows[i].MarketName;
                    var price = rows[i].price;
                    var time = moment(rows[i].timestamp, "x");
                    var amount = rows[i].amount;
                    var isBuyer = rows[i].isBuyer;
                    if (isBuyer) {
                        markets[market].mua(price, amount, time);
                    } else {
                        markets[market].ban(price, amount, time);
                    }
                }
            });
            console.log("Price of BTC: ", ticker.BTCUSDT);
        });
});
}).catch(function(err){
    console.log(err);
});




/******************
 * 
 * CONFIG APACHE
 * 
 *****************/
 var port = process.env.PORT || 3000;
 app.set('port', port);
 var server = http.createServer(app);
 global.io = require('socket.io')(server);
 io.on('connection', function (socket) {
    console.log('a user connected');
    socket.emit("start");
    socket.on("join", function (data) {
        var room = data.room;
        socket.join(room);
    });
    socket.on("leave", function (data) {
        var room = data.room;
        socket.leave(room);
    });
    socket.on("leaveall", function () {
        var rooms = io.sockets.adapter.sids[socket.id];
        for (var room in rooms) {
            socket.leave(room);
        }
    })
});
/**
 * Listen on provided port, on all network interfaces.
 */

 server.listen(port);
 server.on('error', onError);
 server.on('listening', onListening);
/*
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
 function stringtoBoolean(value) {
    if (!value)
        return value
    switch (value) {
        case "1":
        case "true":
        case "yes":
        return true;
        break;
        case "0":
        case "false":
        case "no":
        return false;
        break;
    }
}

// The only time the user data (account balances) and order execution websockets will fire, is if you create or cancel an order, or an order gets filled or partially filled
function balance_update(data) {
    console.log("Balance Update");
    for (let obj of data.B) {
        let {a: asset, f: available, l: onOrder} = obj;
        myBalances[asset].available = available;
        myBalances[asset].onOrder = onOrder;
        io.emit("coin_update", {coin: asset, available: available, onOrder: onOrder});
        if (available == "0.00000000" && onOrder == "0.00000000")
            continue;
        console.log(asset + "\tavailable: " + available + " (" + onOrder + " on order)");
    }
}
function execution_update(data) {
    console.log(data);
    let {x: executionType, s: symbol, p: price, q: quantity, S: side, o: orderType, i: orderId, X: orderStatus, L: priceMarket, t: tradeId} = data;
    if (executionType == "NEW") {
        if (orderStatus == "REJECTED") {
            console.log("Order Failed! Reason: " + data.r);
        }
        console.log(symbol + " " + side + " " + orderType + " ORDER #" + orderId + " (" + orderStatus + ")");
        console.log("..price: " + price + ", quantity: " + quantity);
        return;
    }
    //NEW, CANCELED, REPLACED, REJECTED, TRADE, EXPIRED
    if (process.env.NODE_ENV == "production") {
        if (orderType == "MARKET" && side == "SELL" && executionType == "TRADE" && orderStatus == "FILLED") {
            var price_buy = markets[symbol].priceBuyAvg;
            var profit = (priceMarket - price_buy);
            var percent = 100 * profit / price_buy;
            var html = "<p>" + symbol + "</p><p>Price Buy:" + price_buy + "</p><p>Price Sell:" + priceMarket + "</p><p style='color:green;'>Profit:" + percent.toFixed(2) + "%</p>";
            Mail.sendmail("[Sell]" + symbol, html);

            markets[symbol].save_db_ban(priceMarket, quantity, tradeId);
        } else if (orderType == "LIMIT" && side == "SELL" && executionType == "TRADE" && orderStatus == "FILLED") {

            var price_buy = markets[symbol].priceBuyAvg;
            var profit = (price - price_buy);
            var percent = 100 * profit / price_buy;
            var html = "<p>" + symbol + "</p><p>Price Buy:" + price_buy + "</p><p>Price Sell:" + price + "</p><p style='color:green;'>Profit:" + percent.toFixed(2) + "%</p>";
            Mail.sendmail("[Sell]" + symbol, html);

            markets[symbol].save_db_ban(price, quantity, tradeId);
        } else if (orderType == "MARKET" && side == "BUY" && executionType == "TRADE" && orderStatus == "FILLED") {

            var html = "<p>" + symbol + "</p><p>Price:" + priceMarket + "</p>";
            Mail.sendmail("[Buy]" + symbol, html);

            markets[symbol].save_db_mua(priceMarket, quantity, tradeId);
        } else if (orderType == "LIMIT" && side == "BUY" && executionType == "TRADE" && orderStatus == "FILLED") {

            var html = "<p>" + symbol + "</p><p>Price:" + price + "</p>";
            Mail.sendmail("[Buy]" + symbol, html);

            markets[symbol].save_db_mua(priceMarket, quantity, tradeId);
        }
    }
    console.log(symbol + "\t" + side + " " + executionType + " " + orderType + " ORDER #" + orderId);
}