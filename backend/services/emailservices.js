const nodemailer = require('nodemailer');
const { email } = require('../config/env');

class emailservice {
  static transporter = nodemailer.createTransporter({
    service: email.service,
    auth: {
      user: email.user,
      pass: email.pass
    }
  });

  static async sendVerificationEmail(to, userId) {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${userId}`;
    
    const mailOptions = {
      from: `"Career Platform" <${email.user}>`,
      to,
      subject: 'Verify Your Email - Career Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to Career Platform!</h2>
          <p>Please verify your email address to complete your registration.</p>
          <a href="${verificationLink}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email
          </a>
          <p>Or copy this link:</p>
          <p>${verificationLink}</p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  static async sendNotification(to, subject, message) {
    const mailOptions = {
      from: `"Career Platform" <${email.user}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Career Platform Notification</h2>
          <p>${message}</p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }
}

module.exports = emailservice;