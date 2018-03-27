const binance = require('node-binance-api');
const mysql = require('promise-mysql');
const config = require('./config.json');
const key = require('./key.json');
const moment = require('moment');
const math = require('mathjs');
const technical = require('technicalindicators');
const clc = require('cli-color');
/******************
 * 
 * CONFIG MYSQL
 * 
 *****************/
const  pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'binance',
    connectionLimit: 10
});
/******************
 * 
 * END CONFIG MYSQL
 * 
 *****************/




/******************
 * 
 * CONFIG MAIL
 * 
 *****************/
var nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'lytranuit@gmail.com',
        pass: 'vohinhcaAsd123'
    }
});
const mailOptions = {
    from: 'lytranuit@gmail.com',
    to: 'lytranuit@gmail.com',
    subject: 'Báo cáo giá Binance'
};
/******************
 * 
 * END CONFIG MAIL
 * 
 *****************/


/******************
 * 
 * CONFIG BINANCE
 * 
 *****************/
binance.options(key);
const markets = {
};
var currentTime = null;
/******************
 * 
 * END CONFIG MAIL
 * 
 *****************/

binance.websockets.prevDay(false, (error, response) => {
    if (markets[response.symbol]) {
        markets[response.symbol]['numTrades'] = response.numTrades;
        markets[response.symbol]['volume'] = response.quoteVolume;
        markets[response.symbol]['last'] = response.close;
    }
});
binance.prices((error, ticker) => {
    if (error) {
        return console.error(error);
    }
    for (var i in ticker) {
        var market = i;
        var last = ticker[i];
        if (market.indexOf("BTC") != -1) {
            setMarket(market, last);
            // For a specific symbol:
            binance.websockets.chart(market, "1h", (market, interval, results) => {
                if (Object.keys(results).length === 0)
                    return;
//    let tick = binance.last(chart);
//    const last = chart[tick].close;
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

                /*
                 * RSI
                 */
                var rsi = technical.RSI;
                var input = {
                    values: argc,
                    period: 14
                };
                var array_rsi = rsi.calculate(input);
                markets[market].rsi = array_rsi[array_rsi.length - 1];

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
                markets[market].mfi = array_mfi[array_mfi.length - 1];

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
                markets[market].bb = array_bb[array_bb.length - 1];

//    console.log(markets[market]);
                // Optionally convert 'chart' object to array:
                // let ohlc = binance.ohlc(chart);
                // console.log(symbol, ohlc); 
                let tick = binance.last(results);
                var last = results[tick].close;
//                console.log(results[tick]);
                if (markets[market].periodTime && markets[market].periodTime == tick && !results[tick].isFinal) {
//                    console.log(market + " last price: " + last);
                    markets[market]['chienluoc1'].checkmua(last);
                } else {
//                    console.log(tick);
                    if (currentTime != tick) {
                        currentTime = tick;
                        console.log("Bắt đầu phiên:", moment.unix(tick / 1000).format());
                    }
                    if (markets[market]['chienluoc1'].notbuyinsession)
                        markets[market]['chienluoc1'].countIgnoreSession--;
                    /*
                     * MUA Lai x LUOT
                     */
                    if (markets[market]['chienluoc1'].countIgnoreSession == 0) {
                        markets[market]['chienluoc1'].countIgnoreSession = 5;
                        markets[market]['chienluoc1'].notbuyinsession = false;
                    }
//                    var candles = results.slice(-3);
                    markets[market]['chienluoc1'].checkban(last, results);
//                    banChienLuoc1(market, last, candles);
                }

                markets[market].periodTime = tick;
            });
        }
    }
    var query = pool.query("SELECT * FROM trade_1h where is_sell IS NULL").then(function (rows, err) {
        if (err) {
            console.log(err);
        }
        for (var i in rows) {
            var market = rows[i].MarketName;
            var price_buy = rows[i].price_buy;
            var id = rows[i].id;
            markets[market]['chienluoc1']['idBuy'].push(id);
            markets[market]['chienluoc1'].mua(price_buy);
        }
    });
    console.log("Price of BTC: ", ticker.BTCUSDT);

});

//binance.balance((error, balances) => {
//    console.log("balances()", balances);
////    console.log("ETH balance: ", balances.ETH.available);
//});
function setMarket(market) {
    markets[market] = {
        MarketName: market,
        last: 0,
        volume: 0,
        numTrades: 0,
        chienluoc1: {
            MarketName: market,
            countbuy: 2,
            notbuyinsession: false,
            amountbuy: 0.005,
            countIgnoreSession: 5,
            minGain: 5,
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
                    pool.query("UPDATE trade_1h SET ? WHERE id IN(" + Math.max(self.idBuy) + " )", {price_sell: price});
                    pool.query("UPDATE trade_1h SET ? WHERE id IN(" + self.idBuy.join(",") + " )", update);
                }
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
                if (!markets[MarketName] || MarketName == "BTCUSDT")
                    return;

//    console.log(markets[MarketName]);
                if (markets[MarketName]['mfi'] < 30) {
//        console.log(clc.black.bgYellow('Down'), MarketName + " MFI:" + markets[MarketName]['mfi']);
                    return;
                }
                if (markets['BTCUSDT']['mfi'] < 30) {
                    console.log(clc.black.bgYellow('Down'), " MFI:" + markets['BTCUSDT']['mfi']);
                    return;
                }
//                if (markets[MarketName]['volume'] < 1000) {
//                    return;
//                }

                if (!self.notbuyinsession && self.countbuy > 0 && markets[MarketName]['rsi'] < 30 && markets[MarketName]['bb'].lower > price) {
                    self.mua(price);
                    var row = {
                        MarketName: self.MarketName,
                        price_buy: price,
                        timestamp_buy: moment().format("YYYY-MM-DD HH:mm:ss.SSS")
                    };
                    pool.query('INSERT INTO trade_1h SET ?', row).then(function (result) {
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

                self['priceBuy'].push(price);
                self['priceBuyAvg'] = math.mean(self['priceBuy']);
                self['minPriceSell'] = self['priceBuyAvg'] + (self['priceBuyAvg'] * self['minGain'] / 100);
                self['maxPriceSell'] = self['priceBuyAvg'] + (self['priceBuyAvg'] * self['maxGain'] / 100);
                console.log(clc.bgGreen('Buy'), self.MarketName + " price:" + price);
                console.log(markets[self.MarketName]);
            }
        }
    };
}
