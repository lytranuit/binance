var express = require('express');
const moment = require('moment');
var router = express.Router();
/* GET home page. */
router.get('/login', function (req, res, next) {
    res.render('login');
});
router.get('/logout', function (req, res, next) {
    res.render('login');
});
router.post('/login', function (req, res, next) {
    res.render('login');
});
module.exports = router;
