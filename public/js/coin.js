var config = {
    'btc_usd': {
        gia_bat_thuong: 5000,
        num_bat_thuong: 20, ////////// Thông báo (sô lần bất thường)
        interval_bat_thuong: 30, /////////// Thông báo ( Thời gian trong vòng ? phut)
        num_noti_1: 10,
        num_noti_2: 20,
    },
    'ltc_usd': {
        gia_bat_thuong: 2000,
        num_bat_thuong: 20, ////////// Thông báo (sô lần bất thường)
        interval_bat_thuong: 30, /////////// Thông báo ( Thời gian trong vòng ? phut)
        num_noti_1: 10,
        num_noti_2: 20,
    },
    'zec_usd': {
        gia_bat_thuong: 3000,
        num_bat_thuong: 20, ////////// Thông báo (sô lần bất thường)
        interval_bat_thuong: 30, /////////// Thông báo ( Thời gian trong vòng ? phut)
        num_noti_1: 10,
        num_noti_2: 20,
    },
};
var alias = {
    'btc_usd': "BTC",
    'zec_usd': "ZEC",
    'ltc_usd': "LTC"
}
var avg_price = [];
var notification = {};
var db = openDatabase('mydb', '1.0', 'Coin', 2 * 1024 * 1024);
var msg;
var colorHash = new ColorHash({lightness: 0.5});
db.transaction(function (tx) {
    tx.executeSql('CREATE TABLE IF NOT EXISTS LOGS (id unique, title, body, tag, is_noti)');
});

$(document).ready(function () {
    getInfo();
    var timer = setInterval(function () {
        getInfo();
    }, 60000)
});
function getTrade(coin) {
    var urlBtc = "https://wex.nz/api/3/trades/" + coin;
    $.ajax({
        url: urlBtc,
        dataType: "JSON",
        crossDomain: true,
        dataType: 'jsonp',
        success: function (data) {
            var array = [];

            var mua = 0;
            var ban = 0;
            var batthuong = 0;
            var tong_coin_mua = 0;
            var tong_coin_ban = 0;

            var noti_mua_1 = false;
            var noti_mua_2 = false;
            var noti_ban_1 = false;
            var noti_ban_2 = false;
            var noti_bat_thuong = false;
            /*
             * XET Mỗi GIAO DICH
             */
            var count = data[coin].length;
            for (var i = count - 1; i >= 0; i--) {
                var v = data[coin][i];
                var type = v['type'];
                var amount = v['amount'];
                var price = v['price'];
                var tid = v['tid'];
                var tt = amount * price;
                var timestamp = v['timestamp'];
                if (tt > config[coin]['gia_bat_thuong'] && moment.unix(timestamp).add(config[coin]['interval_bat_thuong'], 'minute') > moment()) {
                    batthuong++;
                    if (batthuong > config[coin]['num_bat_thuong'] && !noti_bat_thuong) {
                        noti_bat_thuong = true;
                    }
                }

                if (type == "bid") {
                    mua++;
                    ban = 0;
                    tong_coin_mua += amount;
                    noti_ban_1 = false;
                    noti_ban_2 = false;

                } else {
                    ban++;
                    mua = 0;
                    tong_coin_ban += amount;
                    noti_mua_1 = false;
                    noti_mua_2 = false;
                }

                if (mua > config[coin]['num_noti_1'] && !noti_mua_1) {
                    noti_mua_1 = true;
                    tin_hieu_mua(coin, config[coin]['num_noti_1'], v);
                } else if (mua > config[coin]['num_noti_2'] && !noti_mua_2) {
                    noti_mua_2 = true;
                    tin_hieu_mua(coin, config[coin]['num_noti_2'], v);
                }

                if (ban > config[coin]['num_noti_1'] && !noti_ban_1) {
                    noti_ban_1 = true;
                    tin_hieu_ban(coin, config[coin]['num_noti_1'], v);
                } else if (ban > config[coin]['num_noti_2'] && !noti_ban_2) {
                    noti_ban_2 = true;
                    tin_hieu_ban(coin, config[coin]['num_noti_2'], v);
                }

            }
            if (noti_bat_thuong)
                giaodichbatthuong(coin, v, config[coin]['interval_bat_thuong'], batthuong);

            $('#tickets .ticket-card').sort(function (a, b) {
                var contentA = parseInt($(a).attr('data'));
                var contentB = parseInt($(b).attr('data'));
                return (contentA > contentB) ? -1 : (contentA < contentB) ? 1 : 0;
            }).appendTo("#tickets");
            var chech_lech = tong_coin_mua - tong_coin_ban;
            var color_chech_lech = chech_lech > 0 ? "text-success" : "text-danger";
            var append = "<b>" + alias[coin] + "</b>: " + tong_coin_mua + " | " + tong_coin_ban + "(<b class='" + color_chech_lech + "'>" + chech_lech + "</b>)";
            if (!$("#volumn .volumn-coin[data='" + coin + "']").length) {
                $("#volumn").append("<div class='volumn-coin mt-2' data='" + coin + "' />");
            }
            $("#volumn .volumn-coin[data='" + coin + "']").html(append);
            /*
             * Notification
             */
            db.transaction(function (tx) {
                tx.executeSql('SELECT * FROM LOGS WHERE is_noti = 0', [], function (tx, results) {
                    var len = results.rows.length, i;
                    for (i = 0; i < len; i++) {
                        var val = results.rows[i];
                        var id = val['id'];
                        var title = val['title'];
                        var body = val['body'];
                        var tag = val['tag'];
                        var noti = thenotification(title, body, tag);
                        tx.executeSql('UPDATE LOGS SET is_noti = 1 WHERE id = ' + id);
                    }
                }, null);
            });
            /*
             * TABLE BAT THUONG 
             */
            if ($("#san_ca_map").length) {
                $.each(data[coin], function (k, v) {
                    var type = v['type'];
                    var amount = v['amount'];
                    var price = v['price'];
                    var tid = v['tid'];
                    var tt = amount * price;
                    var timestamp = v['timestamp'];
                    var time = moment.unix(timestamp).fromNow();
//                   var avg_price_coin = avg_price['btc_usd'];
//                var percent = Math.round(price / avg_price_coin * 100);
                    if (tt <= config[coin]['gia_bat_thuong'])
                        return;
                    var append = '<tr>'
                            + '<td>' + tid + '</td>'
                            + '<td>' + coin + '</td>'
                            + '<td><label class="badge ' + (type == "bid" ? "badge-success" : "badge-danger") + '">' + (type == "bid" ? "Mua" : "Bán") + '</label></td>'
                            + '<td>' + price + '</td>'
                            + '<td>' + amount + '</td>'
                            + '<td class="text-success"><i class="mdi mdi-arrow-down"></i></td>'
                            + '<th>' + time + '</th>'
                            + '</tr>';
                    array.push(append);
                });
                $("#san_ca_map tbody").html(array.join(" "));
            }
        }
    })
}
function getInfo() {
    $("#coin .nav-link").each(function () {
        var self = this;
        var coin = $(this).attr("data");
        var urlBtc = "https://wex.nz/api/3/ticker/" + coin;
        $.ajax({
            url: urlBtc,
            dataType: "JSON",
            crossDomain: true,
            dataType: 'jsonp',
            success: function (data) {
                var last = alias[coin] + ": " + data[coin]['last'] + " USD";
                $(self).html(last);
            }
        })
    })


}
function tin_hieu_mua(coin, num, v) {
    var timestamp = v['timestamp'];
    var tid = v['tid'];
    var time = moment.unix(timestamp).fromNow();
    var ticket = $('.ticket-card[data=' + tid + ']');
    var color = colorHash.hex(coin);
    if (ticket.length) {
        $(".noti_badge", ticket).addClass("badge-success").text("Buy");
        $(".noti_tag", ticket).addClass("badge-success").text(coin).css("background", color);
        $(".noti_title", ticket).text("Tín hiệu nhiều hơn " + num + " giao dịch mua liên tiếp ( > " + num + " )");
        $(".noti_description", ticket).html(coin + " đang có nhiều giao dịch mua liên tiếp ->>> <a href='https://wex.nz/exchange/" + coin + "' target='_blank'>Vào mua</a>");
        $(".Last-responded", ticket).text(time);
    } else {
        notification[tid] = false;
        var template = $("#template_noti").clone();
        $(".noti_badge", template).addClass("badge-success").text("Buy");
        $(".noti_tag", template).addClass("badge-success").text(coin).css("background", color);
        $(".noti_title", template).text("Tín hiệu nhiều hơn " + num + " giao dịch mua liên tiếp ( > " + num + " )");
        $(".noti_description", template).html(coin + " đang có nhiều giao dịch mua liên tiếp ->>> <a href='https://wex.nz/exchange/" + coin + "' target='_blank'>Vào mua</a>");
        $(".Last-responded", template).text(time);
        $(".ticket-card", template).attr("data", tid);
        var ticket = $(template).html();
        $("#tickets").prepend(ticket);
    }

    db.transaction(function (tx) {
        tx.executeSql('SELECT * FROM LOGS WHERE id = ' + tid, [], function (tx, results) {
            var len = results.rows.length, i;
            if (len == 0) {
                var title = "Tín hiệu nhiều hơn " + num + " giao dịch mua liên tiếp ( > " + num + " )";
                var body = coin + " đang có nhiều giao dịch mua liên tiếp";
                var tag = coin;
                tx.executeSql('INSERT INTO LOGS (id , title, body, tag, is_noti) VALUES (' + tid + ', "' + title + '", "' + body + '", "' + tag + '",0)');
            }
        }, null);
    });
}
function tin_hieu_ban(coin, num, v) {
    var timestamp = v['timestamp'];
    var tid = v['tid'];
    var time = moment.unix(timestamp).fromNow();
    var ticket = $('.ticket-card[data=' + tid + ']');
    var color = colorHash.hex(coin);
    if (ticket.length) {
        $(".noti_badge", ticket).addClass("badge-danger").text("Bán");
        $(".noti_tag", ticket).addClass("badge-success").text(coin).css("background", color);
        $(".noti_title", ticket).text("Tín hiệu bán nhiều hơn " + num + " giao dịch bán liên tiếp ( > " + num + " )");
        $(".noti_description", ticket).html(coin + " đang có nhiều giao dịch bán liên tiếp ->>> <a href='https://wex.nz/exchange/" + coin + "' target='_blank'>Vào bán</a>");
        $(".Last-responded", ticket).text(time);
    } else {
        var template = $("#template_noti").clone();
        $(".noti_badge", template).addClass("badge-danger").text("Bán");
        $(".noti_tag", template).addClass("badge-success").text(coin).css("background", color);
        $(".noti_title", template).text("Tín hiệu bán nhiều hơn " + num + " giao dịch bán liên tiếp ( > " + num + " )");
        $(".noti_description", template).html(coin + " đang có nhiều giao dịch bán liên tiếp ->>> <a href='https://wex.nz/exchange/" + coin + "' target='_blank'>Vào bán</a>");
        $(".Last-responded", template).text(time);
        $(".ticket-card", template).attr("data", tid);
        var ticket = $(template).html();
        $("#tickets").prepend(ticket);
    }

    db.transaction(function (tx) {
        tx.executeSql('SELECT * FROM LOGS WHERE id = ' + tid, [], function (tx, results) {
            console.log(results)
            var len = results.rows.length, i;
            console.log(len)
            if (len == 0) {
                var title = "Tín hiệu bán nhiều hơn " + num + " giao dịch bán liên tiếp ( > " + num + " )";
                var body = coin + " đang có nhiều giao dịch bán liên tiếp";
                var tag = coin;
                console.log('INSERT INTO LOGS (id , title, body, tag, is_noti) VALUES (' + tid + ', "' + title + '", "' + body + '", "' + tag + '",0)');
                tx.executeSql('INSERT INTO LOGS (id , title, body, tag, is_noti) VALUES (' + tid + ', "' + title + '", "' + body + '", "' + tag + '",0)');
            }
        }, null);
    });
}
function giaodichbatthuong(coin, v, interval, num) {
    var type = v['type'];
    var amount = v['amount'];
    var price = v['price'];
    var tid = v['tid'];
    var tt = amount * price;
    var timestamp = v['timestamp'];
    var time = moment().fromNow();
    var template = $("#template_noti").clone();
    $(".noti_badge", template).addClass("badge-warning").text(coin);
    $(".noti_title", template).text("Giao dịch bất thường");
    $(".noti_description", template).html(coin + " đang có " + num + " giao dịch bất thường trong vòng " + interval + " phút gần đây. Để xem <a href='" + alias[coin].toLowerCase() + ".html'>Click here</a>");
    $(".Last-responded", template).text(time);
    $(".ticket-card", template).addClass("ticket" + tid);
    var html = $(template).html();
    $("#tickets").prepend(html);
    db.transaction(function (tx) {
        tx.executeSql('SELECT * FROM LOGS WHERE id = ' + tid, [], function (tx, results) {
            var len = results.rows.length, i;
            if (len == 0) {
                var title = "Giao dịch bất thường";
                var body = coin + " đang có " + num + " giao dịch bất thường trong vòng " + interval + " phút gần đây.";
                var tag = coin;
                tx.executeSql('INSERT INTO LOGS (id , title, body, tag, is_noti) VALUES (' + tid + ', "' + title + '", "' + body + '", "' + tag + '",0)');
            }
        }, null);
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