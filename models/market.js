
const math = require('mathjs');
const technical = require('technicalindicators');
const clc = require('cli-color');
var markets = {};
exports.create = function (market) {
    markets[market] = {
        MarketName: market,
        last: 0,
        count_sell: 0,
        count_mua: 0,
        bids_q: 0,
        asks_q: 0,
        available: 0,
        indicator_1h: {},
        indicator_5m: {},
        indicator_1m: {},
        chienluoc1: {
            MarketName: market,
            countbuy: 2,
            notbuyinsession: false,
            amountbuy: 0.002,
            countIgnoreSession: 5,
            minGain: 3,
            maxGain: 10,
            isBuy: false,
            priceBuy: [],
            idBuy: [],
            priceBuyAvg: 0,
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
                var qty = markets[market].available * price;
                markets["BTCUSDT"].available += qty;
                markets[market].available -= markets[market].available;
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
                if (markets['BTCUSDT']['indicator_5m']['mfi'] < 30) {
                    if (currentTime != markets['BTCUSDT'].periodTime)
                        console.log(clc.black.bgYellow('Down'), " MFI:" + markets['BTCUSDT']['indicator_5m']['mfi']);
                    return;
                }
                if (!self.notbuyinsession && self.countbuy > 0 && markets[MarketName]['indicator_5m']['rsi'] < 30 && markets[MarketName]['indicator_5m']['bb'].lower > price) {
                    self.mua(price);
                    var row = {
                        MarketName: self.MarketName,
                        price_buy: price,
                        timestamp_buy: moment().format("YYYY-MM-DD HH:mm:ss.SSS")
                    };
                    pool.query('INSERT INTO trade SET ?', row).then(function (result) {
                        self['idBuy'].push(result.insertId);
                        var html = "<p>" + self.MarketName + "</p><p>Current Price: " + price + "</p><pre>" + JSON.stringify(markets[self.MarketName], undefined, 2) + "</pre>";
                        mailOptions['html'] = html;
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
                markets[market].available += qty;
                markets["BTCUSDT"].available -= self.amountbuy;
                self['priceBuy'].push(price);
                self['priceBuyAvg'] = math.mean(self['priceBuy']);
                self['minPriceSell'] = self['priceBuyAvg'] + (self['priceBuyAvg'] * self['minGain'] / 100);
                self['maxPriceSell'] = self['priceBuyAvg'] + (self['priceBuyAvg'] * self['maxGain'] / 100);
                console.log(clc.bgGreen('Buy'), self.MarketName + " price:" + price);
                console.log(markets[self.MarketName]);
            }
        },
        setIndicator: async function (interval, results) {

            var argh = [];
            var argl = [];
            var argv = [];
            var argc = [];
//                console.log(markets[market]);
            for (var key in results) {
                argh.push(parseFloat(results[key]['high']));
                argl.push(parseFloat(results[key]['low']));
                argv.push(parseFloat(results[key]['volume']));
                argc.push(parseFloat(results[key]['close']));
            }

            if (argc.length > 250) {
                var input = {
                    values: argc
                };
                var pattern = await technical.predictPattern(input);
                var hs = await technical.hasHeadAndShoulder(input);
                var ihs = await technical.hasInverseHeadAndShoulder(input);
                var db = await technical.hasDoubleBottom(input);
                var dt = await technical.hasDoubleTop(input);
                var tu = await technical.isTrendingUp(input);

                var td = await technical.isTrendingDown(input);
                markets[market]['indicator_' + interval].pattern = pattern;
                markets[market]['indicator_' + interval].hs = hs;
                markets[market]['indicator_' + interval].ihs = ihs;
                markets[market]['indicator_' + interval].db = db;
                markets[market]['indicator_' + interval].dt = dt;
                markets[market]['indicator_' + interval].tu = tu;
                markets[market]['indicator_' + interval].td = td;
            }
            /*
             * RSI
             */
            var rsi = technical.RSI;
            var input = {
                values: argc,
                period: 14
            };
            var array_rsi = rsi.calculate(input);
            markets[market]['indicator_' + interval].rsi = array_rsi[array_rsi.length - 1];
            /*
             * MFI
             */
            var mfi = technical.MFI;
            var input = {
                high: argh,
                low: argl,
                close: argc,
                volume: argv,
                period: 14
            };
            var array_mfi = mfi.calculate(input);
            markets[market]['indicator_' + interval].mfi = array_mfi[array_mfi.length - 1];
            /*
             * BOLLINGER BAND 
             */
            var bb = technical.BollingerBands;
            var arg = [];
            for (var key in results) {
                arg.push(results[key]['close']);
            }
            var input = {
                values: argc,
                period: 20,
                stdDev: 2
            };
            var array_bb = bb.calculate(input);
            markets[market]['indicator_' + interval].bb = array_bb[array_bb.length - 1];
        }
    }
    if (market == "BTCUSDT") {
        markets[market].available = 0.03;
    }
}
exports.update = function (market, data) {
    markets[market] = Object.assign(markets[market], data);
    return markets[market];
}
exports.updatechienluoc1 = function (market, data) {
    markets[market].chienluoc1 = Object.assign(markets[market].chienluoc1, data);
    return markets[market];
}
exports.read = function (key) {
    return markets[key];
}

exports.destroy = function (key) {
    delete markets[key];
}

exports.keys = function () {
    return Object.keys(markets);
}
exports.all = function () {
    return markets;
}