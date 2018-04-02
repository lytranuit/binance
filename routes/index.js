var express = require('express');
const moment = require('moment');
const binance = require('node-binance-api');
var router = express.Router();
/* GET home page. */
router.get('/', async function (req, res, next) {
    var sumBTC = 0;
    var lastBTC = 0;
    var available = 0;
    var marketBuy = {};
    var marketGood = {"BTCUSDT": markets['BTCUSDT']};
    for (var market in markets) {
        if (market != "BTCUSDT")
            sumBTC += markets[market].last * markets[market].available;
        else {
            lastBTC = markets[market].last;
            available = markets[market].available;
            sumBTC += available;
        }

        if (markets[market].chienluoc1.isBuy) {
            marketBuy[market] = markets[market];
        }
        if (!markets[market].indicator_1h.td && !markets[market].indicator_5m.td) {
            marketGood[market] = markets[market];
        }
    }
    var sumUSDT = sumBTC * lastBTC;
    /*
     * HISTORY
     */
    var rows = await pool.query("SELECT *,ROUND(100 * (price_sell-price_buy) / price_buy,2) as percent FROM trade where is_sell = 1 and deleted = 0").then(function (rows, err) {
        if (err) {
            console.log(err);
        }
        var data = [];
        for (var i in rows) {
            var market = rows[i].MarketName;
            var price_buy = rows[i].price_buy;
            var price_sell = rows[i].price_sell;
            var time_buy = moment(rows[i].timestamp_buy).format("YYYY-MM-DD HH:mm:ss");
            var time_sell = moment(rows[i].timestamp_buy).format("YYYY-MM-DD HH:mm:ss");
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
    res.render('index', {title: 'Express', sumBTC: sumBTC, sumUSDT: sumUSDT, available: available, marketBuy: marketBuy, marketGood: marketGood, binance: binance, rows: rows});
});
router.get('/market', function (req, res, next) {
    var symbol = req.query.symbol || "BTCUSDT";
    res.json(markets[symbol]);
});

module.exports = router;
