var express = require('express');
const moment = require('moment');
const mysql = require('promise-mysql');
var router = express.Router();
/* GET home page. */
router.get('/', ensureAuthenticated, async function (req, res, next) {
    await set_change();
    var lastBTC = markets['BTCUSDT'].last;
    var marketBuy = [];
    var marketHot = {"BTCUSDT": markets['BTCUSDT']};
    var marketName = [];
    for (var market in markets) {
        if (markets[market].isBuy) {
            marketBuy.push(markets[market]);
        }
        if (markets[market].isHotMarket) {
            marketHot[market] = markets[market];
        }
        marketName.push(market);
    }

    marketBuy.sort(function (a, b) {
        var timeBuyNexta = a.timeBuyNext;
        var timeBuyNextb = b.timeBuyNext;
        if (timeBuyNexta == timeBuyNextb)
            return 0;
        return timeBuyNexta < timeBuyNextb ? 1 : -1;
    });
    var sumBTC = 0;
    var sumUSDT = 0;
    if (process.env.NODE_ENV == "production") {
        for (var coin in myBalances) {
            var ava = myBalances[coin].available;
            var order = myBalances[coin].onOrder;
            var sumCoin = parseFloat(ava) + parseFloat(order);
            if (markets[coin + "BTC"]) {
                var btcCoin = sumCoin * markets[coin + "BTC"].last;
                sumBTC += btcCoin;
            } else if (coin == "BTC") {
                sumBTC += sumCoin;
            }
        }
        sumUSDT = sumBTC * lastBTC;
    }
    /*
     * HISTORY
     */
     var where = "WHERE 1=1 and deleted = 0";
     var rows = await mysql.createConnection(options_sql).then(function (conn) {
        var result = conn.query("SELECT *,ROUND(100 * (price_sell-price_buy) / price_buy,2) as percent,FROM_UNIXTIME(FLOOR(TIMESTAMP / 1000)) as timestamp FROM trade_session  ORDER BY timestamp desc");
        conn.end();
        return result;
    })
     res.render('index', {title: 'Express', marketName: marketName, sumBTC: sumBTC, sumUSDT: sumUSDT, marketHot: marketHot, marketBuy: marketBuy, rows: rows});
 });

router.get('/login', function (req, res, next) {
    res.render('login');
});
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}
var set_change = async function (start) {
    console.log("START SET CHANGE");
    var start = start || moment().valueOf();
    var last = Math.floor(start / 300000) * 300000 - 300000;
    var array = [
    {interval: '5m', time: 0},
    {interval: '15m', time: 15 * 60 * 1000},
    {interval: '30m', time: 30 * 60 * 1000},
    {interval: '1h', time: 60 * 60 * 1000},
    {interval: '1d', time: 24 * 60 * 60 * 1000}
    ];
    var subsql = "";
    for (var i in array) {
        var row = array[i];
        var first = last - row.time;
        var last_prev = first - 300000;
        var first_prev = last_prev - row.time;
        subsql += ",SUM(IF(TIMESTAMP >= '" + first + "' AND TIMESTAMP <= '" + last + "' AND close > open,`volume`,0)) AS volume_" + row.interval + ",SUM(IF(TIMESTAMP >= '" + first_prev + "' AND TIMESTAMP <= '" + last_prev + "' AND close > open,`volume`,0)) AS volume_prev_" + row.interval + ", MAX(IF(TIMESTAMP >= '" + first + "' AND TIMESTAMP <= '" + last + "',`high`,NULL)) AS high_" + row.interval + ",MAX(IF(TIMESTAMP >= '" + first_prev + "' AND TIMESTAMP <= '" + last_prev + "',`high`,NULL)) as high_prev_" + row.interval + ", MIN(IF(TIMESTAMP >= '" + first + "' AND TIMESTAMP <= '" + last + "',`low`,NULL)) AS low_" + row.interval + ",MIN(IF(TIMESTAMP >= '" + first_prev + "' AND TIMESTAMP <= '" + last_prev + "',`low`,NULL)) as low_prev_" + row.interval + ", SUM(IF(TIMESTAMP = '" + last + "',`close`,0)) AS close_" + row.interval + ",SUM(IF(TIMESTAMP = '" + last_prev + "',`close`,0)) as close_prev_" + row.interval;
    }
    var sql = "SELECT symbol " + subsql + " FROM candles WHERE timestamp >= '" + first_prev + "' AND TIMESTAMP <= '" + last + "' GROUP BY symbol";
    console.log("wating....");
    await pool.query(sql).then(function (results) {
        for (var row of results) {
            var symbol = row.symbol;
            for (var i in array) {
                var arr = array[i];
                var volume = row['volume_' + arr.interval];
                var volume_prev = row['volume_prev_' + arr.interval];
                var close = row['close_' + arr.interval];
                var close_prev = row['close_prev_' + arr.interval];
                var high = row['high_' + arr.interval];
                var low = row['low_' + arr.interval];
                row['change_volume_' + arr.interval] = round((volume - volume_prev) / volume_prev * 100, 2) || 0;
                row['change_price_' + arr.interval] = round((close - close_prev) / close_prev * 100, 2) || 0;
                row['change_highlow_' + arr.interval] = round((high - low) / low * 100, 2) || 0;
            }
            markets[symbol].combined = row;
        }
    }).catch(function (err) {
        console.log(err);
        console.log("Error. Change");
    }).then(function () {
        console.log("Done. Change");
        return true;
    });
}
function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}
module.exports = router;
