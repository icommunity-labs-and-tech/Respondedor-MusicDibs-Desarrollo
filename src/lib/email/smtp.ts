import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string; // Message-ID of original email for threading
  references?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
}

function getSmtpConfig(): SmtpConfig {
  return {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT || "465"),
    user: process.env.SMTP_USER!,
    password: process.env.SMTP_PASSWORD!,
    secure: process.env.SMTP_SECURE === "true",
  };
}

/**
 * Sends an email reply via SMTP using nodemailer.
 * Configures proper In-Reply-To and References headers for email threading.
 */
export async function sendEmail(params: SendEmailParams): Promise<{
  messageId: string;
  accepted: string[];
}> {
  const config = getSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
    tls: {
      // Allow self-signed certs for some mail servers
      rejectUnauthorized: false,
    },
  });

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || "Equipo"}" <${config.user}>`,
    to: params.to,
    subject: params.subject.startsWith("Re:")
      ? params.subject
      : `Re: ${params.subject}`,
    text: params.text,
    // HTML version: convert newlines to <br> for better rendering
    html: params.text
      .split("\n")
      .map((line) => `<p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:14px;color:#333;">${line || "&nbsp;"}</p>`)
      .join("\n"),
  };

  // Add threading headers if replying to an existing message
  if (params.inReplyTo) {
    mailOptions.inReplyTo = params.inReplyTo;
    mailOptions.references = params.references || params.inReplyTo;
  }

  const info = await transporter.sendMail(mailOptions);

  return {
    messageId: info.messageId,
    accepted: info.accepted as string[],
  };
}
