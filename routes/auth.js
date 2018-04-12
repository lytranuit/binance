var express = require('express');
const moment = require('moment');
var passport = require("passport");
var router = express.Router();
/* GET home page. */
router.get('/logout', function (req, res, next) {
	req.logout();
	res.redirect('login');
});
router.post('/login', 
	passport.authenticate('local', { failureRedirect: '/login' }),
	function(req, res) {
		res.redirect('/');
	});
module.exports = router;
