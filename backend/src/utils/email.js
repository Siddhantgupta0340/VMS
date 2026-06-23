import nodemailer from 'nodemailer';

/**
 * Sends an email using Nodemailer.
 * For development, it uses an Ethereal.email test account.
 * For production, it should be configured with a real email service provider.
 *
 * @param {object} options - Email options.
 * @param {string} options.to - Recipient's email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.html - Email body in HTML format.
 */
const sendEmail = async (options) => {
  let transporter;

  // For development, use a test account from Ethereal.
  if (process.env.NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // false for port 587, true for 465
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
  } else {
    // For production, use a real email service (e.g., Gmail, SendGrid).
    // Ensure you have set these environment variables:
    // EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  const info = await transporter.sendMail(options);

  console.log(`[EMAIL] Message sent: ${info.messageId}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[EMAIL] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }
};

export default sendEmail;