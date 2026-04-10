import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

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

  const bodyHtml = params.text
    .split("\n")
    .map((line) => `<p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:14px;color:#333;">${line || "&nbsp;"}</p>`)
    .join("\n");

  const signature = `
<div style="margin-top:32px;border-top:1px solid #e5e7eb;padding-top:20px;font-family:Verdana,Geneva,sans-serif;">
  <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
    <tr>
      <td style="padding-right:24px;vertical-align:top;">
        <img src="cid:musicdibs-logo" alt="MusicDibs" width="120" style="display:block;margin-bottom:8px;" />
        <p style="margin:0;font-size:9pt;color:#555;font-weight:bold;">The #1 authorship registration platform</p>
      </td>
      <td style="border-left:2px solid #22b8d1;padding-left:20px;vertical-align:top;">
        <p style="margin:0 0 4px 0;font-size:8pt;color:#888;font-weight:bold;letter-spacing:0.05em;">CONTACT</p>
        <p style="margin:0 0 4px 0;font-size:9pt;color:#333;">
          ✉ <a href="mailto:info@musicdibs.com" style="color:#22b8d1;text-decoration:none;">info@musicdibs.com</a>
        </p>
        <p style="margin:0 0 4px 0;font-size:9pt;color:#333;">
          🌐 <a href="https://musicdibs.com" style="color:#22b8d1;text-decoration:none;">musicdibs.com</a>
        </p>
        <p style="margin:0;font-size:9pt;color:#333;">
          📍 C/Valverde 2 (Edif. Telefónica, planta 8), 28004 Madrid, España
        </p>
      </td>
    </tr>
  </table>
  <p style="margin:20px 0 0 0;font-size:7.5pt;color:#aaa;border-top:1px solid #f0f0f0;padding-top:12px;line-height:1.5;">
    This email and the attached material are confidential and are for the exclusive use of the person or entity to which it has been expressly sent. If you are not the legitimate recipient of it, please report it immediately to the sender and delete it. Any review, retransmission, dissemination or any other use of this email by persons or entities other than the legitimate recipient is expressly prohibited.
  </p>
</div>`;

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || "Equipo Musicdibs"}" <${config.user}>`,
    to: params.to,
    subject: params.subject.startsWith("Re:")
      ? params.subject
      : `Re: ${params.subject}`,
    text: params.text + "\n\n--\nMusicDibs | info@musicdibs.com | musicdibs.com\nC/Valverde 2 (Edif. Telefónica, planta 8), 28004 Madrid, España",
    html: bodyHtml + signature,
    attachments: [
      {
        filename: "logo.png",
        path: path.join(process.cwd(), "Diseño", "logo.png"),
        cid: "musicdibs-logo",
        contentDisposition: "inline",
      },
    ],
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
