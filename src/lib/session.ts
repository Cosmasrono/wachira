// Sign-in sessions: a signed cookie the server issues after someone types the code we emailed them.
// No Node-only imports here: the middleware uses this file too.

import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "wachira_admin";

/** Shoppers' own sign-in, kept apart from the staff session. */
export const CUSTOMER_COOKIE = "wachira_customer";

/** How long a shopper stays signed in. */
export const CUSTOMER_SESSION_DAYS = 14;

/** How long a staff member stays signed in. */
export const SESSION_DAYS = 7;

/** Exactly one configured owner may use /admin. Multiple different emails fail closed. */
export function isAdminEmail(email: string | undefined) {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set(allowed).size === 1 && allowed[0] === email.trim().toLowerCase();
}

export type SessionKind = "admin" | "customer";
/** `version` is the account's sessionKey when the session was issued (customers only). */
export type SessionUser = { uid: string; email: string; name?: string; version?: string };

/** Sessions are signed with AUTH_SECRET. Too short a secret would be guessable, so it's refused. */
export const sessionsConfigured = () => (process.env.AUTH_SECRET ?? "").length >= 32;

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET);

export async function createSession(kind: SessionKind, user: SessionUser, days: number) {
  return new SignJWT({ email: user.email, name: user.name, sv: user.version })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.uid)
    .setAudience(kind) // a shopper cookie can never pass as a staff one
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
}

export async function readSession(kind: SessionKind, token: string | undefined): Promise<SessionUser | null> {
  if (!token || !sessionsConfigured()) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], audience: kind });
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      uid: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : undefined,
      version: typeof payload.sv === "string" ? payload.sv : undefined,
    };
  } catch {
    return null;
  }
}
