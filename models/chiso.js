
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
    currentquantity:{type:Object,default:{highquantity:{time:0,quantity:0},lowquantity:{time:0,quantity:0}}},
    prevquantity:{type:Object,default:{value:{time:0,quantity:0},highquantity:{time:0,quantity:0},lowquantity:{time:0,quantity:0}}},
    pattern: Object,
    candle: Array,
    hs: booleanType,
    ihs: booleanType,
    db: booleanType,
    dt: booleanType,
    tu: booleanType,
    td: booleanType,
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
        },
        checkhighlow:function(quantity){
            var self = this;
            var time = moment().format("YYYY-MM-DD HH:mm:ss.SSS");
            if(self.currentquantity.highquantity.quantity < quantity){
                self.currentquantity.highquantity = {time:time,quantity:quantity};
            }
            if(self.currentquantity.lowquantity.quantity > quantity){
                self.currentquantity.lowquantity = {time:time,quantity:quantity};
            }
            var timenext = moment(self.prevquantity.value.time);
            // console.log(timenext.add(self.interval,self.type_interval).valueOf());
            // console.log(moment().valueOf());

            if(self.prevquantity.value.time == 0 || timenext.add(self.interval,self.type_interval).valueOf() < moment().valueOf()){
                self.prevquantity = self.currentquantity;
                self.prevquantity.value = {time:time,quantity:quantity};
                self.currentquantity = {highquantity:{time:0,quantity:0},lowquantity:{time:0,quantity:0}};
            }
        },
    }
});
module.exports = Chiso;