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

global.pool = mysql.createPool(options_sql);
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

 var production = process.env.NODE_ENV === 'production'
 if (!production) {
    var chokidar = require('chokidar')
    var watcher = chokidar.watch('./routes');
    watcher.on('ready', function () {
        watcher.on('all', function (path) {
            console.log("Clearing routes module cache from server")
            Object.keys(require.cache).forEach(function (id) {
                if (/[\/\\]routes[\/\\]/.test(id)) {
                    delete require.cache[id];
                }
            })
        })
    })
}
// var indexRouter = require('./routes/index');
// var apiRouter = require('./routes/api');
// var authRouter = require('./routes/auth');

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
app.use('/', function (req, res, next) {
    require('./routes/index')(req, res, next)
})
app.use('/api', function (req, res, next) {
    require('./routes/api')(req, res, next)
})
app.use('/auth', function (req, res, next) {
    require('./routes/auth')(req, res, next)
})
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
                var chiso1h = new ChisoModel({symbol:market,time:60 * 60 * 1000,type:'1h'});
                var chiso5m = new ChisoModel({symbol:market,time:5 * 60 * 1000,type:'5m'});
                var chiso1m = new ChisoModel({symbol:market,time:60 * 1000,type:'1m'});
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
                if (global.chienLuocMua)
                    obj.chienLuocMua = global.chienLuocMua;
                if (global.chienLuocBan)
                    obj.chienLuocBan = global.chienLuocBan;
                if (global.minGain)
                    obj.minGain = global.minGain;

                markets[market] = new MarketModel(obj);
                array_market.push(market);
                markets[market].sync_candles();
            }
            binance.websockets.candlesticks(array_market, "5m", (candlesticks) => {
                let { e:eventType, E:eventTime, s:symbol, k:ticks } = candlesticks;
                let { o:open, h:high, l:low, c:close, v:volume, n:trades, i:interval, x:isFinal, q:quoteVolume, V:buyVolume, Q:quoteBuyVolume, t:time } = ticks;
                
                // console.log(symbol+" "+interval+" candlestick update");
                // console.log("time: "+time);
                // console.log("open: "+open);
                // console.log("high: "+high);
                // console.log("low: "+low);
                // console.log("close: "+close);
                // console.log("volume: "+volume);
                // console.log("isFinal: "+isFinal);

                markets[symbol]['indicator_5m'].volume = volume;
                markets[symbol]['indicator_5m'].candles[time] = {
                    high:high,
                    low:low,
                    close:close,
                    open:open,
                    volume:volume,
                    isFinal:isFinal
                };
                markets[symbol].last = close;
                markets[symbol].checkmua(close);
                markets[symbol].checkban(close);
                markets[symbol].checkHotMarket();
                if (markets[symbol]['indicator_5m'].periodTime && markets[symbol]['indicator_5m'].periodTime == time && !isFinal) {

                } else {
                    markets[symbol]['indicator_5m'].periodTime = time;
                    if (currentTime < time) {
                        global.currentTime = time;
                        console.log("Bắt đầu phiên:", moment(time, "x").format());
                    }
                    markets[symbol]['indicator_5m'].setIndicator();
                    markets[symbol].sync_candles();
                }
                /*
                 * RESET 1 m
                 */
                 if (moment().format("ss") < 10) {
                    markets[symbol]['indicator_1m'].refresh();
                }
                /*
                * 1h
                */
                var time_1h = Math.floor(time /60 * 60 * 1000) * 60 * 60 * 1000
                if(time_1h != markets[symbol]['indicator_1h'].periodTime){
                    markets[symbol]['indicator_1h'].periodTime = time_1h;
                    markets[symbol].refreshTrade();
                    markets[symbol].isHotMarket = false;
                    markets[symbol]['indicator_1h'].setIndicator();
                }
                io.to("market").emit("market", {symbol: symbol, last: close, volume: volume});
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
}).catch(function (err) {
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
function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}