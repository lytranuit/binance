
var socket = io();
socket.on("start", function () {
    socket.emit("join", {room: "market"});
    socket.emit("join", {room: "interval"});
});
socket.on("hotMarket", function (data) {
    var symbol = data.symbol;
    var price = data.last;
    var type = data.type;
    var title = symbol + " PUMP";
    if (type == 2) {
        title = symbol + " DUMP";
    }
    var body = "Price : " + price;
    var tag = "hotMarket";
    var noti = thenotification(title, body, tag);
})
socket.on("market", function (data) {
    var symbol = data.symbol;
    var last = data.last;
    var volume = data.volume;
    var orderBook_bids_sum = data.orderBook_bids_sum;
    var orderBook_asks_sum = data.orderBook_asks_sum;
    var count_buy = data.count_buy;
    var count_sell = data.count_sell;
    var trades_bids_sum = data.trades_bids_sum;
    var trades_asks_sum = data.trades_asks_sum;
    var price_buy = parseFloat($(".price_buy[data-symbol=" + symbol + "]").text());
    var price_check = parseFloat($(".price_check[data-symbol=" + symbol + "]").text());
    var price_prev = parseFloat($(".price_prev[data-symbol=" + symbol + "]").text());
    var volume_prev = parseFloat($(".volume_prev[data-symbol=" + symbol + "]").text());
    var profit = 100 * (last - price_buy) / price_buy;
    var profit_check = 100 * (last - price_check) / price_check;
    var profit_prev = 100 * (last - price_prev) / price_prev;
    var percent_volume = 100 * (volume - volume_prev) / volume_prev;
    if (orderBook_asks_sum > orderBook_bids_sum) {
        var rate_order = orderBook_asks_sum / orderBook_bids_sum;
        $(".rate_order[data-symbol=" + symbol + "]").text(round(rate_order, 2) + "%").addClass("badge-danger").removeClass("badge-success");
    } else {
        var rate_order = orderBook_bids_sum / orderBook_asks_sum;
        $(".rate_order[data-symbol=" + symbol + "]").text(round(rate_order, 2) + "%").removeClass("badge-danger").addClass("badge-success");
    }
    if (trades_asks_sum > trades_bids_sum) {
        var rate_trades = trades_asks_sum / trades_bids_sum;
        $(".rate_trades[data-symbol=" + symbol + "]").text(round(rate_trades, 2) + "%").addClass("badge-danger").removeClass("badge-success");
    } else {
        var rate_trades = trades_bids_sum / trades_asks_sum;
        $(".rate_trades[data-symbol=" + symbol + "]").text(round(rate_trades, 2) + "%").removeClass("badge-danger").addClass("badge-success");
    }
    if (profit > 0) {
        $(".profit[data-symbol=" + symbol + "]").removeClass("text-danger").addClass("text-success");
    } else {
        $(".profit[data-symbol=" + symbol + "]").addClass("text-danger").removeClass("text-success");
    }

    if (profit_check > 0) {
        $(".profit_check[data-symbol=" + symbol + "]").removeClass("text-danger").addClass("text-success");
    } else {
        $(".profit_check[data-symbol=" + symbol + "]").addClass("text-danger").removeClass("text-success");
    }

    if (profit_prev > 0) {
        $(".profit_prev[data-symbol=" + symbol + "]").removeClass("bg-danger").addClass("bg-success");
    } else {
        $(".profit_prev[data-symbol=" + symbol + "]").addClass("bg-danger").removeClass("bg-success");
    }
    if (percent_volume > 0) {
        $(".percent_volume[data-symbol=" + symbol + "]").removeClass("bg-danger").addClass("bg-success");
    } else {
        $(".percent_volume[data-symbol=" + symbol + "]").addClass("bg-danger").removeClass("bg-success");
    }

    $(".profit[data-symbol=" + symbol + "]").text("(" + round(profit, 2) + "%)");
    $(".profit_check[data-symbol=" + symbol + "]").text("(" + round(profit_check, 2) + "%)");
    $(".profit_prev[data-symbol=" + symbol + "]").text(round(profit_prev, 2) + "%");
    $(".percent_volume[data-symbol=" + symbol + "]").text(round(percent_volume, 2) + "%");
    $(".price_last[data-symbol=" + symbol + "]").text(last);
    $(".bids_q[data-symbol=" + symbol + "]").text(Math.round(orderBook_bids_sum));
    $(".asks_q[data-symbol=" + symbol + "]").text(Math.round(orderBook_asks_sum));
    $(".count_sell_l[data-symbol=" + symbol + "]").text(count_sell);
    $(".count_buy_l[data-symbol=" + symbol + "]").text(count_buy);
    $(".q_sell_l[data-symbol=" + symbol + "]").text(Math.round(trades_asks_sum));
    $(".q_buy_l[data-symbol=" + symbol + "]").text(Math.round(trades_bids_sum));
    $(".tr_market[data-symbol=" + symbol + "]").attr("data-volume_1m", count_sell + count_buy).attr('data-order', round(profit_check, 2));
})
socket.on("interval", function (data) {
    var symbol = data.symbol;
    var interval = data.interval;
    var chart = $("#tradingview1[data-interval='" + interval + "'][data-symbol='" + symbol + "']");
    if (chart.length) {
        var point = chart.data("iguanaChart").getLastPoint();
        var time = data.time;
        var open = data.data.open;
        var close = data.data.close;
        var high = data.data.high;
        var low = data.data.low;
        var volume = data.data.volume;
        point.xSeries.LKOH[0] = time;
        point.vl.LKOH[0] = volume;
        point.hloc.LKOH[0] = [parseFloat(high), parseFloat(low), parseFloat(open), parseFloat(close)];
        chart.iguanaChart("addPoint", point);
    }
    var count_sell = data.count_sell;
    var count_buy = data.count_buy;
    $(".count_sell[data-symbol=" + symbol + "][data-interval='" + interval + "']").text(count_sell);
    $(".count_buy[data-symbol=" + symbol + "][data-interval='" + interval + "']").text(count_buy);
    $(".tr_market[data-symbol=" + symbol + "]").attr("data-volume_" + interval, count_sell + count_buy);
});
socket.on("coin_update", function (data) {
    var coin = data.coin;
    var amount = parseFloat(data.available) + parseFloat(data.onOrder);
    $(".value_coin[data-coin='" + coin + "']").text(amount);
})
socket.on("market_update", function (data) {
    var market = data.market;
    var symbol = market.MarketName;
    var price_buy = market.priceBuyAvg;
    if ($("#tickets tbody tr[data-symbol='" + symbol + "']").length) {
        $(".price_buy[data-symbol='" + symbol + "']").text(price_buy);
    }
});
socket.on("sellFinal", function (data) {
    var symbol = data.symbol;
    $("#tickets tbody tr[data-symbol='" + symbol + "']").remove()
});