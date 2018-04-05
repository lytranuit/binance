var express = require('express');
var router = express.Router();

/* GET api listing. */
router.get('/market', function (req, res, next) {
    var symbol = req.query.symbol || "BTCUSDT";
    res.json(markets[symbol]);
});
router.post('/market', function (req, res, next) {
    var data = req.body;
    data.mocPriceBuy = data.mocPriceBuy > 0 ? data.mocPriceBuy : 0;
    data.isCheckRsiBan = data.isCheckRsiBan == 1 ? true : false;
    data.isCheckMACDBan = data.isCheckMACDBan == 1 ? true : false;
    markets[data.MarketName] = Object.assign(markets[data.MarketName], data);
    res.json(markets[data.MarketName]);
});

module.exports = router;
