// Staff sign-in: we email a 6-digit code, and typing it back proves the person owns the inbox.

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { mailConfigured, sendMail } from "./mail";
import type { SessionKind, SessionUser } from "./session";
import { allowCodeSend } from "./auth";

/** How long a code works. */
const CODE_MINUTES = 10;

/** Wrong guesses allowed per code before it stops working. */
const MAX_ATTEMPTS = 5;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Keyed with AUTH_SECRET, so a leaked database row can't be checked against all 1,000,000 codes.
const hashCode = (email: string, kind: SessionKind, code: string) =>
  createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`${kind}:${email}:${code}`).digest("hex");

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendLoginCode(kind: SessionKind, rawEmail: string): Promise<SendResult> {
  const email = normalizeEmail(rawEmail);
  // Per-minute and daily caps: each code allows 5 guesses, so this bounds guessing to 50 a day.
  const allowed = await allowCodeSend(`code-send:${kind}`, email);
  if (!allowed.ok) return allowed;

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.loginCode.deleteMany({ where: { email, kind } });
  await db.loginCode.create({
    data: { email, kind, codeHash: hashCode(email, kind, code), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000) },
  });

  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") return { ok: false, error: "Email isn't set up yet. Please try again later." };
    console.log(`[sign-in] MAIL_* not set; code for ${email}: ${code}`);
    return { ok: true };
  }

  const what = kind === "admin" ? "Wachira admin" : "Wachira";
  try {
    await sendMail(
      email,
      `${code} is your ${what} sign-in code`,
      `Your sign-in code is ${code}. It works for ${CODE_MINUTES} minutes.\n\nIf you didn't ask for it, you can ignore this email.`,
      `<p>Your sign-in code is</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>` +
        `<p>It works for ${CODE_MINUTES} minutes.</p><p style="color:#666">If you didn't ask for it, you can ignore this email.</p>`,
    );
  } catch (e) {
    console.error("[sign-in] sending the code failed:", e);
    await db.loginCode.deleteMany({ where: { email, kind } });
    return { ok: false, error: "We couldn't send the email. Please try again." };
  }
  return { ok: true };
}

/** Returns who signed in, or null if the code is wrong, used up or expired. */
export async function checkLoginCode(kind: SessionKind, rawEmail: string, rawCode: string): Promise<SessionUser | null> {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  if (code.length !== 6) return null;

  const row = await db.loginCode.findFirst({ where: { email, kind }, orderBy: { createdAt: "desc" } });
  if (!row || row.expiresAt < new Date() || row.attempts >= MAX_ATTEMPTS) return null;
  const claimed = await db.loginCode.updateMany({
    where: { id: row.id, attempts: { lt: MAX_ATTEMPTS }, expiresAt: { gt: new Date() } },
    data: { attempts: { increment: 1 } },
  });
  if (!claimed.count) return null;

  const expected = Buffer.from(row.codeHash, "hex");
  const given = Buffer.from(hashCode(email, kind, code), "hex");
  if (!timingSafeEqual(expected, given)) {
    return null;
  }

  const consumed = await db.loginCode.deleteMany({ where: { id: row.id, expiresAt: { gt: new Date() } } });
  if (!consumed.count) return null;
  // The email is the account: owning the inbox is what proves who someone is.
  return { uid: email, email };
}
