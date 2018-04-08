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
    var rows = await pool.query("SELECT *,ROUND(100 * (price_sell-price_buy) / price_buy,2) as percent FROM trade where is_sell = 1 and deleted = 0 ORDER BY timestamp_sell desc").then(function (rows, err) {
        if (err) {
            console.log(err);
        }
        var data = [];
        for (var i in rows) {
            var market = rows[i].MarketName;
            var price_buy = rows[i].price_buy;
            var price_sell = rows[i].price_sell;
            var time_buy = moment(rows[i].timestamp_buy).format("YYYY-MM-DD HH:mm:ss");
            var time_sell = moment(rows[i].timestamp_sell).format("YYYY-MM-DD HH:mm:ss");
            var amount = rows[i].amount;
            var id = rows[i].id;
            var percent = rows[i].percent;
            data.push({
                market: market,
                price_buy: price_buy,
                price_sell: price_sell,
                time_buy: time_buy,
                time_sell: time_sell,
                amount: amount,
                percent: percent,
                id: id
            });
        }
        return data;
    });
    res.render('index', {title: 'Express', sumBTC: sumBTC, sumUSDT: sumUSDT, available: available, marketHot: marketHot, marketBuy: marketBuy, rows: rows});
});
router.get('/market', function (req, res, next) {
    var symbol = req.query.symbol || "BTCUSDT";
    res.json(markets[symbol]);
});
router.get('/balances', function (req, res, next) {
    var coin = req.query.coin || "BTC";
    res.json(myBalances[coin]);
});
module.exports = router;
