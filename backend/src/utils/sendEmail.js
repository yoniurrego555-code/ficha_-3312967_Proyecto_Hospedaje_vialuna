const transporter = require('../config/mailer');

async function sendEmail(to, subject, html) {
  return await transporter.sendMail({
    from: `"Via Luna Hospedaje" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html
  });
}

module.exports = sendEmail;