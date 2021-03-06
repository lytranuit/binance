var express = require('express');
const moment = require('moment');
const mysql = require('promise-mysql');
const model = require('../models/model');
var router = express.Router();
/* GET home page. */
router.get('/', ensureAuthenticated, async function (req, res, next) {
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
module.exports = router;
