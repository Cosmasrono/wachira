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
const VERIFY_KIND = "customer_verify";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name (at least 2 characters)").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  password: z.string().min(12, "Password must be at least 12 characters").max(256),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  password: z.string().min(1, "Enter your password").max(256),
});

export const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit verification code"),
});

/** Hashes a plain password with a random salt using scrypt */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await deriveKey(password, salt, 64) as Buffer).toString("hex");
  return `${salt}:${hash}`;
}

/** Verifies a plain password against the stored salt:hash */
export async function verifyPassword(password: string, combined: string): Promise<boolean> {
  try {
    const [salt, hash] = combined.split(":");
    if (!salt || !hash) return false;
    const testHash = (await deriveKey(password, salt, 64) as Buffer).toString("hex");
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
  } catch {
    return false;
  }
}

const hashCode = (email: string, code: string) =>
  createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`${VERIFY_KIND}:${email}:${code}`).digest("hex");

/** Generates and sends a 6-digit verification code to the customer's email */
export async function sendVerificationCode(rawEmail: string, name?: string): Promise<{ ok: boolean; error?: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!await allowAuthAttempt("verification-send", email, 1, RESEND_SECONDS * 1000)) {
    return { ok: false, error: "Please wait a minute before requesting another code." };
  }
  
  // Rate-limiting check
  const recent = await db.loginCode.findFirst({
    where: { email, kind: VERIFY_KIND, createdAt: { gt: new Date(Date.now() - RESEND_SECONDS * 1000) } },
  });
  if (recent) {
    return { ok: false, error: "A verification code was just sent. Please wait a minute before requesting another." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.loginCode.deleteMany({ where: { email, kind: VERIFY_KIND } });
  await db.loginCode.create({
    data: {
      email,
      kind: VERIFY_KIND,
      codeHash: hashCode(email, code),
      expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000),
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n======================================================`);
    console.log(`[AUTH] Verification code for ${email}: ${code}`);
    console.log(`======================================================\n`);
  }

  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Email service is temporarily unavailable. Please try again later." };
    }
    return { ok: true };
  }

  const greeting = name ? `Hello ${name},` : "Hello,";
  try {
    await sendMail(
      email,
      `${code} is your Wachira verification code`,
      `${greeting}\n\nThank you for signing up for Wachira. Your email verification code is:\n\n${code}\n\nThis code will expire in ${CODE_MINUTES} minutes.\n\nIf you didn't create an account, you can safely ignore this email.`,
      `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #142843; margin-top: 0;">Welcome to Wachira</h2>
        <p>${greeting.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)}</p>
        <p>Thank you for signing up. Please enter the verification code below to activate your account:</p>
        <div style="background: #edf3fc; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #245dcc; font-family: monospace;">${code}</span>
        </div>
        <p style="font-size: 13px; color: #666;">This code is valid for ${CODE_MINUTES} minutes. If you did not request this, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Wachira · Clothing made in Kenya</p>
      </div>`
    );
    return { ok: true };
  } catch (e) {
    console.error("[auth] Failed to send verification email:", e);
    // If sending fails in dev, log code for convenience
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV FALLBACK] Verification code for ${email}: ${code}`);
      return { ok: true };
    }
    await db.loginCode.deleteMany({ where: { email, kind: VERIFY_KIND } });
    return { ok: false, error: "We couldn't send the verification email. Please check your email and try again." };
  }
}

/** Verifies the 6-digit code and marks the user as emailVerified = true */
export async function verifyEmailCode(rawEmail: string, rawCode: string): Promise<{ ok: boolean; error?: string }> {
  const email = rawEmail.trim().toLowerCase();
  const code = rawCode.replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "Please enter the complete 6-digit code." };

  const row = await db.loginCode.findFirst({
    where: { email, kind: VERIFY_KIND },
    orderBy: { createdAt: "desc" },
  });

  if (!row || row.expiresAt < new Date()) {
    return { ok: false, error: "This verification code has expired. Please request a new one." };
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

  if (!timingSafeEqual(expected, given)) {
    const remaining = MAX_ATTEMPTS - (row.attempts + 1);
    return {
      ok: false,
      error: remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Too many incorrect attempts. Please request a new code.",
    };
  }

  // Successfully verified! Update user in database and delete code
  const verified = await db.$transaction(async (tx) => {
    const consumed = await tx.loginCode.deleteMany({ where: { id: row.id, expiresAt: { gt: new Date() } } });
    if (!consumed.count) return false;
    const updated = await tx.user.updateMany({ where: { email }, data: { emailVerified: true } });
    return updated.count === 1;
  });
  return verified ? { ok: true } : { ok: false, error: "This code has already been used or expired." };
}
