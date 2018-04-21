var express = require('express');
var router = express.Router();
const binance = require('node-binance-api');
const moment = require('moment');
/* GET api listing. */
router.get('/market',ensureAuthenticated, function (req, res, next) {
	var symbol = req.query.symbol || "BTCUSDT";
	res.json(markets[symbol]);
});
router.get('/balance', ensureAuthenticated,function (req, res, next) {
	var coin = req.query.coin || "BTC";
	res.json(myBalances[coin]);
});
router.get('/marketbalance', ensureAuthenticated,function (req, res, next) {
	var symbol = req.query.symbol || "BTCUSDT";
	var altCoin = markets[symbol].altCoin;
	var primaryCoin = markets[symbol].primaryCoin;

	res.json({primaryCoin:{name:primaryCoin,value:myBalances[primaryCoin]},altCoin:{name:altCoin,value:myBalances[altCoin]}});
});
router.get('/candle',ensureAuthenticated, async function (req, res, next) {
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
			var time = rows[i].timestamp;
			var amount = rows[i].amount;
			var id = rows[i].id;

			if (isBuyer == 0) {
				events.push({
					x: time,
					y: price,
					text: "Sell:"+price,
					size: 5,
					color: "#ff7109",
					shape: "disk"
				});
			}else{
				events.push({
					x: time,
					y: price,
					text: "Buy:"+price,
					size: 5,
					color: "#09c4ff",
					shape: "disk"
				});
			}
		}
		return events;
	});

	if(interval != "5m"){
		var number = 1;
		if(interval == "1d")
			number = 24;
		var events2 = await pool.query("SELECT MarketName,SUM(`quantity`) as quantity,SUM(count_sell) as count_sell,SUM(count_buy) as count_buy,ROUND(AVG(price),10) as price,FLOOR(TIMESTAMP/(3600000*"+number+")) * (3600000*"+number+") - (3600000*"+number+") as timestamp_group FROM event_quantity WHERE `MarketName` = '" + symbol + "' GROUP BY timestamp_group").then(function(rows, err) {
			if (err) {
				console.log(err);
			}
			var events = [];
			for (var i in rows) {
				var market = rows[i].MarketName;
				var price= rows[i].price;
				var time = rows[i].timestamp_group;
				var quantity = rows[i].quantity;
				if (quantity > 0) {
					events.push({
						x: time,
						y: price,
						text: "Quantity:"+quantity,
						size: 2,
						color: "#ff7109",
						shape: "shape"
					});
				}else{
					events.push({
						x: time,
						y: price,
						text: "Quantity:"+quantity,
						size: 2,
						color: "#09c4ff",
						shape: "shape"
					});
				}
			}
			return events;
		});
		events = events.concat(events2);
		events.push({
			x: Math.floor(moment().valueOf() / (3600000*number)) * (3600000*number),
			y: markets[symbol].last,
			text: "Quantity:"+markets[symbol].indicator_1h.sumquantity,
			size: 2,
			color: "#ff7109",
			shape: "shape"
		});
	}
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
router.post('/market',ensureAuthenticated, function (req, res, next) {
	var data = req.body;
	data.mocPriceBuy = data.mocPriceBuy > 0 ? data.mocPriceBuy : 0;
	data.isCheckRsiBan = data.isCheckRsiBan == 1 ? true : false;
	data.isCheckMACDBan = data.isCheckMACDBan == 1 ? true : false;
	data.minPriceSell = parseFloat(markets[data.MarketName].priceBuyAvg) + parseFloat(markets[data.MarketName].priceBuyAvg * data.minGain / 100);
	markets[data.MarketName] = Object.assign(markets[data.MarketName], data);
	res.json(markets[data.MarketName]);
});
router.post('/refreshorder',ensureAuthenticated, function (req, res, next) {
	var symbol = req.body.symbol;
	markets[symbol].refreshOrder();
	res.json({success: 1});
});
router.post('/refreshtrade',ensureAuthenticated, function (req, res, next) {
	var symbol = req.body.symbol;
	markets[symbol].refreshTrade();
	res.json({success: 1});
});
router.post('/buy',ensureAuthenticated, function (req, res, next) {
	var symbol = req.body.symbol;
	var price = req.body.price || 0;
	var quantity_per = req.body.quantity_per;   
	if(price == 0){
		res.json({success:0,error: 'Fill Price!'});
		return;
	}
	if (process.env.NODE_ENV == "production") {
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
    }else{
    	markets[symbol].save_db_mua(price,1);
    }
    res.json({success: 1});
});
router.post('/buymarket',ensureAuthenticated, function (req, res, next) {
	var symbol = req.body.symbol;
	var quantity_per = req.body.quantity_per;
	if (process.env.NODE_ENV == "production") {
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
    }else{
    	markets[symbol].save_db_mua(markets[symbol].last,1);
    	res.json({success: 1});
    }

});
router.post('/sell',ensureAuthenticated, function (req, res, next) {
	var symbol = req.body.symbol;
	var price = req.body.price || 0 ;
	var quantity_per = req.body.quantity_per;
	if(price == 0){
		res.json({success:0,error: 'Fill Price!'});
		return;
	}
	if (process.env.NODE_ENV == "production") {
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
    }else{
    	markets[symbol].save_db_ban(price,1);
    }

    res.json({success: 1});
});
router.post('/sellmarket',ensureAuthenticated, function (req, res, next) {
	var symbol = req.body.symbol;
	var quantity_per = req.body.quantity_per;

	if (process.env.NODE_ENV == "production") {
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
    }else{
    	markets[symbol].save_db_ban(markets[symbol].last,1);
    	res.json({success: 1});
    }

});
router.post('/stopmua',ensureAuthenticated, function (req, res, next) {
	var value = req.body.value;
	stopmua = stringtoBoolean(value);
	var update = {
		value:value
	}
	pool.query("UPDATE options SET ? WHERE `key` = 'stopmua'",update).then(function(){
		res.json({success:1});
	}).catch(function(){
		res.json({success:0});
	});
});
router.post('/stopmuacoin',ensureAuthenticated, function (req, res, next) {
	var value = req.body.value;
	var primaryCoin = req.body.coin;
	var name = 'stopmua'+primaryCoin;
	global[name] = stringtoBoolean(value);
	var update = {
		value:value
	}
	pool.query("UPDATE options SET ? WHERE `key` = '"+name+"'",update).then(function(){
		res.json({success:1});
	}).catch(function(){
		res.json({success:0});
	});
});
router.post('/stopmuamarket',ensureAuthenticated, function (req, res, next) {
	var value = req.body.value;
	var symbol = req.body.symbol;
	markets[symbol].stopmua = stringtoBoolean(value);
	var update = {
		value:value
	}
	res.json({success:1});
	// pool.query("UPDATE options SET ? WHERE `key` = 'stopmua'",update).then(function(){
	// 	res.json({success:1});
	// }).catch(function(){
	// 	res.json({success:0});
	// });
});
function stringtoBoolean(value){
	if(!value)
		return value
	switch(value){
		case "1": case "true": case "yes":
		return true;
		break;
		case "0": case "false": case "no":
		return false;
		break;
	}
}
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.json({success:0,code:500,error:'No Access'});
}
module.exports = router;
