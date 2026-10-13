"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import {
  allowCodeSend,
  issuePasswordCode,
  loginSchema,
  PASSWORD_CODE_SCOPE,
  sendPasswordCode,
  setPasswordSchema,
  setPasswordWithCode,
  signupSchema,
  verifyPassword,
} from "@/lib/auth";
import { safeNext } from "@/lib/customer";
import { db } from "@/lib/db";
import { allowAuthRequest } from "@/lib/auth-throttle";
import {
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_DAYS,
  createSession,
  sessionsConfigured,
} from "@/lib/session";

export type AuthState = {
  error?: string;
  success?: boolean;
  email?: string;
  next?: string;
  needsVerification?: boolean;
};

const emailInput = z.string().trim().toLowerCase().email().max(200);

async function signIn(user: { id: string; email: string; name: string; sessionKey: string | null }) {
  const session = { uid: user.id, email: user.email, name: user.name || undefined, version: user.sessionKey ?? undefined };
  (await cookies()).set(
    CUSTOMER_COOKIE,
    await createSession("customer", session, CUSTOMER_SESSION_DAYS),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CUSTOMER_SESSION_DAYS * 24 * 60 * 60,
    }
  );
}

const codePage = (email: string, next: string, mode: "verify" | "reset") =>
  `/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}${mode === "reset" ? "&mode=reset" : ""}`;

/**
 * Step 1 of signup: the email only. The name and password are chosen on the code page, after the
 * email is proven, so a stranger can never pre-register someone's address with a known password
 * or put their own words into the emails sent to it.
 * The response is the same whether or not the address already has an account.
 */
export async function signupCustomerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!sessionsConfigured()) {
    return { error: "Authentication is temporarily unavailable. Please try again later." };
  }

  const next = safeNext(String(formData.get("next") ?? ""));
  const parsed = signupSchema.safeParse({
    email: String(formData.get("email") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { email } = parsed.data;
  if (!await allowAuthRequest("signup", email, 5)) return { error: "Too many attempts. Please try again in 15 minutes." };

  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    // No usable password until the inbox owner sets one with the emailed code.
    await db.user.create({ data: { name: "", email, passwordHash: "", emailVerified: false } });
  }

  // An existing verified account gets a reset code instead: only the inbox owner can use it.
  const sent = existing?.emailVerified
    ? await sendPasswordCode(email, "reset", existing.name)
    : await sendPasswordCode(email, "verify");
  if (!sent.ok) {
    return { error: sent.error ?? "Failed to send the code. Please try again." };
  }

  redirect(codePage(email, next, "verify"));
}

/** Step 2 (signup or password reset): the emailed code plus the new password. Signs the customer in. */
export async function setPasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!sessionsConfigured()) {
    return { error: "Authentication is temporarily unavailable. Please try again later." };
  }

  const next = safeNext(String(formData.get("next") ?? ""));
  const parsed = setPasswordSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    code: String(formData.get("code") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    name: formData.has("name") ? String(formData.get("name")) : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { email, code, password, name } = parsed.data;
  if (!await allowAuthRequest("set-password", email)) return { error: "Too many attempts. Please try again in 15 minutes." };

  const result = await setPasswordWithCode(email, code, password, name);
  if (!result.ok) return { error: result.error };

  await signIn(result.user);
  redirect(next === "/shop" ? "/account" : next);
}

/**
 * Sends a fresh code for the code page (resend) or the forgot-password page.
 * Always answers the same way, so it can't be used to find out who has an account: the limits are
 * counted before the address is looked up, and the email goes out after the reply is sent.
 */
export async function requestPasswordCodeAction(email: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = emailInput.safeParse(email);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };

  if (!await allowAuthRequest("password-code-request", parsed.data)) {
    return { ok: false, error: "Too many attempts. Please try again in 15 minutes." };
  }
  const allowed = await allowCodeSend(PASSWORD_CODE_SCOPE, parsed.data);
  if (!allowed.ok) return allowed;

  const user = await db.user.findUnique({ where: { email: parsed.data } });
  if (user) {
    after(() => issuePasswordCode(parsed.data, user.emailVerified ? "reset" : "verify", user.emailVerified ? user.name : undefined));
  }
  return { ok: true };
}

/** Forgot-password form: emails a reset code (if the account exists) and opens the code page. */
export async function forgotPasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const next = safeNext(String(formData.get("next") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const sent = await requestPasswordCodeAction(email);
  if (!sent.ok) return { error: sent.error, email };
  redirect(codePage(email, next, "reset"));
}

/** Handles login with email and password */
export async function loginCustomerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!sessionsConfigured()) {
    return { error: "Authentication is temporarily unavailable. Please try again later." };
  }

  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const next = safeNext(String(formData.get("next") ?? ""));

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please enter your email and password." };
  }

  const { email, password } = parsed.data;
  if (!await allowAuthRequest("password-login", email)) return { error: "Too many attempts. Please try again in 15 minutes." };

  const user = await db.user.findUnique({ where: { email } });
  // Checked even when there's no account, so the reply time doesn't reveal which addresses have one.
  if (!await verifyPassword(password, user?.passwordHash ?? "") || !user) {
    return { error: "Invalid email or password. Please try again." };
  }

  if (!user.emailVerified) {
    // Accounts created before passwords were set at verification: confirm the email the new way.
    await sendPasswordCode(user.email, "verify");
    return {
      error: "Please verify your email address before logging in.",
      needsVerification: true,
      email: user.email,
      next,
    };
  }

  await signIn(user);
  redirect(next === "/shop" ? "/account" : next);
}

/** Signs the customer out and redirects to /login */
export async function logoutCustomerAction() {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_COOKIE);
  redirect("/login");
}
