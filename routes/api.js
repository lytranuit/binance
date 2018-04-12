var express = require('express');
var router = express.Router();
const binance = require('node-binance-api');
const moment = require('moment');
/* GET api listing. */
router.get('/market', function (req, res, next) {
    var symbol = req.query.symbol || "BTCUSDT";
    res.json(markets[symbol]);
});
router.get('/balance', function (req, res, next) {
    var coin = req.query.coin || "BTC";
    res.json(myBalances[coin]);
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
            var isBuyer = rows[i].isBuyer;
            var market = rows[i].MarketName;
            var price= rows[i].price;
            var time = moment(rows[i].timestamp).valueOf();
            var amount = rows[i].amount;
            var id = rows[i].id;
            
            if (isBuyer == 0) {
                events.push({
                    x: time,
                    y: price,
                    text: "Sell",
                    size: 5,
                    color: "#ff7109",
                    shape: "disk"
                });
            }else{
                events.push({
                    x: time,
                    y: price,
                    text: "Buy",
                    size: 5,
                    color: "#09c4ff",
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

/*
* POST
*/
router.post('/market', function (req, res, next) {
    var data = req.body;
    data.mocPriceBuy = data.mocPriceBuy > 0 ? data.mocPriceBuy : 0;
    data.isCheckRsiBan = data.isCheckRsiBan == 1 ? true : false;
    data.isCheckMACDBan = data.isCheckMACDBan == 1 ? true : false;
    data.minPriceSell = parseFloat(markets[data.MarketName].priceBuyAvg) + parseFloat(markets[data.MarketName].priceBuyAvg * data.minGain / 100);
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
router.post('/buy', function (req, res, next) {
    var symbol = req.body.symbol;
    var price = req.body.price || 0;
    var quantity_per = req.body.quantity_per;
    /*
    * Cancle all order
    */
    binance.cancelOrders(symbol);
    var primaryCoin_value = parseFloat(myBalances[primaryCoin].available) + parseFloat(myBalances[primaryCoin].onOrder);
    var amount = primaryCoin_value * quantity_per /100;
    var quantity = Math.ceil(amount / price);
    if(amount < 0.001){
        res.json({success:0,error: 'Total must be > 0.001 BTC'});
        return;
    }
    binance.buy(symbol, quantity, price);
    res.json({success: 1});
});
router.post('/buymarket', function (req, res, next) {
    var symbol = req.body.symbol;
    var quantity_per = req.body.quantity_per;
    /*
    * Cancle all order
    */
    binance.cancelOrders(symbol);

    var primaryCoin_value = parseFloat(myBalances[primaryCoin].available) + parseFloat(myBalances[primaryCoin].onOrder);
    var amount = primaryCoin_value * quantity_per /100;
    var quantity = Math.ceil(amount / markets[symbol].last);
    
    binance.marketBuy(symbol, quantity, (error, response) => {
        if (error) {
            res.json({success:0,error: "Fail!"}); 
            return;
        }
        res.json({success: 1});
    });
});
router.post('/sell', function (req, res, next) {
    var symbol = req.body.symbol;
    var price = req.body.price || 0 ;
    var quantity_per = req.body.quantity_per;

    /*
    * Cancle all order
    */
    binance.cancelOrders(symbol);

    var altcoin = symbol.replace(primaryCoin, "");
    var altcoin_value = parseFloat(myBalances[altcoin].available) + parseFloat(myBalances[altcoin].onOrder);
    var quantity = Math.ceil(altcoin_value * quantity_per /100);
    var amount = quantity * price;
    if(amount < 0.001){
        res.json({success:0,error: 'Total must be > 0.001 BTC'});
        return;
    }
    binance.sell(symbol, quantity, price);
    res.json({success: 1});
});
router.post('/sellmarket', function (req, res, next) {
    var symbol = req.body.symbol;
    var quantity_per = req.body.quantity_per;
    /*
    * Cancle all order
    */
    binance.cancelOrders(symbol);

    var altcoin = symbol.replace(primaryCoin, "");
    var altcoin_value = parseFloat(myBalances[altcoin].available) + parseFloat(myBalances[altcoin].onOrder);
    var quantity = Math.ceil(altcoin_value * quantity_per /100);
    
    binance.marketSell(symbol, quantity, (error, response) => {
        if (error) {
            res.json({success:0,error: "Fail!"}); 
            return;
        }
        res.json({success: 1});
    });
});
module.exports = router;
