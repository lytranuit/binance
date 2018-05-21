
const math = require('mathjs');
const clc = require('cli-color');
const technical = require('technicalindicators');
var SchemaObject = require('node-schema-object');

const mysql = require('promise-mysql');
const moment = require('moment');


var NotEmptyString = {type: String, minLength: 1};
var numberType = {type: Number, default: 0};
var booleanType = {type: Boolean, default: false};
var Chiso = new SchemaObject({
    symbol: NotEmptyString,
    count_buy: numberType,
    count_sell: numberType,
    rate: numberType,
    periodTime: numberType,
    time: {type: Number, default: 1000},
    type: {type: String, default: "5m"},
    pattern: Object,
    candles: {type: Object, invisible: true},
    volume: numberType,
    hs: booleanType,
    ihs: booleanType,
    db: booleanType,
    dt: booleanType,
    tu: booleanType,
    td: booleanType,
    can_buy: booleanType,
    can_sell: booleanType,
    rsi: Number,
    mfi: Number,
    MACD: Object,
    bb: Object
}, {
    methods: {
        setIndicator: async function () {
            var self = this;
            var candles = await self.get_candles();
            // if(self.type == "1h")
            //     console.log(candles);
            var argh = [];
            var argl = [];
            var argv = [];
            var argc = [];
            var argo = [];
            for (var key in candles) {
                argh.push(parseFloat(candles[key]['high']));
                argl.push(parseFloat(candles[key]['low']));
                argv.push(parseFloat(candles[key]['volume']));
                argc.push(parseFloat(candles[key]['close']));
                argo.push(parseFloat(candles[key]['open']));
            }
            // if (argc.length > 250) {
            //     var input = {
            //         values: argc
            //     };
            //     var pattern = await technical.predictPattern(input);
            //     var hs = await technical.hasHeadAndShoulder(input);
            //     var ihs = await technical.hasInverseHeadAndShoulder(input);
            //     var db = await technical.hasDoubleBottom(input);
            //     var dt = await technical.hasDoubleTop(input);
            //     var tu = await technical.isTrendingUp(input);

            //     var td = await technical.isTrendingDown(input);
            //     self.pattern = pattern;
            //     self.hs = hs;
            //     self.ihs = ihs;
            //     self.db = db;
            //     self.dt = dt;
            //     self.tu = tu;
            //     self.td = td;
            // } else {
            //     self.td = true;
            // }
            /*
             * MACD
             */
            var MACD = technical.MACD;
            var input = {
                values: argc,
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
                SimpleMAOscillator: false,
                SimpleMASignal: false
            }
            var array_MACD = MACD.calculate(input);
            self.MACD = array_MACD[array_MACD.length - 1];
            /*
             * RSI
             */
            var rsi = technical.RSI;
            var input = {
                values: argc,
                period: 14
            };
            var array_rsi = rsi.calculate(input);
            self.rsi = array_rsi[array_rsi.length - 1];
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
            self.mfi = array_mfi[array_mfi.length - 1];
            /*
             * BOLLINGER BAND 
             */
            var bb = technical.BollingerBands;
            var input = {
                values: argc,
                period: 20,
                stdDev: 2
            };
            var array_bb = bb.calculate(input);
            self.bb = array_bb[array_bb.length - 1];
            /*
             * Refresh
             */
            self.refresh();

            /*
             * doi chart
             */
            var input = {
                open: argo,
                high: argh,
                low: argl,
                close: argc
            }
            var heikinAshi = technical.HeikinAshi;
            var array_heikinAshi = heikinAshi.calculate(input);
            var array_high = array_heikinAshi['high'];
            var array_low = array_heikinAshi['low'];
            var array_open = array_heikinAshi['open'];
            var array_close = array_heikinAshi['close'];

            var candle1 = {
                high: [array_high.pop()],
                low: [array_low.pop()],
                open: [array_open.pop()],
                close: [array_close.pop()],
            }
            var is_doji = technical.doji(candle1);
            if (is_doji)
                return;
            var is_bullish1 = candle1.close > candle1.open;
            var is_bearish1 = candle1.close < candle1.open;
            if (is_bullish1) {
                self.can_buy = true;
            } else {
                self.can_buy = false;
            }
            if (is_bearish1) {
                self.can_sell = true;
            } else {
                self.can_sell = false;
            }
            // console.log("SET Indicator "+self.type+" DONE! symbol",self.symbol)
        },
        get_candles: async function () {
            var self = this;
            var obj = self.candles;
            var time_current = Math.floor(moment().valueOf() / self.time) * self.time;
            var last_time_final = time_current - self.time;
            if (obj && obj[last_time_final] && obj[last_time_final].isFinal) ///// CANDLES DA HOAN THANH
                return obj;
            else if (obj) { //// LAY TIME TIEP THEO TRONG CANDLES
                if (obj[time_current])
                    delete obj[time_current];
                var keys = Object.keys(obj);
                last_time_final = Math.max(...keys);
                var sql = "SELECT * FROM candles WHERE symbol = '" + self.symbol + "' AND timestamp >= '" + last_time_final + "' ORDER BY timestamp ASC";
                if (self.type != '5m') {
                    sql = "SELECT a.*,b.close,c.open FROM(SELECT symbol,FLOOR(TIMESTAMP / " + self.time + ") * " + self.time + " AS 'timestamp',MIN(is_Final) as is_Final,SUM(`volume`) AS volume,MAX(high) AS high,MIN(low) AS low,MIN(TIMESTAMP) AS 'min_row',MAX(TIMESTAMP) AS 'max_row' FROM`candles` WHERE `symbol` = '" + self.symbol + "' GROUP BY symbol,`timestamp`) AS a JOIN candles AS b ON a.symbol = b.`symbol` AND a.max_row = b.`timestamp` JOIN candles AS c ON a.symbol = c.`symbol` AND a.min_row = c.`timestamp` WHERE a.timestamp >= '" + last_time_final + "' ORDER BY a.timestamp ASC";
                }
            } else { //// LAY LAY TOAN BO CANDLES
                var sql = "SELECT * FROM candles WHERE symbol = '" + self.symbol + "' ORDER BY timestamp ASC";
                if (self.type != '5m') {
                    sql = "SELECT a.*,b.close,c.open FROM(SELECT symbol,FLOOR(TIMESTAMP / " + self.time + ") * " + self.time + " AS 'timestamp',MIN(is_Final) as is_Final,SUM(`volume`) AS volume,MAX(high) AS high,MIN(low) AS low,MIN(TIMESTAMP) AS 'min_row',MAX(TIMESTAMP) AS 'max_row' FROM`candles` WHERE `symbol` = '" + self.symbol + "' GROUP BY symbol,`timestamp`) AS a JOIN candles AS b ON a.symbol = b.`symbol` AND a.max_row = b.`timestamp` JOIN candles AS c ON a.symbol = c.`symbol` AND a.min_row = c.`timestamp` ORDER BY a.timestamp ASC";
                    // console.log(sql)
                }
            }
            return pool.query(sql).then(function (results) {
                for (var row of results) {
                    var time = row['timestamp'];
                    var high = row['high'];
                    var low = row['low'];
                    var close = row['close'];
                    var open = row['open'];
                    var volume = row['volume'];
                    var is_Final = row['is_Final'];
                    self.candles[time] = {
                        high: high,
                        low: low,
                        close: close,
                        open: open,
                        volume: volume,
                        isFinal: is_Final
                    }
                }
                return self.candles;
            });
        },
        refresh: function () {
            var self = this;
            self.count_buy = 0;
            self.count_sell = 0;
        },
        save_db_candles: async function (keys, values) {
            return mysql.createConnection(options_sql).then(function (conn) {
                var result = conn.query("INSERT INTO candles (`" + keys.join("`,`") + "`) VALUES ? ON DUPLICATE KEY UPDATE is_Final = 1,close = VALUES(close),high = VALUES(high),low = VALUES(low),volume = VALUES(volume)", [values]);
                conn.end();
                return result;
            }).catch(function () {
                return false;
            })
        }
    }
});
module.exports = Chiso;