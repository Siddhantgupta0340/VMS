import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  console.log("\n================ EMAIL DEBUG =================");

  try {
    console.log("[1] Loading SMTP Configuration...");

    console.log("SMTP_HOST :", process.env.SMTP_HOST);
    console.log("SMTP_PORT :", process.env.SMTP_PORT);
    console.log("SMTP_USER :", process.env.SMTP_USER);
    console.log(
      "SMTP_PASS :",
      process.env.SMTP_PASS ? "Loaded " : "Missing "
    );
    console.log("EMAIL_FROM :", process.env.EMAIL_FROM);

    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      throw new Error("SMTP configuration is missing in the .env file.");
    }

    console.log("\n[2] Creating Gmail SMTP Transport...");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log("[3] Verifying SMTP Connection...");

    await transporter.verify();

    console.log("SMTP Connection Successful");

    console.log("\n[4] Email Details");
    console.log("To      :", options.to);
    console.log("Subject :", options.subject);

    console.log("\n[5] Sending Email...");

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

    console.log("\n========== EMAIL SENT ==========");
    console.log("Message ID :", info.messageId);
    console.log("Accepted :", info.accepted);
    console.log("Rejected :", info.rejected);
    console.log("Response :", info.response);
    console.log("================================\n");

    return info;
  } catch (error) {
    console.error("\n========== EMAIL ERROR ==========");
    console.error("Message :", error.message);
    console.error("Code :", error.code);
    console.error("Response :", error.response);
    console.error("Stack :", error.stack);
    console.error("=================================\n");

    throw error;
  }
};

export default sendEmail;
