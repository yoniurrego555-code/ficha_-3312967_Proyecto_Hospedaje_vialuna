const nodemailer = require('nodemailer');


console.log("MAILER DEBUG:");
console.log("SMTP_HOST =", process.env.SMTP_HOST);
console.log("SMTP_PORT =", process.env.SMTP_PORT);
console.log("SMTP_USER =", process.env.SMTP_USER);
console.log("SMTP_PASS loaded?", !!process.env.SMTP_PASS);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false, // Requerido false para puertos 587 según instrucciones
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

module.exports = transporter;
