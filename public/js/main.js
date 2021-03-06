var scatterChart;
$(document).ready(function () {
    $("#marketdynamic").click(function () {
        marketdynamic();
    });
    $('#history').DataTable();
    $('#tickets').DataTable({
        "lengthMenu": [
            [10, 25, 50, -1],
            [10, 25, 50, "All"]
        ],
        "iDisplayLength": -1
    });
    $('#BTC-market').DataTable({
        "lengthMenu": [
            [10, 25, 50, -1],
            [10, 25, 50, "All"]
        ],
        "iDisplayLength": -1
    });
    $.ajax({
        url: "/api/allmarket",
        dataType: "JSON",
        success: function (data) {
            marketName = data.marketName;
        }
    });

    $("#marketdynamic").trigger("click");
    setInterval(function () {
        $("#marketdynamic").trigger("click");
    }, 60000);
    $("#showhot").click(function () {
        $("#volumn .ticket-card").not(".draw").each(function () {
            $(this).css("height", "300px");
            var symbol = $(this).attr("data-symbol");
            var ele = $(this).attr("id");
            drawTradingview(symbol, ele);
        });
    });
    $("#volumn .ticket-card").dblclick(function () {
        var symbol = $(this).attr("data-symbol");
        $("body").append('<a class="fancybox d-none" data-toggle="modal" data-target="#myModal"  href="" data-symbol="' + symbol + '"></a>')
        $(".fancybox[data-symbol='" + symbol + "']").first().trigger("click");
    });
    $("#refreshcheck").dblclick(function () {
        console.log("1");
        $.ajax({
            url: "/api/refreshcheck",
            dataType: "JSON",
            type: "POST",
            success: function (data) {
                location.reload();
            }
        });
    })
    $(".hotmarket").click(function () {
        var symbol = $(this).attr("data-symbol");
        var value = +!$(this).hasClass("btn-warning");
        var self = $(this);
        $.ajax({
            url: "/api/hotmarket",
            dataType: "JSON",
            type: "POST",
            data: {
                symbol: symbol,
                value: value
            },
            success: function (data) {
                if (value) {
                    self.addClass("btn-warning");
                    var append = "<div class='col-6 ticket-card p-2' style='height: 300px;' id='market" + symbol + "' data-symbol='" + symbol + "'></div>";
                    $("#volumn .row").append(append);
                    var ele = "market" + symbol;
                    drawTradingview(symbol, ele);
                } else {
                    self.removeClass("btn-warning");
                    $("#market" + symbol).remove();
                }
            }
        });
    });
    $("#khunggio").change(function(){
        loadTrade();
    })
    $("#refreshOrder").click(function () {
        var symbol = $("#myModal").data("symbol");
        $.ajax({
            url: "/api/refreshorder",
            dataType: "JSON",
            data: {
                symbol: symbol
            },
            type: "POST",
            success: function (data) {
                $(".bids_q[data-symbol=" + symbol + "]").text(0);
                $(".asks_q[data-symbol=" + symbol + "]").text(0);
                $(".rate_order[data-symbol=" + symbol + "]").text("0%");
            }
        });
    });
    $("#refreshTrade").click(function () {
        var symbol = $("#myModal").data("symbol");
        $.ajax({
            url: "/api/refreshtrade",
            dataType: "JSON",
            data: {
                symbol: symbol
            },
            type: "POST",
            success: function (data) {
                $(".count_sell_l[data-symbol=" + symbol + "]").text(0);
                $(".count_buy_l[data-symbol=" + symbol + "]").text(0);
                $(".q_sell_l[data-symbol=" + symbol + "]").text(0);
                $(".q_buy_l[data-symbol=" + symbol + "]").text(0);
                $(".rate_trades[data-symbol=" + symbol + "]").text("0%");
            }
        });
    });
    $(".order_by_trade").click(function (e) {
        e.preventDefault();
        var interval = $(this).attr("data-interval");
        var parents = $("#BTC-market > tbody");
        parents.children(".tr_market").sort(function (a, b) {
            var volumea = parseFloat($(a).attr("data-volume_" + interval));
            var volumeb = parseFloat($(b).attr("data-volume_" + interval));
            if (volumea == volumeb)
                return 0;
            if (!volumea)
                return 1;
            return volumea < volumeb ? 1 : -1;
        }).appendTo(parents);
    })
    $(".order_by_change").click(function (e) {
        e.preventDefault();
        var parents = $("#BTC-market > tbody");
        parents.children(".tr_market").sort(function (a, b) {
            var volumea = parseFloat($(a).attr("data-order"));
            var volumeb = parseFloat($(b).attr("data-order"));
            if (volumea == volumeb)
                return 0;
            if (!volumea)
                return 1;
            return volumea < volumeb ? 1 : -1;
        }).appendTo(parents);
    })
    $("#interval .btn").click(function (e) {
        var symbol = $("#myModal").data("symbol");
        var interval = $.trim($(this).text());
        drawChart(symbol, interval);
    });
    $("#tradingview-buton").click(function (e) {
        var symbol = $("#myModal").data("symbol");
        $("#tradingview").empty();
        drawTradingview(symbol, "tradingview");
    });
    $(document).off("click", ".setting").on('click', ".setting", function (e) {
        e.preventDefault();
        var symbol = $(this).attr("data-symbol");
        $.ajax({
            url: "/api/market?symbol=" + symbol,
            dataType: "JSON",
            success: function (data) {
                applyForm($("#formSetting"), data);
                console.log(data);
            }
        });
    });
    $("#saveMarket").click(function (e) {
        e.preventDefault();
        var data = $("#formSetting").serialize();
        $.ajax({
            url: "/api/market",
            dataType: "JSON",
            data: data,
            type: "POST",
            success: function (data) {}
        });
    });
    $("#percent").change(function () {
        calculateBuyValue();
    });
    $("#sell_price").blur(function () {
        calculateSellProfit();
    });
    $("#buy_price").blur(function () {
        calculateBuyValue();
    });
    $("#sell_profit").blur(function () {
        calculateSellPrice();
    });
    $("#BuySellTable .price_last").click(function () {
        var price = $(this).text();
        $("#sell_price").val(price);
        $("#buy_price").val(price);
        calculateSellProfit();
        calculateBuyValue();
    })
    $(document).off("click", ".fancybox").on('click', ".fancybox", function (e) {
        e.preventDefault();
        var symbol = $(this).attr("data-symbol");
        initpopup(symbol);
    });
    $(".search").keyup(function () {
        var search = $(this).val().toUpperCase();
        if (search == '') {
            $("#volumn").show();
            $("#allmarket").hide();
            return
        }
        $("#allmarket").show();
        $("#volumn").hide();
        $("#allmarket .row").empty();
        $.each(marketName, function (k, v) {
            var text = v.toUpperCase();
            if (text.indexOf(search) != -1) {
                $("#allmarket .row").append('<a class="fancybox col-4" data-toggle="modal" data-target="#myModal" href="#" data-symbol="' + text + '">' + text + '</a>')
            }
        })
    });
    $("#buy_coin").click(function () {
        var percent = $("#percent").val();
        var price = $("#buy_price").val();
        var symbol = $("#myModal").data("symbol");
        $.ajax({
            url: "/api/buy",
            data: {
                symbol: symbol,
                quantity_per: percent,
                price: price
            },
            type: "POST",
            dataType: "JSON",
            success: function (data) {
                if (!data.success) {
                    alert(data.error);
                } else {
                    alert("Ok!");
                }
            }
        });
    });
    $("#autobuy_coin").click(function () {
        var percent = $("#percent").val();
        var symbol = $("#myModal").data("symbol");
        $.ajax({
            url: "/api/buymarket",
            data: {
                symbol: symbol,
                quantity_per: percent
            },
            type: "POST",
            dataType: "JSON",
            success: function (data) {
                if (!data.success) {
                    alert(data.error);
                } else {
                    alert("Ok!");
                }
            }
        });
    });
    $("#sell_coin").click(function () {
        var percent = $("#percent").val();
        var price = $("#sell_price").val();
        var symbol = $("#myModal").data("symbol");
        $.ajax({
            url: "/api/sell",
            data: {
                symbol: symbol,
                quantity_per: percent,
                price: price
            },
            type: "POST",
            dataType: "JSON",
            success: function (data) {
                if (!data.success) {
                    alert(data.error);
                } else {
                    alert("Ok!");
                }
            }
        });
    });
    $("#autosell_coin").click(function () {
        var percent = $("#percent").val();
        var symbol = $("#myModal").data("symbol");
        $.ajax({
            url: "/api/sellmarket",
            data: {
                symbol: symbol,
                quantity_per: percent
            },
            type: "POST",
            dataType: "JSON",
            success: function (data) {
                if (!data.success) {
                    alert(data.error);
                } else {
                    alert("Ok!");
                }
            }
        });
    });
    $("#stopmua").click(function () {
        if ($(this).hasClass("badge-danger")) {
            $(this).removeClass("badge-danger").addClass("badge-success");
            value = 0;
        } else {
            $(this).addClass("badge-danger").removeClass("badge-success");
            value = 1;
        }
        $.ajax({
            url: "/api/stopmua",
            data: {
                value: value
            },
            type: "POST",
            dataType: "JSON",
            success: function (data) {}
        });
    })
    $(document).off("click", ".stopmuacoin").on('click', ".stopmuacoin", function (e) {
        var coin = $(this).attr("data-coin");
        if ($(this).hasClass("badge-danger")) {
            $(this).removeClass("badge-danger").addClass("badge-success");
            value = 0;
        } else {
            $(this).addClass("badge-danger").removeClass("badge-success");
            value = 1;
        }
        $.ajax({
            url: "/api/stopmuacoin",
            data: {
                value: value,
                coin: coin
            },
            type: "POST",
            dataType: "JSON",
            success: function (data) {}
        });
    })
    $(document).off("click", ".stopmuaMaket").on('click', ".stopmuaMaket", function (e) {
        var symbol = $(this).attr("data-symbol");
        if ($(this).hasClass("badge-danger")) {
            $(this).removeClass("badge-danger").addClass("badge-success");
            value = 0;
        } else {
            $(this).addClass("badge-danger").removeClass("badge-success");
            value = 1;
        }
        $.ajax({
            url: "/api/stopmuamarket",
            data: {
                value: value,
                symbol: symbol
            },
            type: "POST",
            dataType: "JSON",
            success: function (data) {}
        });
    });
    $("#toggle-sidebar").click(function () {
        $(".page-body-wrapper").toggleClass("full-page");
    })
});