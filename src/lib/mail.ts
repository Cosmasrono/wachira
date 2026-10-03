// Sends email through the SMTP server in the MAIL_* settings (e.g. Gmail with an app password).

import nodemailer from "nodemailer";

export const mailConfigured = () => Boolean(process.env.MAIL_HOST && process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD);

let transport: nodemailer.Transporter | undefined;

function mailer() {
  transport ??= nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT ?? 587),
    // "ssl" means TLS from the start (port 465); "tls" upgrades the connection (port 587).
    secure: process.env.MAIL_ENCRYPTION === "ssl",
    auth: { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD },
  });
  return transport;
}

export async function sendMail(to: string, subject: string, text: string, html: string) {
  const from = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME;
  const name = process.env.MAIL_FROM_NAME || "Wachira";
  await mailer().sendMail({ from: { name, address: from! }, to, subject, text, html });
}
