if(process.env.NODE_ENV === 'production'){
	const chat_id = -313318123;
	const TelegramBot = require('node-telegram-bot-api');
	const token = process.env.tokenTelegram;
	const bot = new TelegramBot(token, {polling: true});
	var send = function(html){
		bot.sendMessage(chat_id, html,{parse_mode : "HTML"});
	}
}else{
	var send = function(html){
		console.log(html);
	}
}
module.exports.send = send;