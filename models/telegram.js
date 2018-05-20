
const chat_id = -313318123;
const TelegramBot = require('node-telegram-bot-api');
const token = '606461497:AAH68TUT1mB3adaIxlud48-r-7fi2vADkRU';
const bot = new TelegramBot(token, {polling: true});
var send = function(html){
	bot.sendMessage(chat_id, html,{parse_mode : "HTML"});
}
module.exports.send = send;