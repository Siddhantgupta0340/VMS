import nodemailer from "nodemailer";

const cleanEnvStr = (val) => (val ? String(val).trim().replace(/^['"]|['"]$/g, '') : '');

const sendEmail = async (options) => {
  try {
    const host = cleanEnvStr(process.env.SMTP_HOST);
    const port = Number(cleanEnvStr(process.env.SMTP_PORT)) || 587;
    const user = cleanEnvStr(process.env.SMTP_USER);
    const pass = cleanEnvStr(process.env.SMTP_PASS);
    const from = cleanEnvStr(process.env.EMAIL_FROM) || `"VMS" <${user}>`;

    if (!host || !port || !user || !pass) {
      throw new Error("SMTP configuration is missing in the environment variables.");
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from,
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

