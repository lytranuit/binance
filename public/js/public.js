var tzOffsetMoscow = 3600 * 7;
var marketName = [];
function getBalances(symbol) {
    $.ajax({
        url: "/api/marketbalance",
        data: {symbol: symbol},
        dataType: "JSON",
        success: function (data) {
            var dataPrimary = data.primaryCoin;
            var dataAlt = data.altCoin;
            $("#primaryCoin [data-coin]").attr("data-coin", dataPrimary.name);
            $("#altcoin [data-coin]").attr("data-coin", dataAlt.name);
            $("#primaryCoin .name_coin").text(dataPrimary.name);
            $("#altcoin .name_coin").text(dataAlt.name);
            var available = dataPrimary.value ? dataPrimary.value.available : 0;
            var onOrder = dataPrimary.value ? dataPrimary.value.onOrder : 0;
            var value = parseFloat(available) + parseFloat(onOrder);
            $("#primaryCoin .value_coin").text(value);
            var available = dataAlt.value ? dataAlt.value.available : 0;
            var onOrder = dataAlt.value ? dataAlt.value.onOrder : 0;
            var value = parseFloat(available) + parseFloat(onOrder);
            $("#altcoin .value_coin").text(value);
            var isHotMarket = data.isHotMarket;
            if (isHotMarket) {
                $(".hotmarket").addClass("btn-warning")
            } else {
                $(".hotmarket").removeClass("btn-warning")
            }
        }
    });
}
function calculateBuyValue() {
    var buy_price = $("#buy_price").val();
    var percent = $("#percent").val();
    var coin = $("#primaryCoin .value_coin").text();
    var amount = coin * percent / 100;
    var quantity_buy = Math.round(amount / buy_price);
    $("#buy_value").val(quantity_buy);
}
function calculateSellProfit() {
    var price_sell = $("#sell_price").val();
    var price_buy = $("#BuySellTable .price_buy").text();
    var profit = 100 * (parseFloat(price_sell) - parseFloat(price_buy)) / parseFloat(price_buy);
    $("#sell_profit").val(round(profit, 2));
}
function calculateSellPrice() {
    var sell_profit = $("#sell_profit").val();
    var price_buy = $("#BuySellTable .price_buy").text();
    var price_sell = parseFloat(price_buy) + (parseFloat(price_buy) * parseFloat(sell_profit) / 100);
    $("#sell_price").val(round(price_sell, 8));
}
function drawChart(symbol, interval) {
    var interval1 = "D1";
    var sub = 30;
    if (interval == "5m") {
        interval1 = "I5";
        sub = 1;
    } else if (interval == "1h") {
        interval1 = "H1";
        sub = 4;
    } else if (interval == "1d") {
        interval1 = "D1";
        sub = 30;
    }
    $("#tradingview").empty();
    $("#tradingview").append("<div id='tradingview1' data-symbol='" + symbol + "' data-interval='" + interval + "'/>");
    $.ajax({
        url: "/api/candle?interval=" + interval + "&symbol=" + symbol,
        dataType: "JSON",
        success: function (data) {
            var pointFormatter = function () {
                var time = moment(this.x, "x").format("YYYY-MM-DD HH:mm:ss");
                return "<div><p>" + time + "</p>" + this.text + "</div>";
            }
            for (var i in data.events) {
                data.events[i].pointFormatter = pointFormatter;
            }
            $("#tradingview1").on("iguanaChartEvents", function (e, name, data) {
                if (name == "chartDataReady") {
                    $("#tradingview1").data("iguanaChart").TA.BBANDS(1, 1, {TimePeriod: 20});
                }
            }).iguanaChart({
                ticker: "MICEXINDEXCF",
                events: data.events,
                chartOptions: {
                    minHeight: $("#tradingview").height(),
                    futureAmount: 1
                },
                dataSource: {
                    data: data.data,
                    dataSettings: {
                        useHash: false,
                        date_from: moment().subtract(sub, "d").format("DD.MM.YYYY HH:mm:ss"),
                        date_to: moment().format("DD.MM.YYYY HH:mm:ss"),
                        start: moment().subtract(sub, "d").format("DD.MM.YYYY HH:mm:ss"),
                        end: moment().format("DD.MM.YYYY HH:mm:ss"),
                        hash: "",
                        id: "LKOH",
                        interval: interval1
                    }
                }
            }).iguanaChart("setTheme", "Dark");
        }
    });
}
function drawTradingview(symbol, element) {
    $("#" + element).addClass("draw");
    var widget = new TradingView.widget({
        autosize: true,
        "symbol": "BINANCE:" + symbol,
        "interval": "5",
        "timezone": "Asia/Bangkok",
        "theme": "Dark",
        "style": "1",
        "locale": "vi_VN",
        "toolbar_bg": "#f1f3f6",
        "enable_publishing": false,
        "hide_side_toolbar": false,
        "studies": [
            "BB@tv-basicstudies",
            "RSI@tv-basicstudies",
            "MACD@tv-basicstudies"
        ],
        "allow_symbol_change": true,
        "container_id": element
    });
}
function initpopup(symbol) {

    $("#myModal").data("symbol", symbol);
    var price_buy = $(".price_buy[data-symbol=" + symbol + "]").first().text() || "";
    /*
     * RESET
     */
    $("#buy_price").val("");
    $("#sell_price").val("");
    $("#myModal [data-symbol]").attr("data-symbol", symbol).text("");

    $(".price_buy[data-symbol=" + symbol + "]").text(price_buy);
    /*
     * Lay my Balances
     */
    getBalances(symbol);
    /*
     * Ve Chart
     */
    drawTradingview(symbol, "tradingview");
}
function applyForm(form, data) {
    $('input, select, textarea', form).each(function () {
        var type = $(this).attr('type');
        var value = "";
        if (data[$(this).attr('name')])
            value = data[$(this).attr('name')];
        switch (type) {
            case 'checkbox':
                $(this).prop('checked', false);
                if (value == true || value == 'true' || value == 1) {
                    $(this).prop('checked', true);
                }
                break;
            case 'text':
            case 'number':
            case 'email':
            case 'email':
                $(this).val(value);
                break;
            case 'radio':
                $(this).removeAttr('checked', 'checked');
                var rdvalue = $(this).val();
                if (rdvalue == value) {
                    $(this).prop('checked', true);
                }
                break;
            default:
                $(this).val(value);
                break;
        }
    });
}
function thenotification(title, body, tag, icon) {
    var defaulticon = "https://assets.coingecko.com/coins/images/1/large/bitcoin.png";
    icon = icon || defaulticon;
    body = $('<div>' + body + '</div>').text();
    var notification;
    if (Notification && Notification.permission === "granted") {
        var options = {
            body: body,
            tag: tag,
            icon: icon,
            sound: 'alert.mp3'
        }
        notification = new Notification(title, options);
        $("body").append("<audio autoplay><source src='alert.mp3' type='audio/mp3'></audio>");
        //                                    setTimeout(notification.close.bind(notification), 4000);
    } else if (Notification && Notification.permission !== "denied") {
        // Request permission
        Notification.requestPermission(function (status) {

            // Change based on user's decision
            if (Notification.permission !== status) {
                Notification.permission = status;
            }

            // If it's granted show the notification
            if (status === "granted") {
                var options = {
                    body: body,
                    tag: tag,
                    icon: icon,
                    sound: 'alert.mp3'
                }
                notification = new Notification(title, options);
                $("body").append("<audio autoplay><source src='alert.mp3' type='audio/mp3'></audio>");
                //                                            setTimeout(notification.close.bind(notification), 4000);
            } else {
                console.log("This browser does not support system notifications");
            }
        });
    } else {
        console.log("This browser does not support system notifications");
    }
    return notification;
}
function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}
function marketdynamic() {
    $.ajax({
        url: "/api/marketdynamic",
        dataType: "JSON",
        success: function (scatterChartData) {
            $("#scatterChart").html("<canvas></canvas>");
            var scatterChartCanvas = $("#scatterChart canvas").get(0).getContext("2d");
            var scatterChart = new Chart(scatterChartCanvas, {
                type: 'scatter',
                data: scatterChartData,
                options: {
                    animation: false,
                    legend: {
                        position: 'none',
                    },
                    scales: {
                        yAxes: [{
                                scaleLabel: {
                                    display: true,
                                    labelString: '24h Changed',
                                    suffix: '%'
                                },
                                ticks: {
                                    callback: function (value, index, values) {
                                        return value + '%';
                                    }
                                }
                            }], xAxes: [{
                                scaleLabel: {
                                    display: true,
                                    labelString: '7 days Changed'
                                },
                                ticks: {
                                    callback: function (value, index, values) {
                                        return value + '%';
                                    }
                                }
                            }]
                    },
                    tooltips: {
                        callbacks: {
                            label: function (tooltipItem, data) {
                                console.log(data);
                                console.log(tooltipItem);
                                var label = data.datasets[tooltipItem.datasetIndex].label || '';
                                return label;
                            },
                            footer: function (tooltipItem, data) {
                                var price = round(data.datasets[tooltipItem[0].datasetIndex].data[0].price_24h, 8);
                                var label = "24h:" + price + "(" + tooltipItem[0].yLabel + '%)';
                                return label;
                            },
                            afterBody: function (tooltipItem, data) {
                                var price = round(data.datasets[tooltipItem[0].datasetIndex].data[0].price_7day, 8);
                                var label = "7 day: " + price + "(" + tooltipItem[0].xLabel + '%)';
                                return label;
                            },
                        }
                    }
                }
            });
        }
    });
}