import { createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { db } from "./db";
import { mailConfigured, sendMail } from "./mail";
import { allowAuthAttempt } from "./rate-limit";

const deriveKey = promisify(scrypt);

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 60;
/** Codes per address per day. With 5 guesses each, that's at most 50 guesses a day at a 6-digit code. */
export const DAILY_CODE_LIMIT = 10;
const DAY_MS = 24 * 60 * 60_000;
// One code type for both new accounts and password resets: either way, typing the code proves
// the person owns the inbox, and the password they choose alongside it becomes the account password.
const PASSWORD_CODE_KIND = "customer_password";

const emailField = z.string().trim().toLowerCase().email("Enter a valid email address").max(200);

// Only the email at signup: the name and password are chosen after the email is proven, so nobody
// can pre-register someone else's address with a password they know, or a name that then appears
// in the emails sent to them.
export const signupSchema = z.object({
  email: emailField,
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password").max(256),
});

export const setPasswordSchema = z.object({
  email: emailField,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
  password: z.string().min(12, "Password must be at least 12 characters").max(256),
  confirmPassword: z.string(),
  // Asked on the code page when creating an account; absent on password resets.
  name: z.string().trim().min(2, "Enter your full name (at least 2 characters)").max(100).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

/** Hashes a plain password with a random salt using scrypt */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await deriveKey(password, salt, 64) as Buffer).toString("hex");
  return `${salt}:${hash}`;
}

const DUMMY_SALT = "0".repeat(32);

/**
 * Verifies a plain password against the stored salt:hash. Accounts without a password (and missing
 * accounts, passed as "") never match, but still pay for one scrypt run so the reply time doesn't
 * reveal whether the address has a usable account.
 */
export async function verifyPassword(password: string, combined: string): Promise<boolean> {
  try {
    const [salt, hash] = combined.split(":");
    const testHash = (await deriveKey(password, salt && hash ? salt : DUMMY_SALT, 64) as Buffer).toString("hex");
    if (!salt || !hash) return false;
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
  } catch {
    return false;
  }
}

const hashCode = (email: string, code: string) =>
  createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`${PASSWORD_CODE_KIND}:${email}:${code}`).digest("hex");

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Per-minute and per-day limits on how many codes one address can be sent. */
export async function allowCodeSend(scope: string, email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!await allowAuthAttempt(`${scope}:minute`, email, 1, RESEND_SECONDS * 1000)) {
    return { ok: false, error: "A code was just sent. Please wait a minute before requesting another." };
  }
  if (!await allowAuthAttempt(`${scope}:day`, email, DAILY_CODE_LIMIT, DAY_MS)) {
    return { ok: false, error: "Too many codes have been requested for this email today. Please try again tomorrow." };
  }
  return { ok: true };
}

export type CodePurpose = "verify" | "reset";

export const PASSWORD_CODE_SCOPE = "password-code";

/**
 * Emails a 6-digit code that lets the inbox owner set the account password (new account or reset).
 * Pass `name` only for verified accounts: an unverified account's name was typed by whoever signed up.
 */
export async function sendPasswordCode(
  rawEmail: string, purpose: CodePurpose, name?: string,
): Promise<{ ok: boolean; error?: string }> {
  const email = rawEmail.trim().toLowerCase();
  const allowed = await allowCodeSend(PASSWORD_CODE_SCOPE, email);
  if (!allowed.ok) return allowed;
  return issuePasswordCode(email, purpose, name);
}

/** Like sendPasswordCode, for callers that have already applied allowCodeSend(PASSWORD_CODE_SCOPE). */
export async function issuePasswordCode(
  email: string, purpose: CodePurpose, name?: string,
): Promise<{ ok: boolean; error?: string }> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.loginCode.deleteMany({ where: { email, kind: PASSWORD_CODE_KIND } });
  await db.loginCode.create({
    data: {
      email,
      kind: PASSWORD_CODE_KIND,
      codeHash: hashCode(email, code),
      expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000),
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n======================================================`);
    console.log(`[AUTH] ${purpose === "reset" ? "Password reset" : "Verification"} code for ${email}: ${code}`);
    console.log(`======================================================\n`);
  }

  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Email service is temporarily unavailable. Please try again later." };
    }
    return { ok: true };
  }

  const greeting = name ? `Hello ${name},` : "Hello,";
  const intro = purpose === "reset"
    ? "Someone asked to set a new password for your Wachira account. Enter this code to choose your new password:"
    : "Thank you for signing up for Wachira. Enter this code to confirm your email and choose your password:";
  const ignore = purpose === "reset"
    ? "If you didn't ask for this, ignore this email - your password stays the same."
    : "If you didn't create an account, you can safely ignore this email.";
  try {
    await sendMail(
      email,
      `${code} is your Wachira ${purpose === "reset" ? "password reset" : "verification"} code`,
      `${greeting}\n\n${intro}\n\n${code}\n\nThis code will expire in ${CODE_MINUTES} minutes.\n\n${ignore}`,
      `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #142843; margin-top: 0;">${purpose === "reset" ? "Reset your password" : "Welcome to Wachira"}</h2>
        <p>${escapeHtml(greeting)}</p>
        <p>${intro}</p>
        <div style="background: #edf3fc; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #245dcc; font-family: monospace;">${code}</span>
        </div>
        <p style="font-size: 13px; color: #666;">This code is valid for ${CODE_MINUTES} minutes. ${ignore}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Wachira · Clothing made in Kenya</p>
      </div>`
    );
    return { ok: true };
  } catch (e) {
    console.error("[auth] Failed to send password code email:", e);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV FALLBACK] Code for ${email}: ${code}`);
      return { ok: true };
    }
    await db.loginCode.deleteMany({ where: { email, kind: PASSWORD_CODE_KIND } });
    return { ok: false, error: "We couldn't send the email. Please check the address and try again." };
  }
}

/**
 * Checks the emailed code and, if it's right, makes `password` the account password and marks the
 * email verified - in one step, so only someone holding the code can ever activate a password.
 * A new sessionKey signs out every session issued before, and `name` (if given) becomes the account name.
 */
export async function setPasswordWithCode(
  rawEmail: string, rawCode: string, password: string, name?: string,
): Promise<
  { ok: true; user: { id: string; email: string; name: string; sessionKey: string | null } } | { ok: false; error: string }
> {
  const email = rawEmail.trim().toLowerCase();
  const code = rawCode.replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "Please enter the complete 6-digit code." };

  const row = await db.loginCode.findFirst({
    where: { email, kind: PASSWORD_CODE_KIND },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.expiresAt < new Date()) {
    return { ok: false, error: "This code has expired. Please request a new one." };
  }

  const claimed = await db.loginCode.updateMany({
    where: { id: row.id, attempts: { lt: MAX_ATTEMPTS }, expiresAt: { gt: new Date() } },
    data: { attempts: { increment: 1 } },
  });
  if (!claimed.count) {
    return { ok: false, error: "Too many incorrect attempts. Please request a new code." };
  }

  const expected = Buffer.from(row.codeHash, "hex");
  const given = Buffer.from(hashCode(email, code), "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    const remaining = MAX_ATTEMPTS - (row.attempts + 1);
    return {
      ok: false,
      error: remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Too many incorrect attempts. Please request a new code.",
    };
  }

  const passwordHash = await hashPassword(password);
  const user = await db.$transaction(async (tx) => {
    const consumed = await tx.loginCode.deleteMany({ where: { id: row.id, expiresAt: { gt: new Date() } } });
    if (!consumed.count) return null;
    const account = await tx.user.findUnique({ where: { email }, select: { name: true, emailVerified: true } });
    if (!account) return null;
    // An unverified account's stored name came from whoever signed up, so it isn't kept.
    const accountName = name ?? (account.emailVerified ? account.name : "");
    const updated = await tx.user.updateMany({
      where: { email },
      data: { passwordHash, emailVerified: true, name: accountName, sessionKey: randomBytes(16).toString("hex") },
    });
    if (updated.count !== 1) return null;
    return tx.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, sessionKey: true } });
  });
  return user ? { ok: true, user } : { ok: false, error: "This code has already been used or expired." };
}
