import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { CUSTOMER_COOKIE, readSession, type SessionUser } from "./session";

export type Customer = SessionUser;

/**
 * The signed-in shopper, or null. The session is checked against the account every time, so
 * setting a new password (which changes the account's sessionKey) signs out every older session.
 */
export async function currentCustomer(): Promise<Customer | null> {
  return customerFromSession(await readSession("customer", (await cookies()).get(CUSTOMER_COOKIE)?.value));
}

/** The account behind a signed session, or null if it's gone, unverified, or its password changed since. */
export async function customerFromSession(session: SessionUser | null): Promise<Customer | null> {
  if (!session || !/^[a-f\d]{24}$/i.test(session.uid)) return null;
  const user = await db.user.findUnique({
    where: { id: session.uid },
    select: { id: true, email: true, name: true, emailVerified: true, sessionKey: true },
  });
  if (!user?.emailVerified || (user.sessionKey ?? undefined) !== session.version) return null;
  return { uid: user.id, email: user.email, name: user.name || undefined, version: session.version };
}

/** Sends shoppers who aren't signed in to /login, then back to `next`. */
export async function requireCustomer(next: string) {
  const customer = await currentCustomer();
  if (!customer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return customer;
}

/** True when the order was placed by this shopper (matched the same way as the account page). */
export function ownsOrder(customer: Customer, order: { customerUid: string | null; customerEmail: string | null }) {
  return order.customerUid === customer.uid || (!!order.customerEmail && order.customerEmail === customer.email);
}

const SAME_SITE = "https://same-site.invalid";

/**
 * Only same-site paths, so a crafted link can't send shoppers elsewhere after sign-in. Browsers
 * drop tabs and newlines and treat "\" like "/", so "/\t/evil.com" would mean "//evil.com":
 * the path is resolved the way a browser would and refused unless it stays on this site.
 */
export function safeNext(next: string | undefined) {
  if (!next || !next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next)) return "/shop";
  try {
    const url = new URL(next, SAME_SITE);
    return url.origin === SAME_SITE ? `${url.pathname}${url.search}${url.hash}` : "/shop";
  } catch {
    return "/shop";
  }
}
