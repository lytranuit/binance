var express = require('express');
var router = express.Router();
const binance = require('node-binance-api');
const moment = require('moment');
const mysql = require('promise-mysql');
const jsonfile = require('jsonfile');
const model = require('../models/model');
var ColorHash = require('color-hash');
/* GET api listing. */
router.get('/market', ensureAuthenticated, function (req, res, next) {
    var symbol = req.query.symbol || "BTCUSDT";
    res.json(markets[symbol]);
});
router.get('/balance', ensureAuthenticated, function (req, res, next) {
    var coin = req.query.coin || "BTC";
    res.json(myBalances[coin]);
});
router.get('/marketbalance', ensureAuthenticated, function (req, res, next) {
    var symbol = req.query.symbol || "BTCUSDT";
    var altCoin = markets[symbol].altCoin;
    var primaryCoin = markets[symbol].primaryCoin;

    res.json({ isHotMarket: markets[symbol].isHotMarket, primaryCoin: { name: primaryCoin, value: myBalances[primaryCoin] }, altCoin: { name: altCoin, value: myBalances[altCoin] } });
});
router.get('/allmarket', ensureAuthenticated, function (req, res, next) {
    var marketName = [];
    for (var market in markets) {
        marketName.push(market);
    }
    res.json({ marketName: marketName });
});
router.get('/updatedata', ensureAuthenticated, function (req, res, next) {
    var marketName = [];
    for (var market in markets) {
        markets[market].sync_candles();
    }
    res.json({ success: 1 });
});
router.get('/marketdynamic', ensureAuthenticated, async function (req, res, next) {
    var data = await mysql.createConnection(options_sql).then(function (conn) {
        var result = conn.query("SELECT symbol,IFNULL(SUM(IF(TIMESTAMP = (ROUND(UNIX_TIMESTAMP() / 3600) * 3600 - (24 * 3600)) * 1000,CLOSE,0)),0) AS price_1day_prev,IFNULL(SUM(IF(TIMESTAMP = (ROUND(UNIX_TIMESTAMP() / 3600) * 3600 - (7 *24 * 3600)) * 1000,CLOSE,0)),0) AS price_7day_prev FROM candles WHERE is_Final = 1 GROUP BY symbol,`interval`");
        conn.end();
        return result;
    })
    var datasets = [];

    var colorHash = new ColorHash({ lightness: 0.5 });
    for (var i in data) {
        var row = data[i];
        var symbol = row.symbol;
        if (!(symbol in markets)) {
            continue;
        }
        var price_current = markets[symbol].last;
        var price_24h = row.price_1day_prev || 0;
        var price_7day = row.price_7day_prev || 0;
        var percent_24h = model.round((price_current - price_24h) / price_24h * 100, 2) || 0;
        var percent_7day = model.round((price_current - price_7day) / price_7day * 100, 2) || 0;
        datasets.push({
            label: symbol,
            pointBackgroundColor: colorHash.hex(symbol),
            data: [{
                x: percent_7day,
                y: percent_24h,
                price_24h: price_24h,
                price_7day: price_7day
            }]
        })
    }
    res.json({ datasets: datasets });
});
router.get('/aggtrade', ensureAuthenticated, function (req, res, next) {
    var symbol = req.query.symbol || "BTCUSDT";
    var time = req.query.time || 1800000;
    var current_time = moment().valueOf();
    var first_time = current_time - time;
    var options1;
    if (time > 3600000) {
        first_time = current_time - 3600000;
        options1 = { startTime: first_time - 3600000, endTime: first_time };
    }
    var options = { startTime: first_time, endTime: current_time };
    binance.aggTrades(symbol, options, function (error, data) {
        if (error) {
            console.log(error);
            res.json([]);
            return;
        }
        if (!options1) {
            res.json(data);
            return
        }
        binance.aggTrades(symbol, options1, function (error, data2) {
            if (error) {
                console.log(error);
                res.json(data);
                return;
            }
            data = data.concat(data2);
            res.json(data);
        });
    })
});
router.get('/candle', ensureAuthenticated, async function (req, res, next) {
    var symbol = req.query.symbol || "BTCUSDT";
    var interval = req.query.interval || "1d";
    var events = [];
    var events = await mysql.createConnection(options_sql).then(function (conn) {
        var result = conn.query("select * from trade where MarketName = '" + symbol + "'");
        conn.end();
        return result;
    }).then(function (rows, err) {
        if (err) {
            console.log(err);
        }
        var events = [];
        for (var i in rows) {
            var isBuyer = rows[i].isBuyer;
            var market = rows[i].MarketName;
            var price = rows[i].price;
            var time = rows[i].timestamp;
            var amount = rows[i].amount;
            var id = rows[i].id;

            if (isBuyer == 0) {
                events.push({
                    x: time,
                    y: price,
                    text: "Sell:" + price,
                    size: 5,
                    color: "#ff7109",
                    shape: "disk"
                });
            } else {
                events.push({
                    x: time,
                    y: price,
                    text: "Buy:" + price,
                    size: 5,
                    color: "#09c4ff",
                    shape: "disk"
                });
            }
        }
        return events;
    });
    // Intervals: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
    binance.candlesticks(symbol, interval, (error, ticks, symbol) => {
        var data = {
            "hloc": {
                "LKOH": []
            },
            "vl": {
                "LKOH": []
            },
            "xSeries": {
                "LKOH": []
            }
        };
        for (var i in ticks) {
            var tick = ticks[i];
            let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = tick;
            data.hloc.LKOH.push([parseFloat(high), parseFloat(low), parseFloat(open), parseFloat(close)]);
            data.vl.LKOH.push(parseFloat(volume));
            data.xSeries.LKOH.push(time / 1000);
        }
        res.json({ data: data, events: events });
    });
});
router.get('/savejson', ensureAuthenticated, function (req, res, next) {
    model.save_cache_candles();
    res.json({ success: 1 });
});
/*
 * POST
 */
router.post('/hotmarket', ensureAuthenticated, function (req, res, next) {
    var symbol = req.body.symbol;
    var value = req.body.value;
    markets[symbol].isHotMarket = stringtoBoolean(value);
    res.json({ success: 1 });
});
router.post('/market', ensureAuthenticated, function (req, res, next) {
    var data = req.body;
    data.mocPriceBuy = data.mocPriceBuy > 0 ? data.mocPriceBuy : 0;
    data.isCheckRsiBan = data.isCheckRsiBan == 1 ? true : false;
    data.isCheckMACDBan = data.isCheckMACDBan == 1 ? true : false;
    data.minPriceSell = parseFloat(markets[data.MarketName].priceBuyAvg) + parseFloat(markets[data.MarketName].priceBuyAvg * data.minGain / 100);
    markets[data.MarketName] = Object.assign(markets[data.MarketName], data);
    res.json(markets[data.MarketName]);
});
router.post('/refreshorder', ensureAuthenticated, function (req, res, next) {
    var symbol = req.body.symbol;
    markets[symbol].refreshOrder();
    res.json({ success: 1 });
});
router.post('/refreshtrade', ensureAuthenticated, function (req, res, next) {
    var symbol = req.body.symbol;
    markets[symbol].refreshTrade();
    res.json({ success: 1 });
});
router.post('/buy', ensureAuthenticated, function (req, res, next) {
    var symbol = req.body.symbol;
    var price = req.body.price || 0;
    var quantity_per = req.body.quantity_per;
    if (price == 0) {
        res.json({ success: 0, error: 'Fill Price!' });
        return;
    }
    if (process.env.NODE_ENV == "production") {
        /*
         * Cancle all order
         */
        binance.cancelOrders(symbol);
        var primaryCoin = markets[symbol].primaryCoin;
        var primaryCoin_value = parseFloat(myBalances[primaryCoin].available) + parseFloat(myBalances[primaryCoin].onOrder);
        var amount = primaryCoin_value * quantity_per / 100;
        var quantity = Math.floor(amount / price);
        if (quantity * price < 0.001) {
            res.json({ success: 0, error: 'Total must be > 0.001 BTC' });
            return;
        }
        binance.buy(symbol, quantity, price);
        res.json({ success: 1 });
    } else {
        markets[symbol].save_db_mua(price, 1);
        res.json({ success: 1 });
    }
});
router.post('/buymarket', ensureAuthenticated, function (req, res, next) {
    var symbol = req.body.symbol;
    var quantity_per = req.body.quantity_per;
    if (process.env.NODE_ENV == "production") {
        /*
         * Cancle all order
         */
        binance.cancelOrders(symbol);
        var primaryCoin = markets[symbol].primaryCoin;
        var primaryCoin_value = parseFloat(myBalances[primaryCoin].available) + parseFloat(myBalances[primaryCoin].onOrder);
        var amount = primaryCoin_value * quantity_per / 100;
        var quantity = Math.floor(amount / markets[symbol].last);
        binance.marketBuy(symbol, quantity, (error, response) => {
            if (error) {
                res.json({ success: 0, error: "Fail!" });
                return;
            }
            res.json({ success: 1 });
        });
    } else {
        markets[symbol].save_db_mua(markets[symbol].last, 1);
        res.json({ success: 1 });
    }
});
router.post('/sell', ensureAuthenticated, function (req, res, next) {
    var symbol = req.body.symbol;
    var price = req.body.price || 0;
    var quantity_per = req.body.quantity_per;
    if (price == 0) {
        res.json({ success: 0, error: 'Fill Price!' });
        return;
    }
    if (process.env.NODE_ENV == "production") {
        /*
         * Cancle all order
         */
        binance.cancelOrders(symbol);
        var altcoin = markets[symbol].altCoin;
        var altcoin_value = parseFloat(myBalances[altcoin].available) + parseFloat(myBalances[altcoin].onOrder);
        var quantity = Math.floor(altcoin_value * quantity_per / 100);
        var amount = quantity * price;
        if (amount < 0.001) {
            res.json({ success: 0, error: 'Total must be > 0.001 BTC' });
            return;
        }
        binance.sell(symbol, quantity, price);
        res.json({ success: 1 });

    } else {
        markets[symbol].save_db_ban(price, 1);
        res.json({ success: 1 });
    }

});
router.post('/sellmarket', ensureAuthenticated, function (req, res, next) {
    var symbol = req.body.symbol;
    var quantity_per = req.body.quantity_per;

    if (process.env.NODE_ENV == "production") {
        /*
         * Cancle all order
         */
        binance.cancelOrders(symbol);
        var altcoin = markets[symbol].altCoin;
        var altcoin_value = parseFloat(myBalances[altcoin].available) + parseFloat(myBalances[altcoin].onOrder);
        var quantity = Math.ceil(altcoin_value * quantity_per / 100);
        binance.marketSell(symbol, quantity, (error, response) => {
            if (error) {
                res.json({ success: 0, error: "Fail!" });
                return;
            }
            res.json({ success: 1 });
        });
    } else {
        markets[symbol].save_db_ban(markets[symbol].last, 1);
        res.json({ success: 1 });
    }

});
router.post('/stopmua', ensureAuthenticated, function (req, res, next) {
    var value = req.body.value;
    stopmua = stringtoBoolean(value);
    var update = {
        value: value
    }
    mysql.createConnection(options_sql).then(function (conn) {
        var result = conn.query("UPDATE options SET ? WHERE `key` = 'stopmua'", update);
        conn.end();
        return result;
    }).then(function () {
        res.json({ success: 1 });
    }).catch(function () {
        res.json({ success: 0 });
    });
});
router.post('/stopmuacoin', ensureAuthenticated, function (req, res, next) {
    var value = req.body.value;
    var primaryCoin = req.body.coin;
    var name = 'stopmua' + primaryCoin;
    global[name] = stringtoBoolean(value);
    var update = {
        value: value
    }
    mysql.createConnection(options_sql).then(function (conn) {
        var result = conn.query("UPDATE options SET ? WHERE `key` = '" + name + "'", update);
        conn.end();
        return result;
    }).then(function () {
        res.json({ success: 1 });
    }).catch(function () {
        res.json({ success: 0 });
    });
});
router.post('/stopmuamarket', ensureAuthenticated, function (req, res, next) {
    var value = req.body.value;
    var symbol = req.body.symbol;
    markets[symbol].stopmua = stringtoBoolean(value);
    var update = {
        value: value
    }
    res.json({ success: 1 });
});
router.post('/refreshcheck', ensureAuthenticated, function (req, res, next) {
    for (var market in markets) {
        markets[market].price_check = markets[market].last;
    }
    res.json({ success: 1 });
});
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
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.json({ success: 0, code: 500, error: 'No Access' });
}
module.exports = router;
