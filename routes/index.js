var express = require('express');
var router = express.Router();
/* GET home page. */
router.get('/', function (req, res, next) {
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

    res.render('index', {title: 'Express', sumBTC: sumBTC, sumUSDT: sumUSDT, available: available, marketBuy: marketBuy, marketGood: marketGood});
});
router.get('/market', function (req, res, next) {
    var symbol = req.query.symbol || "BTCUSDT";
    res.json(markets[symbol]);
});

module.exports = router;
