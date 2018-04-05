const binance = require('node-binance-api');
const math = require('mathjs');
const clc = require('cli-color');
var SchemaObject = require('node-schema-object');

const moment = require('moment');

var NotEmptyString = {type: String, minLength: 1};
var numberType = {type: Number, default: 0};
var ChienLuoc = new SchemaObject({
    MarketName: NotEmptyString,
    countbuy: {type: Number, default: 5},
    amountbuy: {type: Number, default: 0.001},
    minGain: {type: Number, default: 1},
    maxGain: {type: Number, default: 50},
    isBuy: {type: Boolean, default: false},
    priceBuy: Array,
    timeBuy: Array,
    timeBuyNext: String,
    idBuy: Array,
    priceBuyAvg: {type: Number, default: 0},
    minPriceSell: numberType,
    maxPriceSell: numberType,
    chienLuocMua: {type: Array, default: ["chienLuocMuaDay"]},
    chienLuocBan: {type: Array, default: ["chienLuocBanRSI","chienLuocBanMACD",]},
    onOrder: {type: Boolean, default: false}
}, {
// Add methods to User prototype
    methods: {
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
                if (!self.chienLuocBanRSI() && !self[self.chienLuocBan]()) {
                    return;



                }
                if (self.onOrder)
                    return;
                /*
                 * VAO LENH
                 */
                if (!test) {
                    self.onOrder = true;
                    var coin = self.MarketName.replace(primaryCoin, "");
                    binance.sell(self.MarketName, myBalances[coin].available, price, (error, response) => {
                        console.log("Market Buy response", response);
                        console.log("order id: " + response.orderId);
                        setTimeout(function () {
                            binance.cancel(self.MarketName, response.orderId);
                            self.onOrder = false;
                        }, 60000);
                    });
                } else {
                    self.save_db_ban(price);
                }
            }
        },
        chienLuocBanRSI: function () {
            var self = this;
            /*
             * RSI > 80
             */
            if (markets[self.MarketName]['indicator_5m'].rsi < 80)
                return false;
            return true;
        },
        chienLuocBanMACD: function () {
            var self = this;
            /*
             * MACD < 0
             */
            if (markets[self.MarketName]['indicator_5m'].MACD.histogram > 0)
                return false;
            return true;
        },
        chienLuocBanMin: function (price) {
            var self = this;
            /*
             * price < min
             */
            if (price < self.minPriceSell)
                return false;
            return true;
        },
        chienLuocBanMoc: function (price) {
            var self = this;
            /*
             * price < moc
             */
            if (price < self.mocPriceSell)
                return;
            return true;
        },
        save_db_ban: function (price) {
            var time = moment();
            var self = this;
            if (self.idBuy.length > 1) {
                var update = {
                    is_sell: 1,
                    timestamp_sell: time.format("YYYY-MM-DD HH:mm:ss.SSS"),
                    deleted: 1
                };
                pool.query("UPDATE trade SET ? WHERE id IN(" + self.idBuy.join(",") + ")", update);
                var col_test = test ? 1 : 0;
                var insert = {
                    is_sell: 1,
                    timestamp_sell: time.format("YYYY-MM-DD HH:mm:ss.SSS"),
                    price_sell: price,
                    timestamp_buy: time.format("YYYY-MM-DD HH:mm:ss.SSS"),
                    price_buy: self.priceBuyAvg,
                    MarketName: self.MarketName,
                    amount: self.amountbuy * self.idBuy.length,
                    test: col_test
                }
                pool.query("INSERT INTO trade SET ? ", insert);
            } else {
                var update = {
                    is_sell: 1,
                    timestamp_sell: time.format("YYYY-MM-DD HH:mm:ss.SSS"),
                    price_sell: price
                };
                pool.query("UPDATE trade SET ? WHERE id IN(" + self.idBuy.join(",") + ")", update);
            }
            self.ban(price);
        },
        ban: function (price) {
            var self = this;
            console.log(clc.bgRed('Sell'), self.MarketName + " price:" + price);
            /*
             * RESET
             */
            self.isBuy = false;
            self.countbuy = 5;
            self.priceBuy = [];
            self.timeBuy = [];
            self.idBuy = [];
            self.priceBuyAvg = 0;
        },
        checkmua: function (price) {
            var self = this;
            var MarketName = self.MarketName;
            if (!markets[MarketName] || MarketName == "BTCUSDT" || MarketName == "KNCBTC" || MarketName == "BNBBTC")
                return;
            if (myBalances[primaryCoin].available <= self.amountbuy)
                return;
//                console.log(markets[MarketName]);
//            if (markets[MarketName]['indicator_5m']['mfi'] < 30) {
//        console.log(clc.black.bgYellow('Down'), MarketName + " MFI:" + markets[MarketName]['mfi']);
//                return;
//            }
            if (!markets[MarketName]['indicator_1h'].rsi || !markets[MarketName]['indicator_5m'].rsi || !markets['BTCUSDT']['indicator_5m'].rsi)
                return;
            if (markets['BTCUSDT']['indicator_5m']['mfi'] < 35) {
                if (currentTime != markets['BTCUSDT'].periodTime)
                    console.log(clc.black.bgYellow('Down'), " MFI:" + markets['BTCUSDT']['indicator_5m']['mfi']);
                return;
            }
            if (markets[MarketName]['indicator_1h'].td || markets[MarketName]['indicator_1h'].dt) {
                return;
            }
            if (markets[MarketName]['indicator_5m'].rsi > 30) {
                return;
            }
            if (markets[MarketName]['indicator_5m']['bb'].lower < price) {
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
            /*
             * VAO LENH
             */
            if (!test) {
                self.onOrder = true;
                var amount = Math.round(self.amountbuy / price);
                binance.buy(self.MarketName, amount, price, (error, response) => {
                    console.log("Market Buy response", response);
                    console.log("order id: " + response.orderId);
                    setTimeout(function () {
                        binance.cancel(self.MarketName, response.orderId);
                        self.onOrder = false;
                    }, 60000);
                });
            } else {
                self.mua(price);
                self.save_db_mua(price);
            }
        },
        save_db_mua: function (price) {
            var self = this;
            var col_test = test ? 1 : 0;
            var row = {
                MarketName: self.MarketName,
                price_buy: price,
                amount: self.amountbuy,
                timestamp_buy: moment().format("YYYY-MM-DD HH:mm:ss.SSS"),
                test: col_test
            };
            pool.query('INSERT INTO trade SET ?', row).then(function (result) {
                self['idBuy'].push(result.insertId);
                var html = "<p>" + self.MarketName + "</p><p>Current Price: " + price + "</p><pre>" + JSON.stringify(markets[self.MarketName], undefined, 2) + "</pre>";
//                    mailOptions['html'] = html;
//                        transporter.sendMail(mailOptions, function (error, info) {
//                            if (error) {
//                                console.log(error);
//                            } else {
//                                console.log('Email sent: ' + info.response);
//                            }
//                        });
            });
        },
        mua: function (price, time) {
            var self = this;
            console.log(clc.bgGreen('Buy'), self.MarketName + " price:" + price);
            var time = time || moment();
            self['countbuy']--;
            self['isBuy'] = true;
            self['priceBuy'].push(price);
            self['timeBuy'].push(time.format("MM-DD HH:mm"));
            self['timeBuyNext'] = time.add(1, "h").format("YYYY-MM-DD HH:mm:ss.SSS");
            self['priceBuyAvg'] = math.mean(self['priceBuy']);
            self['minPriceSell'] = self['priceBuyAvg'] + (self['priceBuyAvg'] * self['minGain'] / 100);
            self['maxPriceSell'] = self['priceBuyAvg'] + (self['priceBuyAvg'] * self['maxGain'] / 100);
        },
    }
});
module.exports = ChienLuoc;