"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkLoginCode, sendLoginCode } from "@/lib/login-code";
import { CUSTOMER_COOKIE, CUSTOMER_SESSION_DAYS, createSession, sessionsConfigured } from "@/lib/session";

const emailInput = z.string().trim().email().max(200);

/** Emails a shopper a sign-in code. The first sign-in with an address creates the account. */
export async function sendCustomerCode(email: string): Promise<{ error: string }> {
  if (!sessionsConfigured()) return { error: "Sign-in isn't available right now. Please try again later." };
  if (!emailInput.safeParse(email).success) return { error: "Enter a valid email address." };
  const sent = await sendLoginCode("customer", email);
  return { error: sent.ok ? "" : sent.error };
}

/** Swaps a correct emailed code for a shopper session cookie. */
export async function verifyCustomerCode(email: string, code: string): Promise<{ error: string }> {
  if (!sessionsConfigured()) return { error: "Sign-in isn't available right now. Please try again later." };
  const user = await checkLoginCode("customer", email, code);
  if (!user) return { error: "That code is wrong or has expired. Check it, or send a new one." };

  (await cookies()).set(CUSTOMER_COOKIE, await createSession("customer", user, CUSTOMER_SESSION_DAYS), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CUSTOMER_SESSION_DAYS * 24 * 60 * 60,
  });
  return { error: "" };
}

export async function customerSignOut() {
  (await cookies()).delete(CUSTOMER_COOKIE);
  redirect("/");
}
