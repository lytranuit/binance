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
                markets[market].setIndicator(interval, results);
            });
            binance.websockets.chart(market, "5m", (market, interval, results) => {
                if (Object.keys(results).length === 0)
                    return;
                markets[market].setIndicator(interval, results);
                /*
                 * 
                 * @type type
                 */
                let tick = binance.last(results);
                var last = results[tick].close;
//                console.log(results[tick]);
                if (markets[market].periodTime && markets[market].periodTime == tick && !results[tick].isFinal) {
//                    console.log(market + " last price: " + last);
                    markets[market].last = last;
                    markets[market]['chienluoc1'].checkmua(last);
                    markets[market]['chienluoc1'].checkban(last, results);
                } else {
//                    console.log(tick);
                    if (currentTime != tick) {
                        currentTime = tick;
                        console.log("Bắt đầu phiên:", moment.unix(tick / 1000).format());
                        console.log("Price of BTC: ", markets['BTCUSDT']['last']);
                    }
                    if (markets[market]['chienluoc1'].notbuyinsession)
                        markets[market]['chienluoc1'].countIgnoreSession--;
                    /*
                     * MUA Lai SAu x LUOT
                     */
                    if (markets[market]['chienluoc1'].countIgnoreSession == 0) {
                        markets[market]['chienluoc1'].countIgnoreSession = 5;
                        markets[market]['chienluoc1'].notbuyinsession = false;
                    }
                }
//                console.log(moment().startOf("hour").valueOf());
//                console.log(markets[market].periodTime);
                if (markets[market].periodTime == moment().startOf("hour").valueOf()) {
                    markets[market].count_buy = 0;
                    markets[market].count_sell = 0;
                }
                markets[market].periodTime = tick;
            });
        }
    }

    var array_market = Object.keys(ticker);
    binance.websockets.trades(array_market, (trades) => {
        let {e: eventType, E: eventTime, s: symbol, p: price, q: quantity, m: maker, a: tradeId} = trades;
        if (markets[symbol]) {
            if (maker)
                markets[symbol].count_sell++;
            else
                markets[symbol].count_mua++;
        }
    });
//    binance.websockets.depthCache(array_market, (depth) => {
//        console.log(depth);
//        return;
//        let {e: eventType, E: eventTime, s: symbol, u: updateId, b: bidDepth, a: askDepth} = depth;
////        console.log(depth);
//        if (markets[symbol]) {
//            var depthCache = binance.depthCache(symbol);
//            console.log(depthCache);
//            let bids = Object.values(depthCache.bids);
//            let asks = Object.values(depthCache.asks);
//            let sumbids = math.sum(bids);
//            let sumasks = math.sum(asks);
//            markets[symbol].bids_q = sumbids;
//            markets[symbol].asks_q = sumasks;
//        }
//    });
    var query = pool.query("SELECT * FROM trade where is_sell IS NULL").then(function (rows, err) {
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
        count_sell: 0,
        count_mua: 0,
        bids_q: 0,
        asks_q: 0,
        indicator_1h: {},
        indicator_5m: {},
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
                    pool.query("UPDATE trade SET ? WHERE id IN(" + math.max(self.idBuy) + " )", {price_sell: price});
                    pool.query("UPDATE trade SET ? WHERE id IN(" + self.idBuy.join(",") + " )", update);
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

                if (markets[MarketName].count_mua > markets[MarketName].count_sell * 3) {
                    console.log(clc.green.bgYellow('UP'), MarketName);
                }
                if (markets[MarketName].count_mua < markets[MarketName].count_sell * 3) {
                    console.log(clc.red.bgYellow('Down'), MarketName);
                }
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
//                if (markets[MarketName]['volume'] < 1000) {
//                    return;
//                }

                if (!self.notbuyinsession && self.countbuy > 0 && markets[MarketName]['indicator_1h']['rsi'] < 30 && markets[MarketName]['indicator_1h']['bb'].lower > price) {
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
                self['priceBuy'].push(price);
                self['priceBuyAvg'] = math.mean(self['priceBuy']);
                self['minPriceSell'] = self['priceBuyAvg'] + (self['priceBuyAvg'] * self['minGain'] / 100);
                self['maxPriceSell'] = self['priceBuyAvg'] + (self['priceBuyAvg'] * self['maxGain'] / 100);
                console.log(clc.bgGreen('Buy'), self.MarketName + " price:" + price);
                console.log(markets[self.MarketName]);
            }
        },
        setIndicator: function (interval, results) {

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
    };
}
// The only time the user data (account balances) and order execution websockets will fire, is if you create or cancel an order, or an order gets filled or partially filled
function balance_update(data) {
    console.log("Balance Update");
    for (let obj of data.B) {
        let {a: asset, f: available, l: onOrder} = obj;
        if (available == "0.00000000")
            continue;
        console.log(asset + "\tavailable: " + available + " (" + onOrder + " on order)");
    }
}
function execution_update(data) {
    let {x: executionType, s: symbol, p: price, q: quantity, S: side, o: orderType, i: orderId, X: orderStatus} = data;
    if (executionType == "NEW") {
        if (orderStatus == "REJECTED") {
            console.log("Order Failed! Reason: " + data.r);
        }
        console.log(symbol + " " + side + " " + orderType + " ORDER #" + orderId + " (" + orderStatus + ")");
        console.log("..price: " + price + ", quantity: " + quantity);
        return;
    }
//NEW, CANCELED, REPLACED, REJECTED, TRADE, EXPIRED
    console.log(symbol + "\t" + side + " " + executionType + " " + orderType + " ORDER #" + orderId);
}
binance.websockets.userData(balance_update, execution_update);