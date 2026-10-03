"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  hashPassword,
  loginSchema,
  sendVerificationCode,
  signupSchema,
  verifyEmailCode,
  verifyPassword,
  verifySchema,
} from "@/lib/auth";
import { safeNext } from "@/lib/customer";
import { db } from "@/lib/db";
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

/** Handles user registration, creates pending user, and sends verification code email */
export async function signupCustomerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!sessionsConfigured()) {
    return { error: "Authentication is temporarily unavailable. Please try again later." };
  }

  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
  const next = safeNext(String(formData.get("next") ?? ""));

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { name, email, password } = parsed.data;

  // Check if an account already exists with this email
  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser && existingUser.emailVerified) {
    return {
      error: "An account with this email already exists. Please log in instead.",
    };
  }

  const passwordHash = hashPassword(password);

  if (existingUser && !existingUser.emailVerified) {
    // Update unverified user details
    await db.user.update({
      where: { email },
      data: { name, passwordHash },
    });
  } else {
    // Create new unverified user
    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerified: false,
      },
    });
  }

  // Send the verification code
  const sent = await sendVerificationCode(email, name);
  if (!sent.ok) {
    return { error: sent.error ?? "Failed to send verification code. Please try again." };
  }

  // Redirect to verify-email page
  redirect(`/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}

/** Handles code verification. Once verified, routes to /login */
export async function verifyEmailAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""));

  const parsed = verifySchema.safeParse({ email, code });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter the 6-digit code." };
  }

  const verified = await verifyEmailCode(email, code);
  if (!verified.ok) {
    return { error: verified.error ?? "Failed to verify code. Please try again." };
  }

  // On verify, route to /login with verified query param
  redirect(
    `/login?verified=true&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`
  );
}

/** Resends a verification code to the given email */
export async function resendVerificationAction(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  if (!email) return { ok: false, error: "Email is required." };
  const normalized = email.trim().toLowerCase();

  const user = await db.user.findUnique({ where: { email: normalized } });
  if (!user) {
    return { ok: false, error: "No account found with that email." };
  }
  if (user.emailVerified) {
    return { ok: false, error: "Your email is already verified. Please log in." };
  }

  return sendVerificationCode(normalized, user.name);
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

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password. Please try again." };
  }

  if (!user.emailVerified) {
    // Automatically trigger a fresh verification code so they can verify right away
    await sendVerificationCode(user.email, user.name);
    return {
      error: "Please verify your email address before logging in.",
      needsVerification: true,
      email: user.email,
      next,
    };
  }

  // Create session cookie
  const cookieStore = await cookies();
  cookieStore.set(
    CUSTOMER_COOKIE,
    await createSession(
      "customer",
      { uid: user.id, email: user.email, name: user.name },
      CUSTOMER_SESSION_DAYS
    ),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CUSTOMER_SESSION_DAYS * 24 * 60 * 60,
    }
  );

  redirect(next === "/shop" ? "/account" : next);
}

/** Signs the customer out and redirects to /login */
export async function logoutCustomerAction() {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_COOKIE);
  redirect("/login");
}
