
const math = require('mathjs');
const technical = require('technicalindicators');
const clc = require('cli-color');
const moment = require('moment');
const binance = require('node-binance-api');
var SchemaObject = require('node-schema-object');
var Mail = require("./mail");
var NotEmptyString = {type: String, minLength: 1};
var numberType = {type: Number, default: 0};
var Market = new SchemaObject({
    MarketName: NotEmptyString,
    last: numberType,
    trades: {type: Object, default: {bids: [], asks: []}},
    periodTime: numberType,
    indicator_1h: Object,
    indicator_5m: Object,
    indicator_1m: Object,
    sumquantity:numberType,
    orderBook: {type: Object, default: {bids: {}, asks: {}}},
    countbuy: {type: Number, default: 5},
    amountbuy: {type: Number, default: 0.001},
    minGain: {type: Number, default: 2},
    maxGain: {type: Number, default: 50},
    isBuy: {type: Boolean, default: false},
    isCheckMACDBan: {type: Boolean, default: true},
    isCheckRsiBan: {type: Boolean, default: true},
    isHotMarket: {type: Boolean, default: false},
    timeBuyNext: String,
    trade_session: {type:Object,default: {trade_sell: [],trade_buy: []}},
    priceBuyAvg: numberType,
    priceSellAvg:numberType,
    minPriceSell: numberType,
    maxPriceSell: numberType,
    mocPriceSell: {type: Number, default: 500000},
    mocPriceBuy: numberType,
    chienLuocMua: {type: String, default: "chienLuocMuaDay"}, /// chienLuocMuaMoc
    chienLuocBan: {type: String, default: "chienLuocBanMin"}, /// chienLuocBanMoc
    onOrder: {type: Boolean, default: false}
}, {
    methods: {
        checkmua: function (price) {
            var self = this;
            var MarketName = self.MarketName;
            if (MarketName == "BTCUSDT" || MarketName == "KNCBTC" || MarketName == "BNBBTC")
                return;
            if (myBalances[primaryCoin].available <= self.amountbuy)
                return;
            if (!self.hasDataChiso())
                return;
            if (markets['BTCUSDT']['indicator_5m']['mfi'] < 35) {
                if (currentTime != markets['BTCUSDT'].periodTime)
                    console.log(clc.black.bgYellow('Down'), " MFI:" + markets['BTCUSDT']['indicator_5m']['mfi']);
                return;
            }
            if (self.indicator_1h.td || self.indicator_1h.dt) {
                return;
            }
            if (self.countbuy <= 0) {
                return;
            }
            if (self.timeBuyNext && moment(self.timeBuyNext).valueOf() > moment().valueOf()) {
                return;
            }
            if (self.onOrder)
                return;
            if (self.chienLuocMua == "chienLuocMuaDay") {
                if (self.indicator_5m.rsi > 30) {
                    return;
                }
                if (self.indicator_5m.bb.lower < price) {
                    return;
                }
                self.orderMua(price);
            } else if (self.chienLuocMua == "chienLuocMuaMoc") {
                if (self.isMuaMoc())
                    self.orderMua(price);
            }
        },
        orderMua: function (price) {
            var self = this;
            console.log(clc.green('Order'), self.MarketName + " price:" + price);

            /*
             * VAO LENH
             */
             var amount = Math.ceil(self.amountbuy / price);
             if (process.env.NODE_ENV == "development") {
                self.onOrder = true;
                binance.buy(self.MarketName, amount, price, (error, response) => {
                    if (error) {
                        self.onOrder = false;
                    }
                });

                setTimeout(function () {
                    self.onOrder = false;
                    binance.cancelOrders(self.MarketName);
                }, 60000);
            } else {
                self.save_db_mua(price,amount);
                self.mua(price,amount);
            }
        },
        save_db_mua: async function (price,amount,id,time) {
            var self = this;
            var time = time || moment();
            var insert = {
                MarketName: self.MarketName,
                price: price,
                amount: amount,
                id_trade:id,
                timestamp: time.format("YYYY-MM-DD HH:mm:ss.SSS"),
                isBuyer:1
            };
            await pool.query('INSERT INTO trade SET ?', insert);
        },
        mua: function (price,amount, time) {
            var self = this;
            console.log(clc.bgGreen('Buy'), self.MarketName + " price:" + price);
            var time = time || moment();
            var timeBuyNext = time;
            var obj = {
                time:time.format("YYYY-MM-DD HH:mm:ss.SSS"),
                amount:amount,
                price:price
            }
            self.trade_session.trade_buy.push(obj);
            self.countbuy--;
            self.isBuy = true;
            self.timeBuyNext = timeBuyNext.add(1, "h").format("YYYY-MM-DD HH:mm:ss.SSS");
            var trade_buy = self.trade_session.trade_buy;
            
            var sumcoin = 0;
            var sumamount = 0;
            for(var i in trade_buy){
                sumcoin += parseFloat(trade_buy[i].amount) * parseFloat(trade_buy[i].price);
                sumamount += parseFloat(trade_buy[i].amount);
            }
            self.priceBuyAvg = parseFloat(sumcoin / sumamount);
            self.minPriceSell = parseFloat(self.priceBuyAvg) + parseFloat(self.priceBuyAvg * self.minGain / 100);
        },
        checkban: function (price) {
            var self = this;
            if (self.isBuy && self.priceBuyAvg > 0) {
                var percent = (price - self.priceBuyAvg) / self.priceBuyAvg * 100;
                if (percent > 0) {
                    var textpercent = clc.green(percent.toFixed(2));
                } else {
                    var textpercent = clc.red(percent.toFixed(2));
                }
                console.log(clc.black.bgWhite(self.MarketName), " price:" + price + " - " + textpercent + "%");
                if (!self.hasDataChiso())
                    return;
                if (self.onOrder)
                    return;
                /*
                 * CHeck chien luoc
                 */

                 if (self.chienLuocBan == "chienLuocBanMin") {
                    if (self.isBanMin() && (self.chienLuocBanRSI() || self.isBanMACD()))
                        self.orderBan(price);
                } else if (self.chienLuocBan == "chienLuocBanMoc") {
                    if (self.isBanMoc())
                        self.orderBan(price);
                }
            }
        },
        orderBan: function (price) {
            /*
             * VAO LENH
             */
             var self = this;
             console.log(clc.red('Order'), self.MarketName + " price:" + price);
             if (process.env.NODE_ENV == "development") {
                self.onOrder = true;
                var coin = self.MarketName.replace(primaryCoin, "");
                binance.sell(self.MarketName, myBalances[coin].available, price, (error, response) => {
                    if (error) {
                        self.onOrder = false;
                    }
                });
                setTimeout(function () {
                    self.onOrder = false;
                    binance.cancelOrders(self.MarketName);
                }, 60000);
            } else {
                var coin = self.MarketName.replace(primaryCoin, "");
                self.save_db_ban(price,myBalances[coin].available);
                self.ban(price,myBalances[coin].available);
            }
        },
        save_db_ban: async function (price,amount,id,time) {
            var time = time || moment();
            var self = this;
            var insert = {
                MarketName: self.MarketName,
                price: price,
                amount: amount,
                id_trade:id,
                timestamp: time.format("YYYY-MM-DD HH:mm:ss.SSS"),
                isBuyer:0
            };
            await pool.query("INSERT INTO trade SET ? ", insert);
        },
        ban: function (price,amount,time) {
            var time = time || moment();
            var self = this;
            console.log(clc.bgRed('Sell'), self.MarketName + " price:" + price);
            var obj = {
                time:time.format("YYYY-MM-DD HH:mm:ss.SSS"),
                amount:amount,
                price:price
            }
            self.trade_session.trade_sell.push(obj);
            var trade_sell = self.trade_session.trade_sell;
            var sumcoin = 0;
            var sumamount = 0;
            for(var i in trade_sell){
                sumcoin += parseFloat(trade_sell[i].amount) * parseFloat(trade_sell[i].price);
                sumamount += parseFloat(trade_sell[i].amount);
            }
            self.priceSellAvg = sumcoin / sumamount;
            // if(self.MarketName == "TRIGBTC"){

            //     console.log(self.MarketName);

            //     console.log(self.priceSellAvg);

            //     console.log(sumcoin);

            //     console.log(sumamount);
            //     console.log(self.is_final_session());

            // }
            /*
            * RESET
            */
            var trade_session = self.trade_session;

            var sumamount_buy = 0;
            var array_time = [];
            for(var i in trade_session.trade_buy){
                sumamount_buy += parseFloat(trade_session.trade_buy[i].amount);
                array_time.push(trade_session.trade_buy[i].time);
            }
            var sumamount_sell = 0;
            for(var i in trade_session.trade_sell){
                sumamount_sell += parseFloat(trade_session.trade_sell[i].amount);
                array_time.push(trade_session.trade_sell[i].time);
            }
            // if(self.MarketName == "IOTABTC"){

            //     console.log(self.MarketName);

            //     console.log(sumamount_buy);

            //     console.log(sumamount_sell);
            //     console.log(sumamount_buy == sumamount_sell);
            // }
            if(sumamount_buy == sumamount_sell){
                /*
                * SAVE SESSION
                */
                var col_test = process.env.NODE_ENV == "development" ? 0:1;
                var insert = {
                    MarketName: self.MarketName,
                    price_buy: self.priceBuyAvg,
                    price_sell: self.priceSellAvg,
                    amount: sumamount,
                    is_test:col_test,
                    timestamp: time.format("YYYY-MM-DD HH:mm:ss.SSS")
                };
                pool.query("INSERT INTO trade_session SET ? ", insert).then(function(data){
                    var id_session = data.insertId
                    var update = {
                        id_session:id_session
                    }
                    // if(self.MarketName == "IOTABTC"){

                    //     console.log("UPDATE trade SET ? WHERE MarketName = '"+self.MarketName+"' and timestamp IN('"+array_time.join("','")+"')");
                    // }
                    pool.query("UPDATE trade SET ? WHERE MarketName = '"+self.MarketName+"' and timestamp IN('"+array_time.join("','")+"')",update);
                });

                self.isBuy = false;
                self.countbuy = 5;
                self.priceBuyAvg = 0;
                self.priceSellAvg = 0;
                self.trade_session = {trade_buy:[],trade_sell:[]};
            }
        },
        is_final_session:function(){
            var self = this;
            var trade_session = self.trade_session;

            var sumamount_buy = 0;
            for(var i in trade_session.trade_buy){
                sumamount_buy += parseFloat(trade_session.trade_buy[i].amount);
            }
            var sumamount_sell = 0;
            for(var i in trade_session.trade_sell){
                sumamount_sell += parseFloat(trade_session.trade_sell[i].amount);
            }
            if(sumamount_buy == sumamount_sell){
                console.log(self.MarketName);
                return true;
            }
            return false;
        },
        chienLuocBanRSI: function () {
            var self = this;
            /*
             * RSI > 80
             */
             if (!self.isCheckRsiBan || self.indicator_5m.rsi < 80)
                return false;
            return true;
        },
        isBanMACD: function () {
            var self = this;
            /*
             * MACD < 0
             */
             if (self.isCheckMACDBan && self.indicator_5m.MACD.histogram > 0)
                return false;
            return true;
        },
        isBanMin: function () {
            var self = this;
            /*
             * price < min
             */
             if (self.last < self.minPriceSell)
                return false;
            return true;
        },
        isBanMoc: function () {
            var self = this;
            /*
             * price < moc
             */
             if (self.last < self.mocPriceSell)
                return false;
            return true;
        },
        isMuaMoc: function () {
            var self = this;
            /*
             * price < moc
             */
             if (self.last > self.mocPriceBuy)
                return false;
            return true;
        },
        hasDataChiso: function () {
            var self = this;
            if (!self.indicator_1h.rsi || !self.indicator_5m.rsi || !markets['BTCUSDT']['indicator_5m'].rsi)
                return false;
            return true;
        },
        refreshTrade:function(){
            var self = this;
            self.trades = {bids: [], asks: []};
        },
        refreshOrder:function(){
            var self = this;
            self.orderBook = {bids: {}, asks: {}};
        },
        checkHotMarket: function (candles) {
            var self = this;
            if (self.MarketName == "BTCUSDT")
                return;
            var entries = Object.entries(candles);
            var candle1 = entries[entries.length - 1];
            var candle2 = entries[entries.length - 2];
            var input = {
                close: [candle1[1].close],
                open: [candle1[1].open],
                high: [candle1[1].high],
                low: [candle1[1].low],
            }
            var is_bullishmarubozu = technical.bullishmarubozu(input);
            // if(is_bullishmarubozu)
            //     console.log(self.MarketName,candle1,candle2);
            var is_volume_large = candle1[1].volume > candle2[1].volume * 10;
            var is_price_increase = candle1[1].close > candle2[1].high * 1.02;
            if (!self.isHotMarket && ((self.indicator_1m.count_buy > 200 && self.indicator_1m.count_sell > 200) || (is_bullishmarubozu && is_volume_large && is_price_increase))) {
                self.isHotMarket = true;
                console.log(clc.green("HOT"), clc.red("HOT"), self.MarketName);
                var html = "<p>" + self.MarketName + "</p><p>Current Price:" + self.last + "</p>";
                Mail.sendmail("[HOT]" + self.MarketName + " PUMP", html);
                io.emit("hotMarket", {symbol: self.MarketName, last: self.last});
            }
        },
        syncTrade: async function(){
            var self = this;
            var market = self.MarketName;
            var id_trade = await pool.query("select id_trade from trade WHERE MarketName = '" + market+"' ORDER BY timestamp DESC LIMIT 1").then(function(data){
                if(data && data.length)
                    return data[0].id_trade + 1;
                else
                    return 0;
            });
            // console.log(id_trade);
            // return;
            if (market == "BTCUSDT" || market == "KNCBTC" || market == "BNBBTC")
                return;
            binance.trades(market, async (error, response,symbol)=>{
                if(error){
                    console.log(error);
                    self.syncTrade();
                    return;
                }
                for(var i in response){
                    var trade = response[i];
                    var price = trade.price;
                    var quantity = trade.qty;
                    var id = trade.id;
                    var time = moment.unix(trade.time / 1000);
                    if(trade.isBuyer){
                        await self.save_db_mua(price,quantity,id,time);
                        self.mua(price,quantity,time);
                    }else{
                        await self.save_db_ban(price,quantity,id,time);
                        self.ban(price,quantity,time);
                    }
                }
            },{fromId:id_trade});
        }
    }
});
module.exports = Market;