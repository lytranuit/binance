
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
        console.log("SYNC DB START!");
        var self = this;
        await self.sleep(ms);
        return pool.query("SELECT symbol,MAX(TIMESTAMP) AS max_time,MIN(TIMESTAMP) AS min_time,COUNT(1) AS count_row FROM candles WHERE `interval` ='5m' GROUP BY symbol , `interval`").then(function (result) {
            if (result.length)
                return result;
            else
                throw "No data";
        }).catch(function () {
            var array = [];
            for(var symbol in markets){
                array.push({symbol:symbol,isFirst:true});
            }
            return array;
        }).then(function (results) {
            var options = {limit: 1000};
            var time_current = moment().valueOf();
            // var time_current = 1527386700000;
            var last_time = Math.floor(time_current / (5 * 60 * 1000)) * (5 * 60 * 1000);
            var promiseAll = [];
            for (var result of results) {
                var symbol = result.symbol;
                if(!result.isFirst){
                    if (result.max_time) {
                        options['startTime'] = result.max_time;
                    }
                    if (last_time <= result.max_time && (result.count_row == 1000 || result.count_row == 1999 || result.count_row == 2998 || result.count_row == 3997)) {
                        delete options['startTime'];
                        options['endTime'] = result.min_time;
                    }
                }

                var promise = self.candle_from_server(symbol, "5m", options);
                promiseAll.push(promise);
            }
            return self.getValueCandles(promiseAll);
        }).then(function (values) {
            var keys = ['symbol', 'interval', 'timestamp', 'open', 'high', 'low', 'close', 'volume','quoteVolume','buyVolume','quoteBuyVolume', 'is_Final'];
            return self.save_db_candles(keys, values);
        }).then(function () {
            console.log("SYNC DB Done!");
            return true;
        }).catch(function(err){
            console.log(err)
            return false;
        })
    },
    getValueCandles:async function(promiseAll){
        var self = this;
        return Promise.all(promiseAll).then(async function (results) {
            var values = [];
            var promiseAll1 = [];
            for (var result of results) {
                if(!result.error)
                    values = values.concat(result.data);
                else {
                    var promise = self.candle_from_server(result.symbol, "5m", result.options);
                    promiseAll1.push(promise);
                }
            }
            if(promiseAll1.length){
                var value_promise = await self.getValueCandles(promiseAll1).catch(function(err){
                    return [];
                });
                values = values.concat(value_promise);
            }
            return values;
        })
    },
    candle_from_server: function (symbol, interval, options) {
        var self = this;
        return new Promise((resolve, reject) => {
            binance.candlesticks(symbol, interval, (error, ticks, symbol) => {
                if(error){
                    // console.log({error:error,symbol:symbol,options:options});
                    resolve({error:error,symbol:symbol,options:options});
                }
                var values = [];
                if (self.isIterable(ticks)) {
                    for (let tick of ticks) {
                        let [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored] = tick;
                        let is_Final = ticks[ticks.length - 1][0] == time && options['startTime'] > 0 ? 0 : 1;
                        values.push([symbol, interval, time, open, high, low, close, volume,assetVolume,buyBaseVolume,buyAssetVolume, is_Final]);
                    }
                }
                resolve({error:null,symbol:symbol,data:values});
            }, options);
        })

    },
    save_db_candles: async function (keys, values) {
        return mysql.createConnection(options_sql).then(function (conn) {
            var result = conn.query("INSERT INTO candles (`" + keys.join("`,`") + "`) VALUES ? ON DUPLICATE KEY UPDATE is_Final = 1,close = VALUES(close),high = VALUES(high),low = VALUES(low),volume = VALUES(volume),quoteVolume = VALUES(quoteVolume),buyVolume = VALUES(buyVolume),quoteBuyVolume = VALUES(quoteBuyVolume)", [values]);
            conn.end();
            return true;
        }).catch(function (err) {
            console.log(err)
            return false;
        })
    },
    save_cache_candles: async function () {
        for (var symbol in markets) {
            jsonfile.writeFileSync('./candles/indicator_5m/' + symbol + '.json', markets[symbol]['indicator_5m'].candles);
            jsonfile.writeFileSync('./candles/indicator_1h/' + symbol + '.json', markets[symbol]['indicator_1h'].candles);
        }
    },
    set_change: async function (start) {
        console.log("START SET CHANGE");
        var self = this;
        var start = start || moment().valueOf();
        var last = Math.floor(start / 300000) * 300000 - 300000;
        var array = [
        {interval: '5m', time: 0},
        {interval: '15m', time: 15 * 60 * 1000},
        {interval: '30m', time: 30 * 60 * 1000},
        {interval: '1h', time: 60 * 60 * 1000},
        {interval: '1d', time: 24 * 60 * 60 * 1000},
        {interval: '1w', time: 7 * 24 * 60 * 60 * 1000}
        ];
        var subsql = "";
        for (var i in array) {
            var row = array[i];
            var first = last - row.time;
            var last_prev = first - 300000;
            var first_prev = last_prev - row.time;
            subsql += ",SUM(IF(TIMESTAMP >= '" + first + "' AND TIMESTAMP <= '" + last + "',`buyVolume`,0)) AS volume_" + row.interval + ",SUM(IF(TIMESTAMP >= '" + first_prev + "' AND TIMESTAMP <= '" + last_prev + "',`buyVolume`,0)) AS volume_prev_" + row.interval + ", MAX(IF(TIMESTAMP >= '" + first + "' AND TIMESTAMP <= '" + last + "',`high`,NULL)) AS high_" + row.interval + ",MAX(IF(TIMESTAMP >= '" + first_prev + "' AND TIMESTAMP <= '" + last_prev + "',`high`,NULL)) as high_prev_" + row.interval + ", MIN(IF(TIMESTAMP >= '" + first + "' AND TIMESTAMP <= '" + last + "',`low`,NULL)) AS low_" + row.interval + ",MIN(IF(TIMESTAMP >= '" + first_prev + "' AND TIMESTAMP <= '" + last_prev + "',`low`,NULL)) as low_prev_" + row.interval + ", SUM(IF(TIMESTAMP = '" + last + "',`close`,0)) AS close_" + row.interval + ",SUM(IF(TIMESTAMP = '" + last_prev + "',`close`,0)) as close_prev_" + row.interval;
        }
        var sql = "SELECT symbol " + subsql + " FROM candles WHERE timestamp >= '" + first_prev + "' AND TIMESTAMP <= '" + last + "' GROUP BY symbol";
        console.log("wating....");
        await pool.query(sql).then(function (results) {
            for (var row of results) {
                var symbol = row.symbol;
                for (var i in array) {
                    var arr = array[i];
                    var volume = row['volume_' + arr.interval];
                    var volume_prev = row['volume_prev_' + arr.interval];
                    var close = row['close_' + arr.interval];
                    var close_prev = row['close_prev_' + arr.interval];
                    var high = row['high_' + arr.interval];
                    var low = row['low_' + arr.interval];
                    row['change_volume_' + arr.interval] = self.round((volume - volume_prev) / volume_prev * 100, 2) || 0;
                    row['change_price_' + arr.interval] = self.round((close - close_prev) / close_prev * 100, 2) || 0;
                    row['change_highlow_' + arr.interval] = self.round((high - low) / low * 100, 2) || 0;
                    row['bg_price_' + arr.interval] = "bg-danger-light";
                    row['bg_volume_' + arr.interval] = "bg-danger-light";
                    if (row['change_price_' + arr.interval] > 0 && row['change_price_' + arr.interval] <= 2)
                        row['bg_price_' + arr.interval] = "bg-success-light";
                    else if (row['change_price_' + arr.interval] > 2 && row['change_price_' + arr.interval] <= 10)
                        row['bg_price_' + arr.interval] = "bg-success";
                    else if (row['change_price_' + arr.interval] > 10)
                        row['bg_price_' + arr.interval] = "bg-success-dark";
                    else if (row['change_price_' + arr.interval] < -10)
                        row['bg_price_' + arr.interval] = "bg-danger-dark";
                    else if (row['change_price_' + arr.interval] >= -10 && row['change_price_' + arr.interval] < -2)
                        row['bg_price_' + arr.interval] = "bg-danger";
                    else if (row['change_price_' + arr.interval] >= -2 && row['change_price_' + arr.interval] < 0)
                        row['bg_price_' + arr.interval] = "bg-danger-light";

                    if (row['change_volume_' + arr.interval] > 0 && row['change_volume_' + arr.interval] <= 100)
                        row['bg_volume_' + arr.interval] = "bg-success-light";
                    else if (row['change_volume_' + arr.interval] > 100 && row['change_volume_' + arr.interval] <= 500)
                        row['bg_volume_' + arr.interval] = "bg-success";
                    else if (row['change_volume_' + arr.interval] > 500)
                        row['bg_volume_' + arr.interval] = "bg-success-dark";
                    else if (row['change_volume_' + arr.interval] < -500)
                        row['bg_volume_' + arr.interval] = "bg-danger-dark";
                    else if (row['change_volume_' + arr.interval] >= -500 && row['change_volume_' + arr.interval] < -100)
                        row['bg_volume_' + arr.interval] = "bg-danger";
                    else if (row['change_volume_' + arr.interval] >= -100 && row['change_volume_' + arr.interval] < 0)
                        row['bg_volume_' + arr.interval] = "bg-danger-light";
                }
                markets[symbol].combined = row;
            }
        }).catch(function (err) {
            console.log(err);
            console.log("Error. Change");
        }).then(function () {
            console.log("Done. Change");
            return true;
        });
    },

    setFabonacci:async function(start){
        console.log("SET. FABONACCI");
        var self = this;
        var start = start || moment().valueOf();
        var last = Math.floor(start / 300000) * 300000 - 300000;
        var array = [
        {interval: '1w', time: 7 * 24 * 60 * 60 * 1000}
        ];
        var subsql = "";
        for (var i in array) {
            var row = array[i];
            var first = last - row.time;
            subsql += ", MAX(IF(TIMESTAMP >= '" + first + "' AND TIMESTAMP <= '" + last + "',`high`,NULL)) AS high_" + row.interval + ", MIN(IF(TIMESTAMP >= '" + first + "' AND TIMESTAMP <= '" + last + "',`low`,NULL)) AS low_" + row.interval;
        }
        var sql = "SELECT symbol " + subsql + " FROM candles WHERE timestamp >= '" + first + "' AND TIMESTAMP <= '" + last + "' GROUP BY symbol";
        console.log("wating....");
        await pool.query(sql).then(function (results) {
            for (var row of results) {
                var symbol = row.symbol;
                var high = row.high_1w;
                var low = row.low_1w;
                var obj_fabonacci = {
                    fabonacci_box: [
                    {rate_min:0,rate_max:0.236},
                    {rate_min:0.236,rate_max:0.382},
                    {rate_min:0.382,rate_max:0.5},
                    {rate_min:0.5,rate_max:0.618},
                    {rate_min:0.618,rate_max:0.786},
                    {rate_min:0.786,rate_max:1},
                    {rate_min:1,rate_max:1.618}
                    ],
                    current_box:-1
                }
                obj_fabonacci.min = low;
                obj_fabonacci.max = high;
                for(var key in obj_fabonacci.fabonacci_box){
                    obj_fabonacci.fabonacci_box[key].min = obj_fabonacci.fabonacci_box[key].rate_min * (high - low) + low;
                    obj_fabonacci.fabonacci_box[key].max = obj_fabonacci.fabonacci_box[key].rate_max * (high - low) + low;
                }
                markets[symbol].fabonacci = obj_fabonacci;
            }
        }).catch(function (err) {
            console.log(err);
            console.log("Error. FABONACCI");
        }).then(function () {
            console.log("Done. FABONACCI");
            return true;
        });
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