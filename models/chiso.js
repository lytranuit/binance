
const math = require('mathjs');
const clc = require('cli-color');
const technical = require('technicalindicators');
var SchemaObject = require('node-schema-object');

const moment = require('moment');


var NotEmptyString = {type: String, minLength: 1};
var numberType = {type: Number, default: 0};
var booleanType = {type: Boolean, default: false};
var Chiso = new SchemaObject({
    count_buy: numberType,
    count_sell: numberType,
    rate:numberType,
    periodTime: numberType,
    interval: {type: Number, default: 1},
    type_interval: {type: String, default: "m"},
    pattern: Object,
    candle: Array,
    sumquantity:numberType,
    hs: booleanType,
    ihs: booleanType,
    db: booleanType,
    dt: booleanType,
    tu: booleanType,
    td: booleanType,
    can_buy:booleanType,
    can_sell:booleanType,
    rsi: Number,
    mfi: Number,
    MACD: Object,
    bb: Object
}, {
    methods: {
        setIndicator: async function (results) {
            var self = this;
            var argh = [];
            var argl = [];
            var argv = [];
            var argc = [];
            var argo = [];
            for (var key in results) {
                argh.push(parseFloat(results[key]['high']));
                argl.push(parseFloat(results[key]['low']));
                argv.push(parseFloat(results[key]['volume']));
                argc.push(parseFloat(results[key]['close']));
                argo.push(parseFloat(results[key]['open']));
                
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
                self.pattern = pattern;
                self.hs = hs;
                self.ihs = ihs;
                self.db = db;
                self.dt = dt;
                self.tu = tu;
                self.td = td;
            } else {
                self.td = true;
            }
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
            * doi chart
            */
            var input = {
                open : argo,
                high : argh,
                low : argl,
                close: argc
            }
            var heikinAshi = technical.HeikinAshi;
            var array_heikinAshi = heikinAshi.calculate(input);
            var array_high = array_heikinAshi['high'];
            var array_low = array_heikinAshi['low'];
            var array_open = array_heikinAshi['open'];
            var array_close = array_heikinAshi['close'];
            
            var candle1 = {
                high:[array_high.pop()],
                low:[array_low.pop()],
                open:[array_open.pop()],
                close:[array_close.pop()],
            }
            var is_doji = technical.doji(candle1);
            if(is_doji)
                return;
            var is_bullish1 = candle1.close > candle1.open;
            var is_bearish1 = candle1.close < candle1.open;
            if(is_bullish1){
                self.can_buy = true;
            }else{
                self.can_buy = false;
            }
            if(is_bearish1){
                self.can_sell = true;
            }else{
                self.can_sell = false;
            }
        }
    }
});
module.exports = Chiso;