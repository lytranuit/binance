
/******************
 * 
 * CONFIG MAIL
 * 
 *****************/
 const nodemailer = require('nodemailer');
 const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'lytranuit@gmail.com',
        pass: 'vohinhcaAsd123'
    }
});
 const mailOptions = {
    from: 'lytranuit@gmail.com',
    to: 'lytranuit@gmail.com'
};
var sendmail = function (subject, html) {
    mailOptions['subject'] = subject;
    mailOptions['html'] = html;
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}
module.exports.sendmail = sendmail;