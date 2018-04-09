var express = require('express');
var router = express.Router();
const binance = require('node-binance-api');
const moment = require('moment');
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
router.post('/refreshorder', function (req, res, next) {
    var symbol = req.body.symbol;
    markets[symbol].refreshOrder();
    res.json({success: 1});
});
router.post('/refreshtrade', function (req, res, next) {
    var symbol = req.body.symbol;
    markets[symbol].refreshTrade();
    res.json({success: 1});
});
router.get('/candle', async function (req, res, next) {
    var symbol = req.query.symbol || "BTCUSDT";
    var interval = req.query.interval || "1d";
    var events = [];
    var events = await pool.query("select * from trade where MarketName = '" + symbol + "'").then(function (rows, err) {
        if (err) {
            console.log(err);
        }
        var events = [];
        for (var i in rows) {
            var market = rows[i].MarketName;
            var price_buy = rows[i].price_buy;
            var price_sell = rows[i].price_sell;
            var time_buy = moment(rows[i].timestamp_buy).valueOf();

            var id = rows[i].id;
            events.push({
                x: time_buy,
                y: price_buy,
                text: "Buy",
                size: 5,
                color: "#09c4ff",
                shape: "disk"
            });
            if (price_sell != "") {
                var time_sell = moment(rows[i].timestamp_sell).valueOf();
                events.push({
                    x: time_sell,
                    y: price_sell,
                    text: "Sell",
                    size: 5,
                    color: "#ff7109",
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
        res.json({data: data, events: events});
    });
});
module.exports = router;
