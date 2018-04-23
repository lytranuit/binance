 $(document).ready(function () {
    $('#tickets').DataTable();
    $('#history').DataTable();
    $('#BTC-markets').DataTable({
        "lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "All"]],
        "iDisplayLength": -1
    });
    $("#refreshOrder").click(function () {
        var symbol = $("#myModal").data("symbol");
        $.ajax({
            url: "/api/refreshorder",
            dataType: "JSON",
            data: {symbol: symbol},
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
            data: {symbol: symbol},
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
        var parents = $("#BTC-markets tbody");
        parents.children(".tr_market").sort(function (a, b) {
            var volumea = parseInt($(a).attr("data-volume_" + interval));
            var volumeb = parseInt($(b).attr("data-volume_" + interval));
            if (volumea == volumeb)
                return 0;
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
            "container_id": "tradingview"
        });
    });
    $(document).off("click",".setting").on('click', ".setting", function (e) {
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
            success: function (data) {
            }
        });
    });
    $("#percent").change(function(){
        calculateBuyValue();
    });
    $("#sell_price").blur(function(){
        calculateSellProfit();
    });
    $("#buy_price").blur(function(){
        calculateBuyValue();
    });
    $("#sell_profit").blur(function(){
        calculateSellPrice();
    });
    $("#BuySellTable .price_last").click(function(){
        var price = $(this).text();
        $("#sell_price").val(price);
        $("#buy_price").val(price);
        calculateSellProfit();
        calculateBuyValue();
    })
    $(document).off("click",".fancybox").on('click', ".fancybox", function (e) {
        e.preventDefault();
        var symbol = $(this).attr("data-symbol");
        var price_buy = $(".price_buy[data-symbol="+symbol+"]").first().text() || "";
                /*
                * RESET
                */
                $("#buy_price").val("");
                $("#sell_price").val("");
                $("#myModal [data-symbol]").attr("data-symbol", symbol).text("");

                $(".price_buy[data-symbol="+symbol+"]").text(price_buy);
                /*
                * Lay my Balances
                */
                getBalances(symbol);

                /*
                * Ve Chart
                */
                $("#myModal").data("symbol", symbol);
                drawChart(symbol, "1h");
            });
    $(".search").keyup(function () {
        var search = $(this).val().toUpperCase();
        var parents = $(this).parents(".card");
        if (search == '') {
            $(".ticket-card", parents).show();
            return
        }
        $(".ticket-card", parents).hide();
        $(".ticket-card", parents).each(function () {
            var text = $(this).text().replace(/\s/ig, "").toUpperCase();
            console.log(text);
            if (text.indexOf(search) != -1) {
                $(this).show();
            }
        })
    });
    $("#buy_coin").click(function(){
        var percent = $("#percent").val();
        var price = $("#buy_price").val();
        var symbol = $("#myModal").data("symbol");
        $.ajax({
            url: "/api/buy",
            data: {symbol: symbol,quantity_per:percent,price:price},
            type: "POST",
            dataType: "JSON",
            success: function (data) {
                if(!data.success){
                    alert(data.error);
                }else{
                    alert("Ok!");
                }
            }
        });
    });
    $("#autobuy_coin").click(function(){
        var percent = $("#percent").val();
        var symbol = $("#myModal").data("symbol");
        $.ajax({
            url: "/api/buymarket",
            data: {symbol: symbol,quantity_per:percent},
            type: "POST",
            dataType: "JSON",
            success: function (data) {
                if(!data.success){
                    alert(data.error);
                }else{
                    alert("Ok!");
                }
            }
        });
    });
    $("#sell_coin").click(function(){
        var percent = $("#percent").val();
        var price = $("#sell_price").val();
        var symbol = $("#myModal").data("symbol");
        $.ajax({
            url: "/api/sell",
            data: {symbol: symbol,quantity_per:percent,price:price},
            type: "POST",
            dataType: "JSON",
            success: function (data) {
                if(!data.success){
                    alert(data.error);
                }else{
                    alert("Ok!");
                }
            }
        });
    });
    $("#autosell_coin").click(function(){
        var percent = $("#percent").val();
        var symbol = $("#myModal").data("symbol");
        $.ajax({
            url: "/api/sellmarket",
            data: {symbol: symbol,quantity_per:percent},
            type: "POST",
            dataType: "JSON",
            success: function (data) {
                if(!data.success){
                    alert(data.error);
                }else{
                    alert("Ok!");
                }
            }
        });
    });
    $("#stopmua").click(function(){
        if($(this).hasClass("badge-danger")){
            $(this).removeClass("badge-danger").addClass("badge-success");
            value = 0;
        }else{
            $(this).addClass("badge-danger").removeClass("badge-success");
            value = 1;
        }
        $.ajax({
            url: "/api/stopmua",
            data: {value: value},
            type: "POST",
            dataType: "JSON",
            success: function (data) {
            }
        });
    })

    $(document).off("click",".stopmuacoin").on('click', ".stopmuacoin", function (e) {
        var coin = $(this).attr("data-coin");
        if($(this).hasClass("badge-danger")){
            $(this).removeClass("badge-danger").addClass("badge-success");
            value = 0;
        }else{
            $(this).addClass("badge-danger").removeClass("badge-success");
            value = 1;
        }
        $.ajax({
            url: "/api/stopmuacoin",
            data: {value: value,coin:coin},
            type: "POST",
            dataType: "JSON",
            success: function (data) {
            }
        });
    })

    $(document).off("click",".stopmuaMaket").on('click', ".stopmuaMaket", function (e) {
        var symbol = $(this).attr("data-symbol");
        if($(this).hasClass("badge-danger")){
            $(this).removeClass("badge-danger").addClass("badge-success");
            value = 0;
        }else{
            $(this).addClass("badge-danger").removeClass("badge-success");
            value = 1;
        }
        $.ajax({
            url: "/api/stopmuamarket",
            data: {value: value,symbol:symbol},
            type: "POST",
            dataType: "JSON",
            success: function (data) {
            }
        });
    })
});