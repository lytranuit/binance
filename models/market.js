
const math = require('mathjs');
const technical = require('technicalindicators');
const clc = require('cli-color');
const moment = require('moment');


var SchemaObject = require('node-schema-object');
var NotEmptyString = {type: String, minLength: 1};
var numberType = {type: Number, default: 0};
var Market = new SchemaObject({
    MarketName: NotEmptyString,
    last: numberType,
    bids_q: numberType,
    asks_q: numberType,
    periodTime: numberType,
    available: numberType,
    indicator_1h: Object,
    indicator_5m: Object,
    indicator_1m: Object,
    chienluoc1: Object
});
module.exports = Market;