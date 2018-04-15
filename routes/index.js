var express = require('express');
const moment = require('moment');
var router = express.Router();
/* GET home page. */
router.get('/', ensureAuthenticated,async function (req, res, next) {
    var lastBTC = markets['BTCUSDT'].last;
    var marketBuy = {};
    var marketHot = {"BTCUSDT": markets['BTCUSDT']};
    for (var market in markets) {
        if (markets[market].isBuy) {
            marketBuy[market] = markets[market];
        }
        if (markets[market].isHotMarket) {
            marketHot[market] = markets[market];
        }
    }

    var sumBTC = 0;
    var sumUSDT = 0;
    var available = 0
    if(process.env.NODE_ENV == "production"){
        available = myBalances["BTC"].available ;
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
    if(process.env.NODE_ENV == "production"){
        where += ' AND is_test = 0';
    }else{
        where += ' AND is_test = 1';
    }
    var rows = await pool.query("SELECT *,ROUND(100 * (price_sell-price_buy) / price_buy,2) as percent,FROM_UNIXTIME(FLOOR(TIMESTAMP / 1000)) as timestamp FROM trade_session  ORDER BY timestamp desc")
    res.render('index', {title: 'Express', sumBTC: sumBTC, sumUSDT: sumUSDT, available: available, marketHot: marketHot, marketBuy: marketBuy, rows: rows});
});

router.get('/login', function (req, res, next) {
    res.render('login');
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}
module.exports = router;
