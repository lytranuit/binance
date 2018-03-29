var express = require('express');
var router = express.Router();

var markets = require('../models/market');
/* GET home page. */
router.get('/', function (req, res, next) {
    var sumBTC = 0;
    var lastBTC = 0;
    var available = 0;
    var allMarkets = markets.all();
    for (var market in allMarkets) {
        if (market != "BTCUSDT")
            sumBTC += allMarkets[market].last * allMarkets[market].available;
        else {
            lastBTC = allMarkets[market].last;
            available = allMarkets[market].available
            sumBTC += available;
        }
    }
    var sumUSDT = sumBTC * lastBTC;
    res.render('index', {title: 'Express', sumBTC: sumBTC, sumUSDT: sumUSDT, available: available});
});

module.exports = router;
