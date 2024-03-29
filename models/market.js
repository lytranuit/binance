const math = require("mathjs");
const technical = require("technicalindicators");
const clc = require("cli-color");
const moment = require("moment");
const binance = require("node-binance-api");
var SchemaObject = require("node-schema-object");
const mysql = require("promise-mysql");
var Mail = require("./mail");
var Telegram = require("./telegram");
var NotEmptyString = { type: String, minLength: 1 };
var numberType = { type: Number, default: 0 };
var Market = new SchemaObject(
  {
    MarketName: NotEmptyString,
    last: numberType,
    price_check: numberType,
    primaryCoin: NotEmptyString,
    altCoin: NotEmptyString,
    stopmua: { type: Boolean, default: false },
    periodTime: numberType,
    combined: Object,
    fabonacci: Object,
    indicator_1m: Object,
    indicator_5m: Object,
    indicator_1h: Object,
    trades: { type: Object, default: { bids: [], asks: [] } },
    orderBook: { type: Object, default: { bids: {}, asks: {} } },
    countbuy: { type: Number, default: 5 },
    amountbuy: { type: Number, default: 0.001 },
    minGain: { type: Number, default: 20 },
    maxGain: { type: Number, default: 50 },
    isBuy: { type: Boolean, default: false },
    isCheckMACDBan: { type: Boolean, default: true },
    isCheckRsiBan: { type: Boolean, default: true },
    isHotMarket: { type: Boolean, default: false },
    timeBuyNext: String,
    trade_session: { type: Object, default: { trade_sell: [], trade_buy: [] } },
    priceBuyAvg: numberType,
    priceSellAvg: numberType,
    minPriceSell: numberType,
    maxPriceSell: numberType,
    stopLoss: numberType,
    mocPriceSell: { type: Number, default: 500000 },
    mocPriceBuy: numberType,
    chienLuocMua: { type: String, default: "chienluocMuaHeikin" }, /// chienLuocMuaMoc,chienLuocMuaDay
    chienLuocBan: { type: String, default: "chienluocBanHeikin" }, /// chienLuocBanMoc,chienLuocBanMin
    onOrder: { type: Boolean, default: false },
  },
  {
    methods: {
      checkmua: function (price) {
        var self = this;
        var MarketName = self.MarketName;
        var stopmuaPrimaryCoin = "stopmua" + self.primaryCoin;
        if (stopmua || global[stopmuaPrimaryCoin] || self.stopmua) {
          return;
        }
        if (
          process.env.NODE_ENV == "production" &&
          myBalances[self.primaryCoin].available <= self.amountbuy
        )
          return;
        if (!self.hasDataChiso()) return;

        if (markets["BTCUSDT"]["indicator_5m"]["mfi"] < 35) {
          return;
        }

        if (self.indicator_1h.td || self.indicator_1h.dt) {
          return;
        }
        if (self.countbuy <= 0) {
          return;
        }
        if (
          self.timeBuyNext &&
          moment(self.timeBuyNext).valueOf() > moment().valueOf()
        ) {
          return;
        }
        if (self.onOrder) return;
        if (self.chienLuocMua == "chienLuocMuaDay") {
          if (self.indicator_5m.rsi > 30) {
            return;
          }
          if (self.indicator_5m.bb.lower < price) {
            return;
          }
          self.orderMua(price);
        } else if (self.chienLuocMua == "chienLuocMuaMoc") {
          if (self.isMuaMoc()) self.orderMua(price);
        } else if (self.chienLuocMua == "chienluocMuaHeikin") {
          if (self.indicator_1h.rsi > 40) {
            return;
          }
          if (self.isMuaHeikin()) self.orderMua(price);
        }
      },
      orderMua: function (price) {
        var self = this;
        console.log(clc.green("Order"), self.MarketName + " price:" + price);

        /*
         * VAO LENH
         */
        if (process.env.NODE_ENV == "production") {
          var amount = Math.ceil(self.amountbuy / price);
          self.onOrder = true;
          binance.buy(self.MarketName, amount, price, (error, response) => {
            if (error) {
              self.onOrder = false;
            }
          });

          setTimeout(function () {
            self.onOrder = false;
            binance.cancelOrders(self.MarketName);
          }, 60000);
        } else {
          self.save_db_mua(price, 1);
        }
      },
      orderMuaHotMarket: function () {
        var self = this;
        console.log(
          clc.green("Order Hot"),
          self.MarketName + " price:" + self.last
        );

        self.setOptions({
          minGain: 2,
          chienLuocBan: "chienLuocBanMinTrailingStop",
        });
        if (process.env.NODE_ENV == "production") {
        } else {
          self.save_db_mua(self.last, 1);
        }
      },
      save_db_mua: async function (price, amount, id, time) {
        var self = this;
        var time = time || moment();
        var insert = {
          MarketName: self.MarketName,
          price: price,
          amount: amount,
          id_trade: id,
          timestamp: time.valueOf(),
          isBuyer: 1,
        };
        console.log(insert);
        await mysql.createConnection(options_sql).then(function (conn) {
          var result = conn.query("INSERT INTO trade SET ?", insert);
          conn.end();
          return result;
        });

        self.mua(price, amount, time);
      },
      mua: function (price, amount, time) {
        var self = this;
        console.log(clc.bgGreen("Buy"), self.MarketName + " price:" + price);
        var time = time || moment();
        var timeBuyNext = time;
        var obj = {
          time: time.valueOf(),
          amount: amount,
          price: price,
        };
        self.trade_session.trade_buy.push(obj);
        self.countbuy--;
        self.isBuy = true;
        self.timeBuyNext = timeBuyNext
          .add(1, "h")
          .format("YYYY-MM-DD HH:mm:ss.SSS");
        var trade_buy = self.trade_session.trade_buy;

        var sumcoin = 0;
        var sumamount = 0;
        for (var i in trade_buy) {
          sumcoin +=
            parseFloat(trade_buy[i].amount) * parseFloat(trade_buy[i].price);
          sumamount += parseFloat(trade_buy[i].amount);
        }
        self.priceBuyAvg = parseFloat(sumcoin / sumamount);
        self.minPriceSell =
          parseFloat(self.priceBuyAvg) +
          parseFloat((self.priceBuyAvg * self.minGain) / 100);
        self.stopLoss =
          parseFloat(self.priceBuyAvg) -
          parseFloat((self.priceBuyAvg * self.minGain * 2) / 100);
        io.emit("market_update", { market: self });
      },
      checkban: function (price) {
        var self = this;
        if (self.isBuy && self.priceBuyAvg > 0) {
          var percent = ((price - self.priceBuyAvg) / self.priceBuyAvg) * 100;
          if (percent > 0) {
            var textpercent = clc.green(percent.toFixed(2));
          } else {
            var textpercent = clc.red(percent.toFixed(2));
          }
          // console.log(clc.black.bgWhite(self.MarketName), " price:" + price + " - " + textpercent + "%");
          if (!self.hasDataChiso()) return;
          if (self.onOrder) return;
          /*
           * CHeck chien luoc
           */

          if (self.chienLuocBan == "chienLuocBanMin") {
            if (self.isBanMin() && (self.chienLuocBanRSI() || self.isBanMACD()))
              self.orderBan(price);
          } else if (self.chienLuocBan == "chienLuocBanMoc") {
            if (self.isBanMoc()) self.orderBan(price);
          } else if (self.chienLuocBan == "chienluocBanHeikin") {
            if (self.isBanMin() && self.isBanHeikin()) self.orderBan(price);
          } else if (self.chienLuocBan == "chienLuocBanMinTrailingStop") {
            if (self.isBanMin()) {
              var stopLoss =
                parseFloat(self.last) -
                parseFloat((self.last * self.minGain) / 100);
              if (stopLoss > self.stopLoss) {
                self.stopLoss = stopLoss;
              }
            }
            if (
              self.isStopLoss() ||
              (self.isBanMin() && (self.chienLuocBanRSI() || self.isBanMACD()))
            )
              self.orderBan(price);
          }
        }
      },
      orderBan: function (price) {
        /*
         * VAO LENH
         */
        var self = this;
        console.log(clc.red("Order"), self.MarketName + " price:" + price);
        if (process.env.NODE_ENV == "production") {
          self.onOrder = true;
          binance.sell(
            self.MarketName,
            myBalances[self.altCoin].available,
            price,
            (error, response) => {
              if (error) {
                self.onOrder = false;
                binance.marketSell(
                  self.MarketName,
                  myBalances[self.altCoin].available
                );
              }
            }
          );
          setTimeout(function () {
            self.onOrder = false;
            binance.cancelOrders(self.MarketName);
          }, 60000);
        } else {
          self.save_db_ban(price, 1);
        }
      },
      save_db_ban: async function (price, amount, id, time) {
        var time = time || moment();
        var self = this;
        var insert = {
          MarketName: self.MarketName,
          price: price,
          amount: amount,
          id_trade: id,
          timestamp: time.valueOf(),
          isBuyer: 0,
        };
        await mysql.createConnection(options_sql).then(function (conn) {
          var result = conn.query("INSERT INTO trade SET ?", insert);
          conn.end();
          return result;
        });
        self.ban(price, amount, time);
      },
      ban: function (price, amount, time) {
        var time = time || moment();
        var self = this;
        console.log(clc.bgRed("Sell"), self.MarketName + " price:" + price);
        var obj = {
          time: time.valueOf(),
          amount: amount,
          price: price,
        };
        self.trade_session.trade_sell.push(obj);
        var trade_sell = self.trade_session.trade_sell;
        var sumcoin = 0;
        var sumamount = 0;
        for (var i in trade_sell) {
          sumcoin +=
            parseFloat(trade_sell[i].amount) * parseFloat(trade_sell[i].price);
          sumamount += parseFloat(trade_sell[i].amount);
        }
        self.priceSellAvg = sumcoin / sumamount;
        // if(self.MarketName == "TRIGBTC"){

        //     console.log(self.MarketName);

        //     console.log(self.priceSellAvg);

        //     console.log(sumcoin);

        //     console.log(sumamount);
        //     console.log(self.is_final_session());

        // }
        /*
         * RESET
         */
        var trade_session = self.trade_session;

        var sumamount_buy = 0;
        var array_time = [];
        for (var i in trade_session.trade_buy) {
          sumamount_buy += parseFloat(trade_session.trade_buy[i].amount);
          array_time.push(moment(trade_session.trade_buy[i].time).valueOf());
        }
        var sumamount_sell = 0;
        for (var i in trade_session.trade_sell) {
          sumamount_sell += parseFloat(trade_session.trade_sell[i].amount);
          array_time.push(moment(trade_session.trade_sell[i].time).valueOf());
        }
        // if(self.MarketName == "IOTABTC"){

        //     console.log(self.MarketName);

        //     console.log(sumamount_buy);

        //     console.log(sumamount_sell);
        //     console.log(sumamount_buy == sumamount_sell);
        // }
        if (self.priceBuyAvg > 0 && sumamount_buy <= sumamount_sell) {
          /*
           * SAVE SESSION
           */
          var insert = {
            MarketName: self.MarketName,
            price_buy: self.priceBuyAvg,
            price_sell: self.priceSellAvg,
            amount: sumamount,
            timestamp: time.valueOf(),
          };
          mysql.createConnection(options_sql).then(function (conn) {
            return conn
              .query("INSERT INTO trade_session SET ? ", insert)
              .then(function (data) {
                var id_session = data.insertId;
                var update = {
                  id_session: id_session,
                };
                conn.query(
                  "UPDATE trade SET ? WHERE MarketName = '" +
                    self.MarketName +
                    "' and timestamp IN('" +
                    array_time.join("','") +
                    "')",
                  update
                );
                conn.end();
              });
          });
          self.isBuy = false;
          self.countbuy = 5;
          self.priceBuyAvg = 0;
          self.priceSellAvg = 0;
          self.trade_session = { trade_buy: [], trade_sell: [] };
          io.emit("sellFinal", { symbol: self.MarketName });
        }
      },
      is_final_session: function () {
        var self = this;
        var trade_session = self.trade_session;

        var sumamount_buy = 0;
        for (var i in trade_session.trade_buy) {
          sumamount_buy += parseFloat(trade_session.trade_buy[i].amount);
        }
        var sumamount_sell = 0;
        for (var i in trade_session.trade_sell) {
          sumamount_sell += parseFloat(trade_session.trade_sell[i].amount);
        }
        if (sumamount_buy == sumamount_sell) {
          return true;
        }
        return false;
      },
      isStopLoss: function () {
        var self = this;
        if (self.last > self.stopLoss) return false;
        return true;
      },
      chienLuocBanRSI: function () {
        var self = this;
        /*
         * RSI > 80
         */
        if (!self.isCheckRsiBan || self.indicator_5m.rsi < 80) return false;
        return true;
      },
      isBanMACD: function () {
        var self = this;
        /*
         * MACD < 0
         */
        if (self.isCheckMACDBan && self.indicator_5m.MACD.histogram > 0)
          return false;
        return true;
      },
      isBanMin: function () {
        var self = this;
        /*
         * price < min
         */
        if (self.last < self.minPriceSell) return false;
        return true;
      },
      isBanMoc: function () {
        var self = this;
        /*
         * price < moc
         */
        if (self.last < self.mocPriceSell) return false;
        return true;
      },
      isBanHeikin: function () {
        var self = this;
        if (self.indicator_5m.can_sell && self.indicator_1h.can_sell)
          return true;
        return false;
      },
      isMuaMoc: function () {
        var self = this;
        /*
         * price < moc
         */
        if (self.last > self.mocPriceBuy) return false;
        return true;
      },
      isMuaHeikin: function () {
        var self = this;
        if (self.indicator_5m.can_buy && self.indicator_1h.can_buy) return true;
        return false;
      },
      hasDataChiso: function () {
        var self = this;
        if (
          !self.indicator_1h.rsi ||
          !self.indicator_5m.rsi ||
          !markets["BTCUSDT"]["indicator_5m"].rsi
        )
          return false;
        return true;
      },
      refreshTrade: function () {
        var self = this;
        self.trades = { bids: [], asks: [] };
      },
      refreshOrder: function () {
        var self = this;
        self.orderBook = { bids: {}, asks: {} };
      },
      checkHotMarket: async function () {
        var self = this;
        var change_box = false;
        if (Object.keys(self.fabonacci).length !== 0) {
          var current_box = self.fabonacci.current_box;
          if (current_box == -1) {
            for (var key in self.fabonacci.fabonacci_box) {
              var fabonacci_box = self.fabonacci.fabonacci_box[key];
              if (
                fabonacci_box.min <= self.last &&
                fabonacci_box.max > self.last
              ) {
                self.fabonacci.current_box = parseInt(key);
                break;
              }
            }
          } else if (
            self.fabonacci.fabonacci_box[current_box].min > self.last ||
            self.fabonacci.fabonacci_box[current_box].max <= self.last
          ) {
            change_box = true;
            for (var key in self.fabonacci.fabonacci_box) {
              var fabonacci_box = self.fabonacci.fabonacci_box[key];
              if (
                fabonacci_box.min <= self.last &&
                fabonacci_box.max > self.last
              ) {
                self.fabonacci.current_box = parseInt(key);
                break;
              }
            }
            if (current_box < self.fabonacci.current_box) {
              change_box = 2;
              // console.log(clc.green(self.MarketName) + " change from box " + current_box + " to box " + self.fabonacci.current_box);
            } else {
              change_box = 1;
              // console.log(clc.red(self.MarketName) + " change from box " + current_box + " to box " + self.fabonacci.current_box);
            }
          }
        }
        var candles = await self["indicator_5m"].get_candles();
        // console.log(candles);
        if (self.isHotMarket) return;
        if (change_box == 1) {
          if (
            self.combined.bg_volume_30m == "bg-danger-dark" &&
            self.combined.bg_volume_1h == "bg-danger-dark"
          ) {
            self.isHotMarket = true;
            if (process.env.NODE_ENV == "production") {
              // var percent = self.round(100 * (current_volume - max_volume) / max_volume, 2);
              // var html = "<p>" + self.MarketName + "</p><p>Current Volume:" + current_volume + "</p><p>Max Volume Previous:" + max_volume + "</p><p style='color:green;'>Percent:" + percent + "</p>";
              // Mail.sendmail("[Big Volume]" + self.MarketName, html);
              Telegram.send("[Dump BOX] <b>" + self.MarketName + "</b>");
            } else {
              console.log(clc.red("DUMP BOX"), self.MarketName);
            }
            io.emit("hotMarket", {
              symbol: self.MarketName,
              last: self.last,
              type: 3,
            });
            return;
          }
        }
        if (change_box == 2) {
          if (
            self.combined.bg_volume_30m == "bg-success-dark" &&
            self.combined.bg_volume_1h == "bg-success-dark"
          ) {
            self.isHotMarket = true;
            if (process.env.NODE_ENV == "production") {
              // var percent = self.round(100 * (current_volume - max_volume) / max_volume, 2);
              // var html = "<p>" + self.MarketName + "</p><p>Current Volume:" + current_volume + "</p><p>Max Volume Previous:" + max_volume + "</p><p style='color:green;'>Percent:" + percent + "</p>";
              // Mail.sendmail("[Big Volume]" + self.MarketName, html);
              var current_box = self.fabonacci.current_box;
              var fabonacci_box = self.fabonacci.fabonacci_box[current_box];
              var buy = self.round(fabonacci_box.min, 8);
              var target = self.round(fabonacci_box.max, 8);
              var percent = self.round((100 * (target - buy)) / buy, 2);
              Telegram.send(
                "[PUMP BOX] <b>" +
                  self.MarketName +
                  "</b> \n Price buy:" +
                  buy +
                  " \n Target :" +
                  target +
                  " (<b>" +
                  percent +
                  "%)</b>"
              );
            } else {
              console.log(clc.green("PUMP BOX"), self.MarketName);
            }
            io.emit("hotMarket", {
              symbol: self.MarketName,
              last: self.last,
              type: 3,
            });
            return;
          }
        }
        var entries = Object.values(candles);
        if (entries.length <= 144) return;

        var candle1 = entries[entries.length - 1];
        var candle2 = entries[entries.length - 2];

        var is_volume_large = candle1.volume > candle2.volume * 2;
        var input = {
          close: [candle1.close],
          open: [candle1.open],
          high: [candle1.high],
          low: [candle1.low],
        };

        var is_bullishmarubozu = technical.bullishmarubozu(input);
        var is_price_increase = candle1.close > candle2.high * 1.02;
        if (
          (self.indicator_1m.count_buy > 200 &&
            self.indicator_1m.count_sell > 200 &&
            is_price_increase) ||
          (is_bullishmarubozu && is_volume_large && is_price_increase)
        ) {
          self.isHotMarket = true;
          if (process.env.NODE_ENV == "production") {
            var percent = self.round(
              (100 * (candle1.close - candle2.high)) / candle2.high,
              2
            );
            // var html = "<p>" + self.MarketName + "</p><p>Current Price:" + candle1.close + "</p><p>Check Price:" + candle2.high + "</p><p style='color:green;'>Percent:" + percent + "</p>";
            // Mail.sendmail("[PUMP]" + self.MarketName + " PUMP", html);
            Telegram.send(
              "[PUMP] <b>" +
                self.MarketName +
                "</b> \n Current Price:" +
                candle1.close +
                " \n Check Price:" +
                candle2.high +
                " \n <b>Percent:" +
                percent +
                "</b>"
            );
          } else {
            console.log(clc.green("PUMP"), self.MarketName);
          }
          io.emit("hotMarket", {
            symbol: self.MarketName,
            last: self.last,
            type: 1,
          });
          //self.orderMuaHotMarket();
          self.save_db_hotMarket(0);
          return;
        }

        var is_bearishmarubozu = technical.bearishmarubozu(input);
        var is_price_decrease = candle1.close < candle2.low / 1.05;
        if (
          (self.indicator_1m.count_buy > 200 &&
            self.indicator_1m.count_sell > 200 &&
            is_price_decrease) ||
          (is_bearishmarubozu && is_volume_large && is_price_decrease)
        ) {
          self.isHotMarket = true;
          if (process.env.NODE_ENV == "production") {
            var percent = self.round(
              (100 * (candle1.close - candle2.low)) / candle2.low,
              2
            );
            // var html = "<p>" + self.MarketName + "</p><p>Current Price:" + candle1.close + "</p><p>Check Price:" + candle2.low + "</p><p style='color:red;'>Percent:" + percent + "</p>";
            // Mail.sendmail("[DUMP]" + self.MarketName + " DUMP", html);
            Telegram.send(
              "[DUMP]<b>" +
                self.MarketName +
                "</b> \n Current Price:" +
                candle1.close +
                " \n Check Price:" +
                candle2.low +
                " \n <b>Percent:" +
                percent +
                "</b>"
            );
          } else {
            console.log(clc.red("DUMP"), self.MarketName);
          }
          io.emit("hotMarket", {
            symbol: self.MarketName,
            last: self.last,
            type: 2,
          });
          self.save_db_hotMarket(1);
          return;
        }
        var array_144_candle = entries.splice(-144);
        var array_144_volume = array_144_candle.map(function (item) {
          return item.volume;
        });
        var current_volume = array_144_volume.pop();
        var max_volume = Math.max(...array_144_volume);
        var percent_price = self.round(
          (100 * (candle1.close - candle1.open)) / candle1.open,
          2
        );
        if (
          current_volume > max_volume * 2 &&
          percent_price > 0 &&
          percent_price < 2
        ) {
          self.isHotMarket = true;
          if (process.env.NODE_ENV == "production") {
            var percent = self.round(
              (100 * (current_volume - max_volume)) / max_volume,
              2
            );
            // var html = "<p>" + self.MarketName + "</p><p>Current Volume:" + current_volume + "</p><p>Max Volume Previous:" + max_volume + "</p><p style='color:green;'>Percent:" + percent + "</p>";
            // Mail.sendmail("[Big Volume]" + self.MarketName, html);
            Telegram.send(
              "[Big Volume] <b>" +
                self.MarketName +
                "</b> \n Current Volume:" +
                current_volume +
                " \n Max Volume Previous:" +
                max_volume +
                " \n <b>Percent Volume:" +
                percent +
                "</b> \n <b>Percent price:" +
                percent_price +
                "</b>"
            );
          } else {
            console.log(clc.green("Big Volume"), self.MarketName);
          }
          io.emit("hotMarket", {
            symbol: self.MarketName,
            last: self.last,
            type: 3,
          });
          self.orderMuaHotMarket();
          // self.save_db_hotMarket(0);
          return;
        }
      },
      checkDoji: async function () {
        var self = this;
        var indicator_5m = await self["indicator_5m"];
        var indicator_1h = await self["indicator_1h"];
        if (indicator_5m.is_doji || indicator_1h.is_doji) {
          console.log(clc.green("DOJI "), self.MarketName);
        }
      },
      save_db_hotMarket: function (is_Dump) {
        var self = this;
        var time = moment().valueOf();
        var insert = {
          symbol: self.MarketName,
          timestamp: time,
          price: self.last,
          is_Dump: is_Dump,
        };
        return mysql
          .createConnection(options_sql)
          .then(function (conn) {
            var result = conn.query("INSERT INTO hot_market SET ?", insert);
            conn.end();
            return result;
          })
          .catch(function (error) {
            return false;
          })
          .then(function () {
            return true;
          });
      },
      setOptions: function (obj) {
        var self = this;
        for (var key in obj) {
          var value = obj[key];
          self[key] = value;
        }
      },
      save_db_quantity: function () {
        var self = this;
        var time = moment().valueOf();
        var insert = {
          MarketName: self.MarketName,
          timestamp: time,
          quantity: self.indicator_1h.volume,
          count_buy: self.indicator_1h.count_buy,
          count_sell: self.indicator_1h.count_sell,
          price: self.last,
        };
        return pool
          .query("INSERT INTO event_quantity SET ?", insert)
          .catch(function (error) {
            return false;
          })
          .then(function () {
            return true;
          });
      },
      syncTrade: async function () {
        var self = this;
        var market = self.MarketName;
        var id_trade = await mysql
          .createConnection(options_sql)
          .then(function (conn) {
            var result = conn.query(
              "select id_trade from trade WHERE MarketName = '" +
                market +
                "' ORDER BY timestamp DESC LIMIT 1"
            );
            conn.end();
            return result;
          })
          .then(function (data) {
            if (data && data.length) return data[0].id_trade + 1;
            else return 0;
          });
        // console.log(id_trade);
        // return;
        if (market == "BTCUSDT" || market == "BNBBTC") return;
        binance.trades(
          market,
          async (error, response, symbol) => {
            if (error) {
              console.log(error);
              self.syncTrade();
              return;
            }
            for (var i in response) {
              var trade = response[i];
              var price = trade.price;
              var quantity = trade.qty;
              var id = trade.id;
              var time = moment(trade.time, "x");
              if (trade.isBuyer) {
                await self.save_db_mua(price, quantity, id, time);
              } else {
                await self.save_db_ban(price, quantity, id, time);
              }
            }
          },
          { fromId: id_trade }
        );
      },
      sync_candles: function () {
        if (
          process.env.NODE_ENV != "ANALYTICS" &&
          process.env.NODE_ENV != "production"
        )
          return;
        var self = this;
        var market = self.MarketName;
        pool
          .query(
            "SELECT MAX(TIMESTAMP) AS max_time,MIN(TIMESTAMP) AS min_time,COUNT(1) AS count_row FROM candles WHERE `symbol` = '" +
              market +
              "' AND `interval` ='5m' GROUP BY symbol , `interval`"
          )
          .then(function (result) {
            if (result.length) return result[0];
            else throw "No data";
          })
          .catch(function () {
            return {};
          })
          .then(function (result) {
            var options = { limit: 1000 };
            var time_current = moment().valueOf();
            var last_time =
              Math.floor(time_current / (5 * 60 * 1000)) * (5 * 60 * 1000);
            if (result.max_time) {
              options["startTime"] = result.max_time;
            }
            if (
              last_time <= result.max_time &&
              (result.count_row == 1000 || result.count_row == 1999)
            ) {
              delete options["startTime"];
              options["endTime"] = result.min_time;
            }
            binance.candlesticks(
              market,
              "5m",
              (error, ticks, symbol) => {
                var values = [];
                var keys = [
                  "symbol",
                  "interval",
                  "timestamp",
                  "open",
                  "high",
                  "low",
                  "close",
                  "volume",
                  "is_Final",
                ];
                if (self.isIterable(ticks)) {
                  for (let tick of ticks) {
                    let [
                      time,
                      open,
                      high,
                      low,
                      close,
                      volume,
                      closeTime,
                      assetVolume,
                      trades,
                      buyBaseVolume,
                      buyAssetVolume,
                      ignored,
                    ] = tick;
                    let is_Final =
                      ticks[ticks.length - 1][0] == time &&
                      options["startTime"] > 0
                        ? 0
                        : 1;
                    values.push([
                      symbol,
                      "5m",
                      time,
                      open,
                      high,
                      low,
                      close,
                      volume,
                      is_Final,
                    ]);
                  }
                  if (values.length > 1)
                    self["indicator_5m"]
                      .save_db_candles(keys, values)
                      .then(function () {
                        var periodTime_5m = self["indicator_5m"].periodTime;
                        var periodTime_1h =
                          self["indicator_1h"].periodTime + 5 * 60 * 1000;
                        if (periodTime_5m == periodTime_1h) {
                          self["indicator_1h"].setIndicator();
                        }
                        self["indicator_5m"].setIndicator();
                        // console.log("Save Done! Symbol:",market);
                      });
                }
              },
              options
            );
          });
      },
      isIterable: function (obj) {
        if (obj === null) {
          return false;
        }
        return typeof obj[Symbol.iterator] === "function";
      },
      round: function (value, decimals) {
        return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
      },
    },
  }
);
module.exports = Market;
