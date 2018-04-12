var express = require('express');
const moment = require('moment');
var router = express.Router();
/* GET home page. */
router.get('/', async function (req, res, next) {
    var lastBTC = markets['BTCUSDT'].last;
    var marketBuy = {};
    var marketGood = {"BTCUSDT": markets['BTCUSDT']};
    var marketHot = {"BTCUSDT": markets['BTCUSDT']};
    for (var market in markets) {
        if (markets[market].isBuy) {
            marketBuy[market] = markets[market];
        }
        if (markets[market].isHotMarket) {
            marketHot[market] = markets[market];
        }
    }
    var available = myBalances["BTC"].available;
    var sumBTC = 0;
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
    var sumUSDT = sumBTC * lastBTC;
    /*
     * HISTORY
     */
     var where = "WHERE 1=1 and deleted = 0";
     if(process.env.NODE_ENV == "development"){
        where += ' AND is_test = 0';
    }else{
        where += ' AND is_test = 1';
    }
    var rows = await pool.query("SELECT *,ROUND(100 * (price_sell-price_buy) / price_buy,2) as percent FROM trade_session  ORDER BY timestamp desc").then(function (rows, err) {
        if (err) {
            console.log(err);
        }
        return rows;
    });
    res.render('index', {title: 'Express', sumBTC: sumBTC, sumUSDT: sumUSDT, available: available, marketHot: marketHot, marketBuy: marketBuy, rows: rows});
});
module.exports = router;
