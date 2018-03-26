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
        pass: 'vohinhca'
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
binance.prices((error, ticker) => {
    if (error) {
        return console.error(error);
    }
    for (var i in ticker) {
        var market = i;
        var last = ticker[i];
        if (market.indexOf("BTC") != -1) {
            setMarket(market, last);
            binance.websockets.chart(market, "5m", (market, interval, results) => {
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
                    markets[market].last = parseFloat(last);
                    checkPrice(market, last);
                } else {
//                    console.log(tick);
                    if (currentTime != tick) {
                        currentTime = tick;
                        console.log("Bắt đầu phiên:", moment.unix(tick / 1000).format("YYYY-MM-DD HH:mm:ss.SSS"));
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
    console.log("Price of BTC: ", ticker.BTCUSDT);

});

//binance.balance((error, balances) => {
//    console.log("balances()", balances);
////    console.log("ETH balance: ", balances.ETH.available);
//});
function setMarket(market, last = 0) {
    markets[market] = {
        MarketName: market,
        last: last,
        chienluoc1: {
            MarketName: market,
            countbuy: 2,
            notbuyinsession: false,
            amountbuy: 0.005,
            countIgnoreSession: 5,
            minGain: 2,
            maxGain: 10,
            isBuy: false,
            priceBuy: [],
            priceBuyAvg: 0,
            checkban: function (price, candles) {

                var self = this;
                if (self.isBuy && self.priceBuyAvg > 0) {
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

                var row = {
                    MarketName: self.MarketName,
                    price_sell: price
                };
                pool.query('INSERT INTO trade SET ?', row);
                /*
                 * RESET
                 */
                self.isBuy = false;
                self.countbuy = 2;
                self.notbuyinsession = false;
                self.countIgnoreSession = 5;
                self.priceBuy = [];
                self.priceBuyAvg = 0;
            },
            checkmua: function (price) {
                var self = this;
                var MarketName = self.MarketName;
                if (!self.notbuyinsession && self.countbuy > 0 && markets[MarketName]['rsi'] < 30 && markets[MarketName]['bb'].lower > price) {
                    self.countbuy--;
                    self.notbuyinsession = true;
                    self.isBuy = true;
                    self.mua(price);
                }
            },
            mua: function (price) {
                var self = this;
                var row = {
                    MarketName: self.MarketName,
                    price_buy: price
                };
                pool.query('INSERT INTO trade SET ?', row);
                self['priceBuy'].push(price);
                self['priceBuyAvg'] = math.mean(self['priceBuy']);
                self['minPriceSell'] = self['priceBuyAvg'] + (self['priceBuyAvg'] * self['minGain'] / 100);
                self['maxPriceSell'] = self['priceBuyAvg'] + (self['priceBuyAvg'] * self['maxGain'] / 100);
                console.log(clc.bgGreen('Buy'), self.MarketName + " price:" + price);
                console.log(markets[self.MarketName]);


                var html = "<p>" + self.MarketName + " đang tăng mạnh!</p><p>Current Price: " + price + "</p><pre>" + JSON.stringify(markets[self.MarketName], undefined, 2) + "</pre>";
                mailOptions['html'] = html;
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
            }
        }
    };
}
function checkPrice(MarketName, price) {
    if (!markets[MarketName])
        return;

//    console.log(markets[MarketName]);
    if (markets[MarketName]['mfi'] < 30) {
//        console.log(clc.black.bgYellow('Down'), MarketName + " MFI:" + markets[MarketName]['mfi']);
        return;
    }
    if (markets['BTCUSDT']['mfi'] < 30) {
        return;
    }
    markets[MarketName]['chienluoc1'].checkmua(price);
}
