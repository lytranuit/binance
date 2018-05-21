
const math = require('mathjs');
const technical = require('technicalindicators');
const clc = require('cli-color');
const moment = require('moment');
const binance = require('node-binance-api');
const mysql = require('promise-mysql');
const jsonfile = require('jsonfile');
const model = {
    sync_db_candles: async function (ms = 0) {
        if (process.env.NODE_ENV != "ANALYTICS" && process.env.NODE_ENV != "production")
            return
        var self = this;
        await self.sleep(ms);
        pool.query("SELECT symbol,MAX(TIMESTAMP) AS max_time,MIN(TIMESTAMP) AS min_time,COUNT(1) AS count_row FROM candles WHERE `interval` ='5m' GROUP BY symbol , `interval`").then(function (result) {
            if (result.length)
                return result;
            else
                throw "No data";
        }).catch(function () {
            return [];
        }).then(function (results) {
            var options = {limit: 1000};
            var time_current = moment().valueOf();
            var last_time = Math.floor(time_current / 5 * 60 * 1000) * 5 * 60 * 1000;
            var promiseAll = [];
            for (var result of results) {
                var symbol = result.symbol;
                if (result.max_time) {
                    options['startTime'] = result.max_time;
                }
                if (last_time <= result.max_time && (result.count_row == 1000 || result.count_row == 1999)) {
                    delete options['startTime'];
                    options['endTime'] = result.min_time;
                }
                var promise = self.candle_from_server(symbol, "5m", options);
                promiseAll.push(promise);
            }
            return Promise.all(promiseAll);
        }).then(function (results) {
            var values = [];
            var keys = ['symbol', 'interval', 'timestamp', 'open', 'high', 'low', 'close', 'volume', 'is_Final'];
            for (var result of results) {
                values = values.concat(result);
            }
            return self.save_db_candles(keys, values);
        }).catch(function (er) {
            console.log(er);
        })
    },
    candle_from_server: function (symbol, interval, options) {
        var self = this;
        return new Promise((resolve, reject) => {
            binance.candlesticks(symbol, interval, (error, ticks, symbol) => {
                var values = [];
                if (self.isIterable(ticks)) {
                    for (let tick of ticks) {
                        let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = tick;
                        let is_Final = ticks[ticks.length - 1][0] == time && options['startTime'] > 0 ? 0 : 1;
                        values.push([symbol, interval, time, open, high, low, close, volume, is_Final]);
                    }

//                if (values.length > 1)
//                    self['indicator_5m'].save_db_candles(keys, values)
//                            .then(function () {
//                                var periodTime_5m = self['indicator_5m'].periodTime;
//                                var periodTime_1h = self['indicator_1h'].periodTime + (5 * 60 * 1000);
//                                if (periodTime_5m == periodTime_1h) {
//                                    self['indicator_1h'].setIndicator();
//                                }
//                                self['indicator_5m'].setIndicator();
//                                // console.log("Save Done! Symbol:",market);
//                            });
                }
                resolve(values);
            }, options);
        })

    },
    save_db_candles: async function (keys, values) {
        return mysql.createConnection(options_sql).then(function (conn) {
            var result = conn.query("INSERT INTO candles (`" + keys.join("`,`") + "`) VALUES ? ON DUPLICATE KEY UPDATE is_Final = 1,close = VALUES(close),high = VALUES(high),low = VALUES(low),volume = VALUES(volume)", [values]);
            conn.end();
            return true;
        }).catch(function () {
            return false;
        })
    },
    save_cache_candles: async function () {
        for (var symbol in markets) {
            jsonfile.writeFileSync('./candles/indicator_5m/' + symbol + '.json', markets[symbol]['indicator_5m'].candles);
            jsonfile.writeFileSync('./candles/indicator_1h/' + symbol + '.json', markets[symbol]['indicator_1h'].candles);
        }
    },
    isIterable: function (obj) {
        if (obj === null) {
            return false;
        }
        return typeof obj[Symbol.iterator] === 'function';
    },
    sleep: async function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    round: function (value, decimals) {
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    }
}
module.exports = model;