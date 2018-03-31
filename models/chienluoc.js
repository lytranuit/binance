
const math = require('mathjs');
const clc = require('cli-color');
var SchemaObject = require('node-schema-object');

const moment = require('moment');


var NotEmptyString = {type: String, minLength: 1};
var numberType = {type: Number, default: 0};
var ChienLuoc = new SchemaObject({
    MarketName: NotEmptyString,
    countbuy: {type: Number, default: 5},
    notbuyinsession: {type: Boolean, default: false},
    amountbuy: {type: Number, default: 0.002},
    countIgnoreSession: {type: Number, default: 5},
    minGain: {type: Number, default: 3},
    maxGain: {type: Number, default: 5},
    isBuy: {type: Boolean, default: false},
    priceBuy: {type: Array, default: []},
    idBuy: {type: Array, default: []},
    priceBuyAvg: {type: Number, default: 0},
    minPriceSell: numberType,
    maxPriceSell: numberType
}, {
    // Add methods to User prototype
    methods: {
        checkban: function (price, candles) {
            var self = this;
            if (self.isBuy && self.priceBuyAvg > 0) {
                var percent = (price - self.priceBuyAvg) / self.priceBuyAvg * 100;
                if (percent > 0) {
                    var textpercent = clc.green(percent.toFixed(2));
                } else {
                    var textpercent = clc.red(percent.toFixed(2));
                }
                console.log(clc.black.bgWhite(self.MarketName), " price:" + price + " - " + textpercent + "%");
                var array = Object.keys(candles);
                var key1 = array[array.length - 3];
                var key2 = array[array.length - 2];
                var candle1 = candles[key1];
                var candle2 = candles[key2];

                /*
                 * price <min
                 */
                if (price < self.minPriceSell)
                    return;
                /*
                 * DK 1 min < price < max
                 * DK 2 tang lien tiep 2 dot.(Xu huong tang)
                 */
                console.log(moment.unix(key1 / 1000).format());
                console.log(candle1);
                console.log(moment.unix(key2 / 1000).format());
                console.log(candle2);
                if (price > self.minPriceSell && price < self.maxPriceSell) {
                    if (candle1.volume < candle2.volume && candle2.open < candle2.close)
                        return;
                }

                self.ban(price);
            }
        },
        ban: function (price) {
            var self = this;
            console.log(clc.bgRed('Sell'), self.MarketName + " price:" + price);
            if (self.idBuy.length) {
                var update = {
                    is_sell: 1,
                    timestamp_sell: moment().format("YYYY-MM-DD HH:mm:ss.SSS")
                };
                pool.query("UPDATE trade SET ? WHERE id IN(" + math.max(self.idBuy) + " )", {price_sell: price});
                pool.query("UPDATE trade SET ? WHERE id IN(" + self.idBuy.join(",") + " )", update);
            }
            var qty = markets[self.MarketName].available * price;
            markets["BTCUSDT"].available += qty;
            markets[self.MarketName].available -= markets[self.MarketName].available;
            /*
             * RESET
             */
            self.isBuy = false;
            self.countbuy = 2;
            self.notbuyinsession = false;
            self.countIgnoreSession = 5;
            self.priceBuy = [];
            self.idBuy = [];
            self.priceBuyAvg = 0;
        },
        checkmua: function (price) {
            var self = this;
            var MarketName = self.MarketName;

//                if (markets[MarketName].count_mua > markets[MarketName].count_sell * 10) {
//                    console.log(clc.green.bgYellow('UP'), MarketName);
//                }
//                if (markets[MarketName].count_mua < markets[MarketName].count_sell * 10) {
//                    console.log(clc.red.bgYellow('Down'), MarketName);
//                }



            if (!markets[MarketName] || MarketName == "BTCUSDT")
                return;
            if (markets['BTCUSDT'].available < markets[MarketName].amountbuy)
                return;
//                console.log(markets[MarketName]);
            if (markets[MarketName]['indicator_5m']['mfi'] < 30) {
//        console.log(clc.black.bgYellow('Down'), MarketName + " MFI:" + markets[MarketName]['mfi']);
                return;
            }
            if (markets['BTCUSDT']['indicator_5m']['mfi'] < 35) {
                if (currentTime != markets['BTCUSDT'].periodTime)
                    console.log(clc.black.bgYellow('Down'), " MFI:" + markets['BTCUSDT']['indicator_5m']['mfi']);
                return;
            }
            if (!self.notbuyinsession && self.countbuy > 0 && !markets[MarketName]['indicator_1h'].td && markets[MarketName]['indicator_1h']['rsi'] < 30 && markets[MarketName]['indicator_1h']['bb'].lower > price) {
                self.mua(price);
                var row = {
                    MarketName: self.MarketName,
                    price_buy: price,
                    timestamp_buy: moment().format("YYYY-MM-DD HH:mm:ss.SSS")
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
            }
        },
        mua: function (price) {
            var self = this;
            self.countbuy--;
            self.notbuyinsession = true;
            self.isBuy = true;
            var qty = self.amountbuy / price;
            markets[self.MarketName].available += qty;
            markets["BTCUSDT"].available -= self.amountbuy;
            self['priceBuy'].push(price);
            self['priceBuyAvg'] = math.mean(self['priceBuy']);
            self['minPriceSell'] = self['priceBuyAvg'] + (self['priceBuyAvg'] * self['minGain'] / 100);
            self['maxPriceSell'] = self['priceBuyAvg'] + (self['priceBuyAvg'] * self['maxGain'] / 100);
            console.log(clc.bgGreen('Buy'), self.MarketName + " price:" + price);
            console.log(markets[self.MarketName]);
        }
    }
});
module.exports = ChienLuoc;