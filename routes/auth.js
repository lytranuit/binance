var express = require('express');
const moment = require('moment');
var passport = require("passport");
var router = express.Router();
/* GET home page. */
router.get('/login', function (req, res, next) {
	res.render('login');
});
router.get('/logout', function (req, res, next) {
	req.logout();
	res.render('login');
});
router.post('/login', passport.authenticate('local', {successRedirect: '/', ailureRedirect: '/login'}));
module.exports = router;
