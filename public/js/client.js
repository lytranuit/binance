
var socket = io();
socket.on("start", function () {
    socket.emit("join", {room: "market"});
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
    var price_buy = parseFloat($(".price_buy[data-symbol=" + symbol + "]").text());
    var price_check = parseFloat($(".price_check[data-symbol=" + symbol + "]").text());
    var price_prev = parseFloat($(".price_prev[data-symbol=" + symbol + "]").text());
    var volume_prev = parseFloat($(".volume_prev[data-symbol=" + symbol + "]").text());
    var profit = 100 * (last - price_buy) / price_buy;
    var profit_check = 100 * (last - price_check) / price_check;
    var profit_prev = 100 * (last - price_prev) / price_prev;
    var percent_volume = 100 * (volume - volume_prev) / volume_prev;
    
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
    $(".tr_market[data-symbol=" + symbol + "]").attr("data-volume_1m", count_sell + count_buy).attr('data-order', round(profit_check, 2));
})
// socket.on("interval", function (data) {
//     var symbol = data.symbol;
//     var interval = data.interval;
//     var chart = $("#tradingview1[data-interval='" + interval + "'][data-symbol='" + symbol + "']");
//     if (chart.length) {
//         var point = chart.data("iguanaChart").getLastPoint();
//         var time = data.time;
//         var open = data.data.open;
//         var close = data.data.close;
//         var high = data.data.high;
//         var low = data.data.low;
//         var volume = data.data.volume;
//         point.xSeries.LKOH[0] = time;
//         point.vl.LKOH[0] = volume;
//         point.hloc.LKOH[0] = [parseFloat(high), parseFloat(low), parseFloat(open), parseFloat(close)];
//         chart.iguanaChart("addPoint", point);
//     }
//     $(".tr_market[data-symbol=" + symbol + "]").attr("data-volume_" + interval, count_sell + count_buy);
// });
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