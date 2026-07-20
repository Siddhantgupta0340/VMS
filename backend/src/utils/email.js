import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  try {
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      throw new Error("SMTP configuration is missing in the .env file.");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from:
        process.env.EMAIL_FROM ||
        `"VMS" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || "",
      html: options.html || "",
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments || [],
    });

    return info;
  } catch (error) {
    throw error;
  }
};

export default sendEmail;
